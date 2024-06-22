import { Activity } from '@ghostfolio/api/app/order/interfaces/activities.interface';
import { CurrentRateService } from '@ghostfolio/api/app/portfolio/current-rate.service';
import { PortfolioOrder } from '@ghostfolio/api/app/portfolio/interfaces/portfolio-order.interface';
import { TransactionPointSymbol } from '@ghostfolio/api/app/portfolio/interfaces/transaction-point-symbol.interface';
import { TransactionPoint } from '@ghostfolio/api/app/portfolio/interfaces/transaction-point.interface';
import { RedisCacheService } from '@ghostfolio/api/app/redis-cache/redis-cache.service';
import {
  getFactor,
  getInterval
} from '@ghostfolio/api/helper/portfolio.helper';
import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';
import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.service';
import { IDataGatheringItem } from '@ghostfolio/api/services/interfaces/interfaces';
import { MAX_CHART_ITEMS } from '@ghostfolio/common/config';
import {
  DATE_FORMAT,
  getSum,
  parseDate,
  resetHours
} from '@ghostfolio/common/helper';
import {
  DataProviderInfo,
  HistoricalDataItem,
  InvestmentItem,
  ResponseError,
  SymbolMetrics,
  UniqueAsset
} from '@ghostfolio/common/interfaces';
import { PortfolioSnapshot, TimelinePosition } from '@ghostfolio/common/models';
import { DateRange, GroupBy } from '@ghostfolio/common/types';

import { Logger } from '@nestjs/common';
import { Big } from 'big.js';
import { plainToClass } from 'class-transformer';
import {
  differenceInDays,
  eachDayOfInterval,
  endOfDay,
  format,
  isAfter,
  isBefore,
  isSameDay,
  max,
  min,
  subDays
} from 'date-fns';
import { first, last, sum, uniq, uniqBy } from 'lodash';

export abstract class PortfolioCalculator {
  protected static readonly ENABLE_LOGGING = false;

  protected accountBalanceItems: HistoricalDataItem[];
  protected activities: PortfolioOrder[];

  private configurationService: ConfigurationService;
  private currency: string;
  private currentRateService: CurrentRateService;
  private dataProviderInfos: DataProviderInfo[];
  private dateRange: DateRange;
  private endDate: Date;
  private exchangeRateDataService: ExchangeRateDataService;
  private redisCacheService: RedisCacheService;
  private snapshot: PortfolioSnapshot;
  private snapshotPromise: Promise<void>;
  private startDate: Date;
  private transactionPoints: TransactionPoint[];
  private useCache: boolean;
  private userId: string;

  public constructor({
    accountBalanceItems,
    activities,
    configurationService,
    currency,
    currentRateService,
    dateRange,
    exchangeRateDataService,
    redisCacheService,
    useCache,
    userId
  }: {
    accountBalanceItems: HistoricalDataItem[];
    activities: Activity[];
    configurationService: ConfigurationService;
    currency: string;
    currentRateService: CurrentRateService;
    dateRange: DateRange;
    exchangeRateDataService: ExchangeRateDataService;
    redisCacheService: RedisCacheService;
    useCache: boolean;
    userId: string;
  }) {
    console.time('--- PortfolioCalculator.constructor - 1');

    this.accountBalanceItems = accountBalanceItems;
    this.configurationService = configurationService;
    this.currency = currency;
    this.currentRateService = currentRateService;
    this.dateRange = dateRange;
    this.exchangeRateDataService = exchangeRateDataService;

    let dateOfFirstActivity = new Date();

    this.activities = activities
      .map(
        ({
          date,
          fee,
          quantity,
          SymbolProfile,
          tags = [],
          type,
          unitPrice
        }) => {
          if (isBefore(date, dateOfFirstActivity)) {
            dateOfFirstActivity = date;
          }

          if (isAfter(date, new Date(Date.now()))) {
            // Adapt date to today if activity is in future (e.g. liability)
            // to include it in the interval
            date = endOfDay(new Date(Date.now()));
          }

          return {
            SymbolProfile,
            tags,
            type,
            date: format(date, DATE_FORMAT),
            fee: new Big(fee),
            quantity: new Big(quantity),
            unitPrice: new Big(unitPrice)
          };
        }
      )
      .sort((a, b) => {
        return a.date?.localeCompare(b.date);
      });

    this.redisCacheService = redisCacheService;
    this.useCache = false; // TODO: useCache
    this.userId = userId;

    const { endDate, startDate } = getInterval(
      'max',
      subDays(dateOfFirstActivity, 1)
    );

    this.endDate = endDate;
    this.startDate = startDate;

    console.timeEnd('--- PortfolioCalculator.constructor - 1');
    console.time('--- PortfolioCalculator.constructor - 2');

    this.computeTransactionPoints();

    console.timeEnd('--- PortfolioCalculator.constructor - 2');

    console.time('--- PortfolioCalculator.constructor - 3');
    this.snapshotPromise = this.initialize();
    console.timeEnd('--- PortfolioCalculator.constructor - 3');
  }

  protected abstract calculateOverallPerformance(
    positions: TimelinePosition[]
  ): PortfolioSnapshot;

  public async computeSnapshot(
    start: Date,
    end?: Date
  ): Promise<PortfolioSnapshot> {
    const lastTransactionPoint = last(this.transactionPoints);

    let endDate = end;

    if (!endDate) {
      endDate = new Date(Date.now());

      if (lastTransactionPoint) {
        endDate = max([endDate, parseDate(lastTransactionPoint.date)]);
      }
    }

    const transactionPoints = this.transactionPoints?.filter(({ date }) => {
      return isBefore(parseDate(date), endDate);
    });

    if (!transactionPoints.length) {
      return {
        chartData: [],
        currentValueInBaseCurrency: new Big(0),
        grossPerformance: new Big(0),
        grossPerformancePercentage: new Big(0),
        grossPerformancePercentageWithCurrencyEffect: new Big(0),
        grossPerformanceWithCurrencyEffect: new Big(0),
        hasErrors: false,
        netPerformance: new Big(0),
        netPerformancePercentage: new Big(0),
        netPerformancePercentageWithCurrencyEffect: new Big(0),
        netPerformanceWithCurrencyEffect: new Big(0),
        positions: [],
        totalFeesWithCurrencyEffect: new Big(0),
        totalInterestWithCurrencyEffect: new Big(0),
        totalInvestment: new Big(0),
        totalInvestmentWithCurrencyEffect: new Big(0),
        totalLiabilitiesWithCurrencyEffect: new Big(0),
        totalValuablesWithCurrencyEffect: new Big(0)
      };
    }

    const currencies: { [symbol: string]: string } = {};
    const dataGatheringItems: IDataGatheringItem[] = [];
    let dates: Date[] = [];
    let firstIndex = transactionPoints.length;
    let firstTransactionPoint: TransactionPoint = null;
    let totalInterestWithCurrencyEffect = new Big(0);
    let totalLiabilitiesWithCurrencyEffect = new Big(0);
    let totalValuablesWithCurrencyEffect = new Big(0);

    dates.push(resetHours(start));

    for (const { currency, dataSource, symbol } of transactionPoints[
      firstIndex - 1
    ].items) {
      dataGatheringItems.push({
        dataSource,
        symbol
      });

      currencies[symbol] = currency;
    }

    for (let i = 0; i < transactionPoints.length; i++) {
      if (
        !isBefore(parseDate(transactionPoints[i].date), start) &&
        firstTransactionPoint === null
      ) {
        firstTransactionPoint = transactionPoints[i];
        firstIndex = i;
      }

      if (firstTransactionPoint !== null) {
        dates.push(resetHours(parseDate(transactionPoints[i].date)));
      }
    }

    dates.push(resetHours(endDate));

    // Add dates of last week for fallback
    dates.push(subDays(resetHours(new Date()), 7));
    dates.push(subDays(resetHours(new Date()), 6));
    dates.push(subDays(resetHours(new Date()), 5));
    dates.push(subDays(resetHours(new Date()), 4));
    dates.push(subDays(resetHours(new Date()), 3));
    dates.push(subDays(resetHours(new Date()), 2));
    dates.push(subDays(resetHours(new Date()), 1));
    dates.push(resetHours(new Date()));

    dates = uniq(
      dates.map((date) => {
        return date.getTime();
      })
    )
      .map((timestamp) => {
        return new Date(timestamp);
      })
      .sort((a, b) => {
        return a.getTime() - b.getTime();
      });

    let exchangeRatesByCurrency =
      await this.exchangeRateDataService.getExchangeRatesByCurrency({
        currencies: uniq(Object.values(currencies)),
        endDate: endOfDay(endDate),
        startDate: this.getStartDate(),
        targetCurrency: this.currency
      });

    const {
      dataProviderInfos,
      errors: currentRateErrors,
      values: marketSymbols
    } = await this.currentRateService.getValues({
      dataGatheringItems,
      dateQuery: {
        gte: parseDate(firstTransactionPoint?.date),
        lt: end
      }
    });

    this.dataProviderInfos = dataProviderInfos;

    const marketSymbolMap: {
      [date: string]: { [symbol: string]: Big };
    } = {};

    for (const marketSymbol of marketSymbols) {
      const date = format(marketSymbol.date, DATE_FORMAT);

      if (!marketSymbolMap[date]) {
        marketSymbolMap[date] = {};
      }

      if (marketSymbol.marketPrice) {
        marketSymbolMap[date][marketSymbol.symbol] = new Big(
          marketSymbol.marketPrice
        );
      }
    }

    const endDateString = format(endDate, DATE_FORMAT);

    const chartStartDate = this.getStartDate();
    const daysInMarket = differenceInDays(endDate, chartStartDate) + 1;

    const step = false /*withDataDecimation*/
      ? Math.round(daysInMarket / Math.min(daysInMarket, MAX_CHART_ITEMS))
      : 1;

    let chartDates = eachDayOfInterval(
      { start: chartStartDate, end },
      { step }
    ).map((date) => {
      return resetHours(date);
    });

    const includesEndDate = isSameDay(last(chartDates), end);

    if (!includesEndDate) {
      chartDates.push(resetHours(end));
    }

    if (firstIndex > 0) {
      firstIndex--;
    }

    const positions: TimelinePosition[] = [];
    let hasAnySymbolMetricsErrors = false;

    const errors: ResponseError['errors'] = [];

    const accumulatedValuesByDate: {
      [date: string]: {
        investmentValueWithCurrencyEffect: Big;
        totalCurrentValue: Big;
        totalCurrentValueWithCurrencyEffect: Big;
        totalInvestmentValue: Big;
        totalInvestmentValueWithCurrencyEffect: Big;
        totalNetPerformanceValue: Big;
        totalNetPerformanceValueWithCurrencyEffect: Big;
        totalTimeWeightedInvestmentValue: Big;
        totalTimeWeightedInvestmentValueWithCurrencyEffect: Big;
      };
    } = {};

    const valuesBySymbol: {
      [symbol: string]: {
        currentValues: { [date: string]: Big };
        currentValuesWithCurrencyEffect: { [date: string]: Big };
        investmentValuesAccumulated: { [date: string]: Big };
        investmentValuesAccumulatedWithCurrencyEffect: { [date: string]: Big };
        investmentValuesWithCurrencyEffect: { [date: string]: Big };
        netPerformanceValues: { [date: string]: Big };
        netPerformanceValuesWithCurrencyEffect: { [date: string]: Big };
        timeWeightedInvestmentValues: { [date: string]: Big };
        timeWeightedInvestmentValuesWithCurrencyEffect: { [date: string]: Big };
      };
    } = {};

    for (const item of lastTransactionPoint.items) {
      const marketPriceInBaseCurrency = (
        marketSymbolMap[endDateString]?.[item.symbol] ?? item.averagePrice
      ).mul(
        exchangeRatesByCurrency[`${item.currency}${this.currency}`]?.[
          endDateString
        ]
      );

      const {
        currentValues,
        currentValuesWithCurrencyEffect,
        grossPerformance,
        grossPerformancePercentage,
        grossPerformancePercentageWithCurrencyEffect,
        grossPerformanceWithCurrencyEffect,
        hasErrors,
        investmentValuesAccumulated,
        investmentValuesAccumulatedWithCurrencyEffect,
        investmentValuesWithCurrencyEffect,
        netPerformance,
        netPerformancePercentage,
        netPerformancePercentageWithCurrencyEffect,
        netPerformanceValues,
        netPerformanceValuesWithCurrencyEffect,
        netPerformanceWithCurrencyEffect,
        timeWeightedInvestment,
        timeWeightedInvestmentValues,
        timeWeightedInvestmentValuesWithCurrencyEffect,
        timeWeightedInvestmentWithCurrencyEffect,
        totalDividend,
        totalDividendInBaseCurrency,
        totalInterestInBaseCurrency,
        totalInvestment,
        totalInvestmentWithCurrencyEffect,
        totalLiabilitiesInBaseCurrency,
        totalValuablesInBaseCurrency
      } = this.getSymbolMetrics({
        marketSymbolMap,
        start,
        step,
        dataSource: item.dataSource,
        end: endDate,
        exchangeRates:
          exchangeRatesByCurrency[`${item.currency}${this.currency}`],
        isChartMode: true,
        symbol: item.symbol
      });

      hasAnySymbolMetricsErrors = hasAnySymbolMetricsErrors || hasErrors;

      valuesBySymbol[item.symbol] = {
        currentValues,
        currentValuesWithCurrencyEffect,
        investmentValuesAccumulated,
        investmentValuesAccumulatedWithCurrencyEffect,
        investmentValuesWithCurrencyEffect,
        netPerformanceValues,
        netPerformanceValuesWithCurrencyEffect,
        timeWeightedInvestmentValues,
        timeWeightedInvestmentValuesWithCurrencyEffect
      };

      positions.push({
        dividend: totalDividend,
        dividendInBaseCurrency: totalDividendInBaseCurrency,
        timeWeightedInvestment,
        timeWeightedInvestmentWithCurrencyEffect,
        averagePrice: item.averagePrice,
        currency: item.currency,
        dataSource: item.dataSource,
        fee: item.fee,
        firstBuyDate: item.firstBuyDate,
        grossPerformance: !hasErrors ? grossPerformance ?? null : null,
        grossPerformancePercentage: !hasErrors
          ? grossPerformancePercentage ?? null
          : null,
        grossPerformancePercentageWithCurrencyEffect: !hasErrors
          ? grossPerformancePercentageWithCurrencyEffect ?? null
          : null,
        grossPerformanceWithCurrencyEffect: !hasErrors
          ? grossPerformanceWithCurrencyEffect ?? null
          : null,
        investment: totalInvestment,
        investmentWithCurrencyEffect: totalInvestmentWithCurrencyEffect,
        marketPrice:
          marketSymbolMap[endDateString]?.[item.symbol]?.toNumber() ?? null,
        marketPriceInBaseCurrency:
          marketPriceInBaseCurrency?.toNumber() ?? null,
        netPerformance: !hasErrors ? netPerformance ?? null : null,
        netPerformancePercentage: !hasErrors
          ? netPerformancePercentage ?? null
          : null,
        netPerformancePercentageWithCurrencyEffect: !hasErrors
          ? netPerformancePercentageWithCurrencyEffect ?? null
          : null,
        netPerformanceWithCurrencyEffect: !hasErrors
          ? netPerformanceWithCurrencyEffect ?? null
          : null,
        quantity: item.quantity,
        symbol: item.symbol,
        tags: item.tags,
        transactionCount: item.transactionCount,
        valueInBaseCurrency: new Big(marketPriceInBaseCurrency).mul(
          item.quantity
        )
      });

      totalInterestWithCurrencyEffect = totalInterestWithCurrencyEffect.plus(
        totalInterestInBaseCurrency
      );

      totalLiabilitiesWithCurrencyEffect =
        totalLiabilitiesWithCurrencyEffect.plus(totalLiabilitiesInBaseCurrency);

      totalValuablesWithCurrencyEffect = totalValuablesWithCurrencyEffect.plus(
        totalValuablesInBaseCurrency
      );

      if (
        (hasErrors ||
          currentRateErrors.find(({ dataSource, symbol }) => {
            return dataSource === item.dataSource && symbol === item.symbol;
          })) &&
        item.investment.gt(0)
      ) {
        errors.push({ dataSource: item.dataSource, symbol: item.symbol });
      }
    }

    for (const currentDate of chartDates) {
      const dateString = format(currentDate, DATE_FORMAT);

      for (const symbol of Object.keys(valuesBySymbol)) {
        const symbolValues = valuesBySymbol[symbol];

        const currentValue =
          symbolValues.currentValues?.[dateString] ?? new Big(0);

        const currentValueWithCurrencyEffect =
          symbolValues.currentValuesWithCurrencyEffect?.[dateString] ??
          new Big(0);

        const investmentValueAccumulated =
          symbolValues.investmentValuesAccumulated?.[dateString] ?? new Big(0);

        const investmentValueAccumulatedWithCurrencyEffect =
          symbolValues.investmentValuesAccumulatedWithCurrencyEffect?.[
            dateString
          ] ?? new Big(0);

        const investmentValueWithCurrencyEffect =
          symbolValues.investmentValuesWithCurrencyEffect?.[dateString] ??
          new Big(0);

        const netPerformanceValue =
          symbolValues.netPerformanceValues?.[dateString] ?? new Big(0);

        const netPerformanceValueWithCurrencyEffect =
          symbolValues.netPerformanceValuesWithCurrencyEffect?.[dateString] ??
          new Big(0);

        const timeWeightedInvestmentValue =
          symbolValues.timeWeightedInvestmentValues?.[dateString] ?? new Big(0);

        const timeWeightedInvestmentValueWithCurrencyEffect =
          symbolValues.timeWeightedInvestmentValuesWithCurrencyEffect?.[
            dateString
          ] ?? new Big(0);

        accumulatedValuesByDate[dateString] = {
          investmentValueWithCurrencyEffect: (
            accumulatedValuesByDate[dateString]
              ?.investmentValueWithCurrencyEffect ?? new Big(0)
          ).add(investmentValueWithCurrencyEffect),
          totalCurrentValue: (
            accumulatedValuesByDate[dateString]?.totalCurrentValue ?? new Big(0)
          ).add(currentValue),
          totalCurrentValueWithCurrencyEffect: (
            accumulatedValuesByDate[dateString]
              ?.totalCurrentValueWithCurrencyEffect ?? new Big(0)
          ).add(currentValueWithCurrencyEffect),
          totalInvestmentValue: (
            accumulatedValuesByDate[dateString]?.totalInvestmentValue ??
            new Big(0)
          ).add(investmentValueAccumulated),
          totalInvestmentValueWithCurrencyEffect: (
            accumulatedValuesByDate[dateString]
              ?.totalInvestmentValueWithCurrencyEffect ?? new Big(0)
          ).add(investmentValueAccumulatedWithCurrencyEffect),
          totalNetPerformanceValue: (
            accumulatedValuesByDate[dateString]?.totalNetPerformanceValue ??
            new Big(0)
          ).add(netPerformanceValue),
          totalNetPerformanceValueWithCurrencyEffect: (
            accumulatedValuesByDate[dateString]
              ?.totalNetPerformanceValueWithCurrencyEffect ?? new Big(0)
          ).add(netPerformanceValueWithCurrencyEffect),
          totalTimeWeightedInvestmentValue: (
            accumulatedValuesByDate[dateString]
              ?.totalTimeWeightedInvestmentValue ?? new Big(0)
          ).add(timeWeightedInvestmentValue),
          totalTimeWeightedInvestmentValueWithCurrencyEffect: (
            accumulatedValuesByDate[dateString]
              ?.totalTimeWeightedInvestmentValueWithCurrencyEffect ?? new Big(0)
          ).add(timeWeightedInvestmentValueWithCurrencyEffect)
        };
      }
    }

    const chartData: HistoricalDataItem[] = Object.entries(
      accumulatedValuesByDate
    ).map(([date, values]) => {
      const {
        investmentValueWithCurrencyEffect,
        totalCurrentValue,
        totalCurrentValueWithCurrencyEffect,
        totalInvestmentValue,
        totalInvestmentValueWithCurrencyEffect,
        totalNetPerformanceValue,
        totalNetPerformanceValueWithCurrencyEffect,
        totalTimeWeightedInvestmentValue,
        totalTimeWeightedInvestmentValueWithCurrencyEffect
      } = values;

      const netPerformanceInPercentage = totalTimeWeightedInvestmentValue.eq(0)
        ? 0
        : totalNetPerformanceValue
            .div(totalTimeWeightedInvestmentValue)
            .mul(100)
            .toNumber();

      const netPerformanceInPercentageWithCurrencyEffect =
        totalTimeWeightedInvestmentValueWithCurrencyEffect.eq(0)
          ? 0
          : totalNetPerformanceValueWithCurrencyEffect
              .div(totalTimeWeightedInvestmentValueWithCurrencyEffect)
              .mul(100)
              .toNumber();

      return {
        date,
        netPerformanceInPercentage,
        netPerformanceInPercentageWithCurrencyEffect,
        investmentValueWithCurrencyEffect:
          investmentValueWithCurrencyEffect.toNumber(),
        netPerformance: totalNetPerformanceValue.toNumber(),
        netPerformanceWithCurrencyEffect:
          totalNetPerformanceValueWithCurrencyEffect.toNumber(),
        netWorth: 0, // TODO
        totalInvestment: totalInvestmentValue.toNumber(),
        totalInvestmentValueWithCurrencyEffect:
          totalInvestmentValueWithCurrencyEffect.toNumber(),
        value: totalCurrentValue.toNumber(),
        valueWithCurrencyEffect: totalCurrentValueWithCurrencyEffect.toNumber()
      };
    });

    const overall = this.calculateOverallPerformance(positions);

    return {
      ...overall,
      chartData,
      errors,
      positions,
      totalInterestWithCurrencyEffect,
      totalLiabilitiesWithCurrencyEffect,
      totalValuablesWithCurrencyEffect,
      hasErrors: hasAnySymbolMetricsErrors || overall.hasErrors
    };
  }

  public async getChart({
    dateRange = 'max',
    withDataDecimation = true
  }: {
    dateRange?: DateRange;
    withDataDecimation?: boolean;
  }): Promise<HistoricalDataItem[]> {
    console.time('-------- PortfolioCalculator.getChart');

    if (this.getTransactionPoints().length === 0) {
      return [];
    }

    const { endDate, startDate } = getInterval(dateRange, this.getStartDate());

    const daysInMarket = differenceInDays(endDate, startDate) + 1;
    const step = withDataDecimation
      ? Math.round(daysInMarket / Math.min(daysInMarket, MAX_CHART_ITEMS))
      : 1;

    const chartData = await this.getChartData({
      step,
      end: endDate,
      start: startDate
    });

    console.timeEnd('-------- PortfolioCalculator.getChart');

    return chartData;
  }

  public async getChartData({
    end = new Date(Date.now()),
    start,
    step = 1
  }: {
    end?: Date;
    start: Date;
    step?: number;
  }): Promise<HistoricalDataItem[]> {
    const symbols: { [symbol: string]: boolean } = {};

    const transactionPointsBeforeEndDate =
      this.transactionPoints?.filter((transactionPoint) => {
        return isBefore(parseDate(transactionPoint.date), end);
      }) ?? [];

    const currencies: { [symbol: string]: string } = {};
    const dataGatheringItems: IDataGatheringItem[] = [];
    const firstIndex = transactionPointsBeforeEndDate.length;

    let dates = eachDayOfInterval({ start, end }, { step }).map((date) => {
      return resetHours(date);
    });

    const includesEndDate = isSameDay(last(dates), end);

    if (!includesEndDate) {
      dates.push(resetHours(end));
    }

    if (transactionPointsBeforeEndDate.length > 0) {
      for (const {
        currency,
        dataSource,
        symbol
      } of transactionPointsBeforeEndDate[firstIndex - 1].items) {
        dataGatheringItems.push({
          dataSource,
          symbol
        });
        currencies[symbol] = currency;
        symbols[symbol] = true;
      }
    }

    const { dataProviderInfos, values: marketSymbols } =
      await this.currentRateService.getValues({
        dataGatheringItems,
        dateQuery: {
          gte: start,
          lt: end
        }
      });

    this.dataProviderInfos = dataProviderInfos;

    const marketSymbolMap: {
      [date: string]: { [symbol: string]: Big };
    } = {};

    let exchangeRatesByCurrency =
      await this.exchangeRateDataService.getExchangeRatesByCurrency({
        currencies: uniq(Object.values(currencies)),
        endDate: endOfDay(end),
        startDate: this.getStartDate(),
        targetCurrency: this.currency
      });

    for (const marketSymbol of marketSymbols) {
      const dateString = format(marketSymbol.date, DATE_FORMAT);
      if (!marketSymbolMap[dateString]) {
        marketSymbolMap[dateString] = {};
      }
      if (marketSymbol.marketPrice) {
        marketSymbolMap[dateString][marketSymbol.symbol] = new Big(
          marketSymbol.marketPrice
        );
      }
    }

    const accumulatedValuesByDate: {
      [date: string]: {
        investmentValueWithCurrencyEffect: Big;
        totalCurrentValue: Big;
        totalCurrentValueWithCurrencyEffect: Big;
        totalAccountBalanceWithCurrencyEffect: Big;
        totalInvestmentValue: Big;
        totalInvestmentValueWithCurrencyEffect: Big;
        totalNetPerformanceValue: Big;
        totalNetPerformanceValueWithCurrencyEffect: Big;
        totalTimeWeightedInvestmentValue: Big;
        totalTimeWeightedInvestmentValueWithCurrencyEffect: Big;
      };
    } = {};

    const valuesBySymbol: {
      [symbol: string]: {
        currentValues: { [date: string]: Big };
        currentValuesWithCurrencyEffect: { [date: string]: Big };
        investmentValuesAccumulated: { [date: string]: Big };
        investmentValuesAccumulatedWithCurrencyEffect: { [date: string]: Big };
        investmentValuesWithCurrencyEffect: { [date: string]: Big };
        netPerformanceValues: { [date: string]: Big };
        netPerformanceValuesWithCurrencyEffect: { [date: string]: Big };
        timeWeightedInvestmentValues: { [date: string]: Big };
        timeWeightedInvestmentValuesWithCurrencyEffect: { [date: string]: Big };
      };
    } = {};

    for (const symbol of Object.keys(symbols)) {
      const {
        currentValues,
        currentValuesWithCurrencyEffect,
        investmentValuesAccumulated,
        investmentValuesAccumulatedWithCurrencyEffect,
        investmentValuesWithCurrencyEffect,
        netPerformanceValues,
        netPerformanceValuesWithCurrencyEffect,
        timeWeightedInvestmentValues,
        timeWeightedInvestmentValuesWithCurrencyEffect
      } = this.getSymbolMetrics({
        end,
        marketSymbolMap,
        start,
        step,
        symbol,
        dataSource: null,
        exchangeRates:
          exchangeRatesByCurrency[`${currencies[symbol]}${this.currency}`],
        isChartMode: true
      });

      valuesBySymbol[symbol] = {
        currentValues,
        currentValuesWithCurrencyEffect,
        investmentValuesAccumulated,
        investmentValuesAccumulatedWithCurrencyEffect,
        investmentValuesWithCurrencyEffect,
        netPerformanceValues,
        netPerformanceValuesWithCurrencyEffect,
        timeWeightedInvestmentValues,
        timeWeightedInvestmentValuesWithCurrencyEffect
      };
    }

    let lastDate = format(this.startDate, DATE_FORMAT);

    for (const currentDate of dates) {
      const dateString = format(currentDate, DATE_FORMAT);

      accumulatedValuesByDate[dateString] = {
        investmentValueWithCurrencyEffect: new Big(0),
        totalAccountBalanceWithCurrencyEffect: new Big(0),
        totalCurrentValue: new Big(0),
        totalCurrentValueWithCurrencyEffect: new Big(0),
        totalInvestmentValue: new Big(0),
        totalInvestmentValueWithCurrencyEffect: new Big(0),
        totalNetPerformanceValue: new Big(0),
        totalNetPerformanceValueWithCurrencyEffect: new Big(0),
        totalTimeWeightedInvestmentValue: new Big(0),
        totalTimeWeightedInvestmentValueWithCurrencyEffect: new Big(0)
      };

      for (const symbol of Object.keys(valuesBySymbol)) {
        const symbolValues = valuesBySymbol[symbol];

        const currentValue =
          symbolValues.currentValues?.[dateString] ?? new Big(0);

        const currentValueWithCurrencyEffect =
          symbolValues.currentValuesWithCurrencyEffect?.[dateString] ??
          new Big(0);

        const investmentValueAccumulated =
          symbolValues.investmentValuesAccumulated?.[dateString] ?? new Big(0);

        const investmentValueAccumulatedWithCurrencyEffect =
          symbolValues.investmentValuesAccumulatedWithCurrencyEffect?.[
            dateString
          ] ?? new Big(0);

        const investmentValueWithCurrencyEffect =
          symbolValues.investmentValuesWithCurrencyEffect?.[dateString] ??
          new Big(0);

        const netPerformanceValue =
          symbolValues.netPerformanceValues?.[dateString] ?? new Big(0);

        const netPerformanceValueWithCurrencyEffect =
          symbolValues.netPerformanceValuesWithCurrencyEffect?.[dateString] ??
          new Big(0);

        const timeWeightedInvestmentValue =
          symbolValues.timeWeightedInvestmentValues?.[dateString] ?? new Big(0);

        const timeWeightedInvestmentValueWithCurrencyEffect =
          symbolValues.timeWeightedInvestmentValuesWithCurrencyEffect?.[
            dateString
          ] ?? new Big(0);

        accumulatedValuesByDate[dateString].investmentValueWithCurrencyEffect =
          accumulatedValuesByDate[
            dateString
          ].investmentValueWithCurrencyEffect.add(
            investmentValueWithCurrencyEffect
          );

        accumulatedValuesByDate[dateString].totalCurrentValue =
          accumulatedValuesByDate[dateString].totalCurrentValue.add(
            currentValue
          );

        accumulatedValuesByDate[
          dateString
        ].totalCurrentValueWithCurrencyEffect = accumulatedValuesByDate[
          dateString
        ].totalCurrentValueWithCurrencyEffect.add(
          currentValueWithCurrencyEffect
        );

        accumulatedValuesByDate[dateString].totalInvestmentValue =
          accumulatedValuesByDate[dateString].totalInvestmentValue.add(
            investmentValueAccumulated
          );

        accumulatedValuesByDate[
          dateString
        ].totalInvestmentValueWithCurrencyEffect = accumulatedValuesByDate[
          dateString
        ].totalInvestmentValueWithCurrencyEffect.add(
          investmentValueAccumulatedWithCurrencyEffect
        );

        accumulatedValuesByDate[dateString].totalNetPerformanceValue =
          accumulatedValuesByDate[dateString].totalNetPerformanceValue.add(
            netPerformanceValue
          );

        accumulatedValuesByDate[
          dateString
        ].totalNetPerformanceValueWithCurrencyEffect = accumulatedValuesByDate[
          dateString
        ].totalNetPerformanceValueWithCurrencyEffect.add(
          netPerformanceValueWithCurrencyEffect
        );

        accumulatedValuesByDate[dateString].totalTimeWeightedInvestmentValue =
          accumulatedValuesByDate[
            dateString
          ].totalTimeWeightedInvestmentValue.add(timeWeightedInvestmentValue);

        accumulatedValuesByDate[
          dateString
        ].totalTimeWeightedInvestmentValueWithCurrencyEffect =
          accumulatedValuesByDate[
            dateString
          ].totalTimeWeightedInvestmentValueWithCurrencyEffect.add(
            timeWeightedInvestmentValueWithCurrencyEffect
          );
      }

      if (
        this.accountBalanceItems.some(({ date }) => {
          return date === dateString;
        })
      ) {
        accumulatedValuesByDate[
          dateString
        ].totalAccountBalanceWithCurrencyEffect = new Big(
          this.accountBalanceItems.find(({ date }) => {
            return date === dateString;
          }).value
        );
      } else {
        accumulatedValuesByDate[
          dateString
        ].totalAccountBalanceWithCurrencyEffect =
          accumulatedValuesByDate[lastDate]
            ?.totalAccountBalanceWithCurrencyEffect ?? new Big(0);
      }

      lastDate = dateString;
    }

    return Object.entries(accumulatedValuesByDate).map(([date, values]) => {
      const {
        investmentValueWithCurrencyEffect,
        totalAccountBalanceWithCurrencyEffect,
        totalCurrentValue,
        totalCurrentValueWithCurrencyEffect,
        totalInvestmentValue,
        totalInvestmentValueWithCurrencyEffect,
        totalNetPerformanceValue,
        totalNetPerformanceValueWithCurrencyEffect,
        totalTimeWeightedInvestmentValue,
        totalTimeWeightedInvestmentValueWithCurrencyEffect
      } = values;

      console.log(
        'Chart: totalTimeWeightedInvestmentValue',
        totalTimeWeightedInvestmentValue.toFixed()
      );

      const netPerformanceInPercentage = totalTimeWeightedInvestmentValue.eq(0)
        ? 0
        : totalNetPerformanceValue
            .div(totalTimeWeightedInvestmentValue)
            .mul(100)
            .toNumber();

      const netPerformanceInPercentageWithCurrencyEffect =
        totalTimeWeightedInvestmentValueWithCurrencyEffect.eq(0)
          ? 0
          : totalNetPerformanceValueWithCurrencyEffect
              .div(totalTimeWeightedInvestmentValueWithCurrencyEffect)
              .mul(100)
              .toNumber();

      return {
        date,
        netPerformanceInPercentage,
        netPerformanceInPercentageWithCurrencyEffect,
        investmentValueWithCurrencyEffect:
          investmentValueWithCurrencyEffect.toNumber(),
        netPerformance: totalNetPerformanceValue.toNumber(),
        netPerformanceWithCurrencyEffect:
          totalNetPerformanceValueWithCurrencyEffect.toNumber(),
        // TODO: Add valuables
        netWorth: totalCurrentValueWithCurrencyEffect
          .plus(totalAccountBalanceWithCurrencyEffect)
          .toNumber(),
        totalAccountBalance: totalAccountBalanceWithCurrencyEffect.toNumber(),
        totalInvestment: totalInvestmentValue.toNumber(),
        totalInvestmentValueWithCurrencyEffect:
          totalInvestmentValueWithCurrencyEffect.toNumber(),
        value: totalCurrentValue.toNumber(),
        valueWithCurrencyEffect: totalCurrentValueWithCurrencyEffect.toNumber()
      };
    });
  }

  public getDataProviderInfos() {
    return this.dataProviderInfos;
  }

  public async getDividendInBaseCurrency() {
    await this.snapshotPromise;

    return getSum(
      this.snapshot.positions.map(({ dividendInBaseCurrency }) => {
        return dividendInBaseCurrency;
      })
    );
  }

  public async getFeesInBaseCurrency() {
    await this.snapshotPromise;

    return this.snapshot.totalFeesWithCurrencyEffect;
  }

  public async getInterestInBaseCurrency() {
    await this.snapshotPromise;

    return this.snapshot.totalInterestWithCurrencyEffect;
  }

  public getInvestments(): { date: string; investment: Big }[] {
    if (this.transactionPoints.length === 0) {
      return [];
    }

    return this.transactionPoints.map((transactionPoint) => {
      return {
        date: transactionPoint.date,
        investment: transactionPoint.items.reduce(
          (investment, transactionPointSymbol) =>
            investment.plus(transactionPointSymbol.investment),
          new Big(0)
        )
      };
    });
  }

  public getInvestmentsByGroup({
    data,
    groupBy
  }: {
    data: HistoricalDataItem[];
    groupBy: GroupBy;
  }): InvestmentItem[] {
    const groupedData: { [dateGroup: string]: Big } = {};

    for (const { date, investmentValueWithCurrencyEffect } of data) {
      const dateGroup =
        groupBy === 'month' ? date.substring(0, 7) : date.substring(0, 4);
      groupedData[dateGroup] = (groupedData[dateGroup] ?? new Big(0)).plus(
        investmentValueWithCurrencyEffect
      );
    }

    return Object.keys(groupedData).map((dateGroup) => ({
      date: groupBy === 'month' ? `${dateGroup}-01` : `${dateGroup}-01-01`,
      investment: groupedData[dateGroup].toNumber()
    }));
  }

  public async getLiabilitiesInBaseCurrency() {
    await this.snapshotPromise;

    return this.snapshot.totalLiabilitiesWithCurrencyEffect;
  }

  public async getSnapshot() {
    console.time('getSnapshot');
    await this.snapshotPromise;

    console.timeEnd('getSnapshot');

    return this.snapshot;
  }

  public async getPerformance({ end, start }) {
    await this.snapshotPromise;

    const { chartData } = this.snapshot;

    const newChartData: HistoricalDataItem[] = [];

    let netPerformanceAtStartDate: number;
    let netPerformanceWithCurrencyEffectAtStartDate: number;
    let netPerformanceInPercentageWithCurrencyEffectAtStartDate: number;
    let totalInvestmentValuesWithCurrencyEffect: number[] = [];

    for (let historicalDataItem of chartData) {
      if (
        !isBefore(parseDate(historicalDataItem.date), subDays(start, 1)) &&
        !isAfter(parseDate(historicalDataItem.date), end)
      ) {
        if (!netPerformanceAtStartDate) {
          netPerformanceAtStartDate = historicalDataItem.netPerformance;

          netPerformanceWithCurrencyEffectAtStartDate =
            historicalDataItem.netPerformanceWithCurrencyEffect;

          netPerformanceInPercentageWithCurrencyEffectAtStartDate =
            historicalDataItem.netPerformanceInPercentageWithCurrencyEffect;
        }

        const netPerformanceWithCurrencyEffectSinceStartDate =
          historicalDataItem.netPerformanceWithCurrencyEffect -
          netPerformanceWithCurrencyEffectAtStartDate;

        if (historicalDataItem.totalInvestmentValueWithCurrencyEffect > 0) {
          totalInvestmentValuesWithCurrencyEffect.push(
            historicalDataItem.totalInvestmentValueWithCurrencyEffect
          );
        }

        const timeWeightedInvestmentValue =
          totalInvestmentValuesWithCurrencyEffect.length > 0
            ? sum(totalInvestmentValuesWithCurrencyEffect) /
              totalInvestmentValuesWithCurrencyEffect.length
            : 0;

        // TODO: Not sure if this is correct
        console.log(historicalDataItem.totalInvestmentValueWithCurrencyEffect);

        // TODO: Normalize remaining metrics
        newChartData.push({
          ...historicalDataItem,
          netPerformance:
            historicalDataItem.netPerformance - netPerformanceAtStartDate,
          netPerformanceWithCurrencyEffect:
            netPerformanceWithCurrencyEffectSinceStartDate,
          netPerformanceInPercentageWithCurrencyEffect:
            (netPerformanceWithCurrencyEffectSinceStartDate /
              timeWeightedInvestmentValue) *
            100,
          // TODO: Add net worth with valuables
          // netWorth: totalCurrentValueWithCurrencyEffect
          //   .plus(totalAccountBalanceWithCurrencyEffect)
          //   .toNumber()
          netWorth: 0
        });
      }
    }

    return { chart: newChartData };
  }

  public getStartDate() {
    let firstAccountBalanceDate: Date;
    let firstActivityDate: Date;

    try {
      const firstAccountBalanceDateString = first(
        this.accountBalanceItems
      )?.date;
      firstAccountBalanceDate = firstAccountBalanceDateString
        ? parseDate(firstAccountBalanceDateString)
        : new Date();
    } catch (error) {
      firstAccountBalanceDate = new Date();
    }

    try {
      const firstActivityDateString = this.transactionPoints[0].date;
      firstActivityDate = firstActivityDateString
        ? parseDate(firstActivityDateString)
        : new Date();
    } catch (error) {
      firstActivityDate = new Date();
    }

    return min([firstAccountBalanceDate, firstActivityDate]);
  }

  protected abstract getSymbolMetrics({
    dataSource,
    end,
    exchangeRates,
    isChartMode,
    marketSymbolMap,
    start,
    step,
    symbol
  }: {
    end: Date;
    exchangeRates: { [dateString: string]: number };
    isChartMode?: boolean;
    marketSymbolMap: {
      [date: string]: { [symbol: string]: Big };
    };
    start: Date;
    step?: number;
  } & UniqueAsset): SymbolMetrics;

  public getTransactionPoints() {
    return this.transactionPoints;
  }

  public async getValuablesInBaseCurrency() {
    await this.snapshotPromise;

    return this.snapshot.totalValuablesWithCurrencyEffect;
  }

  private computeTransactionPoints() {
    this.transactionPoints = [];
    const symbols: { [symbol: string]: TransactionPointSymbol } = {};

    let lastDate: string = null;
    let lastTransactionPoint: TransactionPoint = null;

    for (const {
      fee,
      date,
      quantity,
      SymbolProfile,
      tags,
      type,
      unitPrice
    } of this.activities) {
      let currentTransactionPointItem: TransactionPointSymbol;
      const oldAccumulatedSymbol = symbols[SymbolProfile.symbol];

      const factor = getFactor(type);

      if (oldAccumulatedSymbol) {
        let investment = oldAccumulatedSymbol.investment;

        const newQuantity = quantity
          .mul(factor)
          .plus(oldAccumulatedSymbol.quantity);

        if (type === 'BUY') {
          investment = oldAccumulatedSymbol.investment.plus(
            quantity.mul(unitPrice)
          );
        } else if (type === 'SELL') {
          investment = oldAccumulatedSymbol.investment.minus(
            quantity.mul(oldAccumulatedSymbol.averagePrice)
          );
        }

        currentTransactionPointItem = {
          investment,
          averagePrice: newQuantity.gt(0)
            ? investment.div(newQuantity)
            : new Big(0),
          currency: SymbolProfile.currency,
          dataSource: SymbolProfile.dataSource,
          dividend: new Big(0),
          fee: oldAccumulatedSymbol.fee.plus(fee),
          firstBuyDate: oldAccumulatedSymbol.firstBuyDate,
          quantity: newQuantity,
          symbol: SymbolProfile.symbol,
          tags: oldAccumulatedSymbol.tags.concat(tags),
          transactionCount: oldAccumulatedSymbol.transactionCount + 1
        };
      } else {
        currentTransactionPointItem = {
          fee,
          tags,
          averagePrice: unitPrice,
          currency: SymbolProfile.currency,
          dataSource: SymbolProfile.dataSource,
          dividend: new Big(0),
          firstBuyDate: date,
          investment: unitPrice.mul(quantity).mul(factor),
          quantity: quantity.mul(factor),
          symbol: SymbolProfile.symbol,
          transactionCount: 1
        };
      }

      currentTransactionPointItem.tags = uniqBy(
        currentTransactionPointItem.tags,
        'id'
      );

      symbols[SymbolProfile.symbol] = currentTransactionPointItem;

      const items = lastTransactionPoint?.items ?? [];

      const newItems = items.filter(({ symbol }) => {
        return symbol !== SymbolProfile.symbol;
      });

      newItems.push(currentTransactionPointItem);

      newItems.sort((a, b) => {
        return a.symbol?.localeCompare(b.symbol);
      });

      let fees = new Big(0);

      if (type === 'FEE') {
        fees = fee;
      }

      let interest = new Big(0);

      if (type === 'INTEREST') {
        interest = quantity.mul(unitPrice);
      }

      let liabilities = new Big(0);

      if (type === 'LIABILITY') {
        liabilities = quantity.mul(unitPrice);
      }

      let valuables = new Big(0);

      if (type === 'ITEM') {
        valuables = quantity.mul(unitPrice);
      }

      if (lastDate !== date || lastTransactionPoint === null) {
        lastTransactionPoint = {
          date,
          fees,
          interest,
          liabilities,
          valuables,
          items: newItems
        };

        this.transactionPoints.push(lastTransactionPoint);
      } else {
        lastTransactionPoint.fees = lastTransactionPoint.fees.plus(fees);
        lastTransactionPoint.interest =
          lastTransactionPoint.interest.plus(interest);
        lastTransactionPoint.items = newItems;
        lastTransactionPoint.liabilities =
          lastTransactionPoint.liabilities.plus(liabilities);
        lastTransactionPoint.valuables =
          lastTransactionPoint.valuables.plus(valuables);
      }

      lastDate = date;
    }
  }

  private async initialize() {
    if (this.useCache) {
      const startTimeTotal = performance.now();

      const cachedSnapshot = await this.redisCacheService.get(
        this.redisCacheService.getPortfolioSnapshotKey({
          userId: this.userId
        })
      );

      if (cachedSnapshot) {
        this.snapshot = plainToClass(
          PortfolioSnapshot,
          JSON.parse(cachedSnapshot)
        );

        Logger.debug(
          `Fetched portfolio snapshot from cache in ${(
            (performance.now() - startTimeTotal) /
            1000
          ).toFixed(3)} seconds`,
          'PortfolioCalculator'
        );
      } else {
        this.snapshot = await this.computeSnapshot(
          this.startDate,
          this.endDate
        );

        this.redisCacheService.set(
          this.redisCacheService.getPortfolioSnapshotKey({
            userId: this.userId
          }),
          JSON.stringify(this.snapshot),
          this.configurationService.get('CACHE_QUOTES_TTL')
        );

        Logger.debug(
          `Computed portfolio snapshot in ${(
            (performance.now() - startTimeTotal) /
            1000
          ).toFixed(3)} seconds`,
          'PortfolioCalculator'
        );
      }
    } else {
      this.snapshot = await this.computeSnapshot(this.startDate, this.endDate);
    }
  }
}
