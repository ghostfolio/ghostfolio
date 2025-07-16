import { Activity } from '@ghostfolio/api/app/order/interfaces/activities.interface';
import { CurrentRateService } from '@ghostfolio/api/app/portfolio/current-rate.service';
import { PortfolioOrder } from '@ghostfolio/api/app/portfolio/interfaces/portfolio-order.interface';
import { PortfolioSnapshotValue } from '@ghostfolio/api/app/portfolio/interfaces/snapshot-value.interface';
import { TransactionPointSymbol } from '@ghostfolio/api/app/portfolio/interfaces/transaction-point-symbol.interface';
import { TransactionPoint } from '@ghostfolio/api/app/portfolio/interfaces/transaction-point.interface';
import { RedisCacheService } from '@ghostfolio/api/app/redis-cache/redis-cache.service';
import { getFactor } from '@ghostfolio/api/helper/portfolio.helper';
import { LogPerformance } from '@ghostfolio/api/interceptors/performance-logging/performance-logging.interceptor';
import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';
import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.service';
import { IDataGatheringItem } from '@ghostfolio/api/services/interfaces/interfaces';
import { PortfolioSnapshotService } from '@ghostfolio/api/services/queues/portfolio-snapshot/portfolio-snapshot.service';
import { getIntervalFromDateRange } from '@ghostfolio/common/calculation-helper';
import {
  PORTFOLIO_SNAPSHOT_PROCESS_JOB_NAME,
  PORTFOLIO_SNAPSHOT_PROCESS_JOB_OPTIONS,
  PORTFOLIO_SNAPSHOT_COMPUTATION_QUEUE_PRIORITY_HIGH,
  PORTFOLIO_SNAPSHOT_COMPUTATION_QUEUE_PRIORITY_LOW
} from '@ghostfolio/common/config';
import {
  DATE_FORMAT,
  getSum,
  parseDate,
  resetHours
} from '@ghostfolio/common/helper';
import {
  AssetProfileIdentifier,
  DataProviderInfo,
  Filter,
  HistoricalDataItem,
  InvestmentItem,
  ResponseError,
  SymbolMetrics
} from '@ghostfolio/common/interfaces';
import { PortfolioSnapshot, TimelinePosition } from '@ghostfolio/common/models';
import { GroupBy } from '@ghostfolio/common/types';
import { PerformanceCalculationType } from '@ghostfolio/common/types/performance-calculation-type.type';

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
  min,
  subDays
} from 'date-fns';
import { isNumber, sortBy, sum, uniqBy } from 'lodash';

export abstract class PortfolioCalculator {
  protected static readonly ENABLE_LOGGING = false;

  protected accountBalanceItems: HistoricalDataItem[];
  protected activities: PortfolioOrder[];

  private configurationService: ConfigurationService;
  private currency: string;
  private currentRateService: CurrentRateService;
  private dataProviderInfos: DataProviderInfo[];
  private endDate: Date;
  private exchangeRateDataService: ExchangeRateDataService;
  private filters: Filter[];
  private portfolioSnapshotService: PortfolioSnapshotService;
  private redisCacheService: RedisCacheService;
  private snapshot: PortfolioSnapshot;
  private snapshotPromise: Promise<void>;
  private startDate: Date;
  private transactionPoints: TransactionPoint[];
  private userId: string;

  public constructor({
    accountBalanceItems,
    activities,
    configurationService,
    currency,
    currentRateService,
    exchangeRateDataService,
    filters,
    portfolioSnapshotService,
    redisCacheService,
    userId
  }: {
    accountBalanceItems: HistoricalDataItem[];
    activities: Activity[];
    configurationService: ConfigurationService;
    currency: string;
    currentRateService: CurrentRateService;
    exchangeRateDataService: ExchangeRateDataService;
    filters: Filter[];
    portfolioSnapshotService: PortfolioSnapshotService;
    redisCacheService: RedisCacheService;
    userId: string;
  }) {
    this.accountBalanceItems = accountBalanceItems;
    this.configurationService = configurationService;
    this.currency = currency;
    this.currentRateService = currentRateService;
    this.exchangeRateDataService = exchangeRateDataService;
    this.filters = filters;

    let dateOfFirstActivity = new Date();

    if (this.accountBalanceItems[0]) {
      dateOfFirstActivity = parseDate(this.accountBalanceItems[0].date);
    }

    this.activities = activities
      .map(
        ({
          date,
          feeInAssetProfileCurrency,
          quantity,
          SymbolProfile,
          tags = [],
          type,
          unitPriceInAssetProfileCurrency
        }) => {
          if (isBefore(date, dateOfFirstActivity)) {
            dateOfFirstActivity = date;
          }

          if (isAfter(date, new Date())) {
            // Adapt date to today if activity is in future (e.g. liability)
            // to include it in the interval
            date = endOfDay(new Date());
          }

          return {
            SymbolProfile,
            tags,
            type,
            date: format(date, DATE_FORMAT),
            fee: new Big(feeInAssetProfileCurrency),
            quantity: new Big(quantity),
            unitPrice: new Big(unitPriceInAssetProfileCurrency)
          };
        }
      )
      .sort((a, b) => {
        return a.date?.localeCompare(b.date);
      });

    this.portfolioSnapshotService = portfolioSnapshotService;
    this.redisCacheService = redisCacheService;
    this.userId = userId;

    const { endDate, startDate } = getIntervalFromDateRange(
      'max',
      subDays(dateOfFirstActivity, 1)
    );

    this.endDate = endDate;
    this.startDate = startDate;

    this.computeTransactionPoints();

    this.snapshotPromise = this.initialize();
  }

  protected abstract calculateOverallPerformance(
    positions: TimelinePosition[]
  ): PortfolioSnapshot;

  @LogPerformance
  public async computeSnapshot(): Promise<PortfolioSnapshot> {
    const lastTransactionPoint = this.transactionPoints.at(-1);

    const transactionPoints = this.transactionPoints?.filter(({ date }) => {
      return isBefore(parseDate(date), this.endDate);
    });

    if (!transactionPoints.length) {
      return {
        activitiesCount: 0,
        createdAt: new Date(),
        currentValueInBaseCurrency: new Big(0),
        errors: [],
        hasErrors: false,
        historicalData: [],
        positions: [],
        totalFeesWithCurrencyEffect: new Big(0),
        totalInterestWithCurrencyEffect: new Big(0),
        totalInvestment: new Big(0),
        totalInvestmentWithCurrencyEffect: new Big(0),
        totalLiabilitiesWithCurrencyEffect: new Big(0)
      };
    }

    const currencies: { [symbol: string]: string } = {};
    const dataGatheringItems: IDataGatheringItem[] = [];
    let firstIndex = transactionPoints.length;
    let firstTransactionPoint: TransactionPoint = null;
    let totalInterestWithCurrencyEffect = new Big(0);
    let totalLiabilitiesWithCurrencyEffect = new Big(0);

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
        !isBefore(parseDate(transactionPoints[i].date), this.startDate) &&
        firstTransactionPoint === null
      ) {
        firstTransactionPoint = transactionPoints[i];
        firstIndex = i;
      }
    }

    const exchangeRatesByCurrency =
      await this.exchangeRateDataService.getExchangeRatesByCurrency({
        currencies: Array.from(new Set(Object.values(currencies))),
        endDate: endOfDay(this.endDate),
        startDate: this.startDate,
        targetCurrency: this.currency
      });

    const {
      dataProviderInfos,
      errors: currentRateErrors,
      values: marketSymbols
    } = await this.currentRateService.getValues({
      dataGatheringItems,
      dateQuery: {
        gte: this.startDate,
        lt: this.endDate
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

    const endDateString = format(this.endDate, DATE_FORMAT);

    const daysInMarket = differenceInDays(this.endDate, this.startDate);

    const chartDateMap = this.getChartDateMap({
      endDate: this.endDate,
      startDate: this.startDate,
      step: Math.round(
        daysInMarket /
          Math.min(
            daysInMarket,
            this.configurationService.get('MAX_CHART_ITEMS')
          )
      )
    });

    for (const accountBalanceItem of this.accountBalanceItems) {
      chartDateMap[accountBalanceItem.date] = true;
    }

    const chartDates = sortBy(Object.keys(chartDateMap), (chartDate) => {
      return chartDate;
    });

    if (firstIndex > 0) {
      firstIndex--;
    }

    const positions: TimelinePosition[] = [];
    let hasAnySymbolMetricsErrors = false;

    const errors: ResponseError['errors'] = [];

    const accumulatedValuesByDate: {
      [date: string]: {
        investmentValueWithCurrencyEffect: Big;
        totalAccountBalanceWithCurrencyEffect: Big;
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
      const feeInBaseCurrency = item.fee.mul(
        exchangeRatesByCurrency[`${item.currency}${this.currency}`]?.[
          lastTransactionPoint.date
        ] ?? 1
      );

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
        netPerformancePercentageWithCurrencyEffectMap,
        netPerformanceValues,
        netPerformanceValuesWithCurrencyEffect,
        netPerformanceWithCurrencyEffectMap,
        timeWeightedInvestment,
        timeWeightedInvestmentValues,
        timeWeightedInvestmentValuesWithCurrencyEffect,
        timeWeightedInvestmentWithCurrencyEffect,
        totalDividend,
        totalDividendInBaseCurrency,
        totalInterestInBaseCurrency,
        totalInvestment,
        totalInvestmentWithCurrencyEffect,
        totalLiabilitiesInBaseCurrency
      } = this.getSymbolMetrics({
        chartDateMap,
        marketSymbolMap,
        dataSource: item.dataSource,
        end: this.endDate,
        exchangeRates:
          exchangeRatesByCurrency[`${item.currency}${this.currency}`],
        start: this.startDate,
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
        feeInBaseCurrency,
        timeWeightedInvestment,
        timeWeightedInvestmentWithCurrencyEffect,
        dividend: totalDividend,
        dividendInBaseCurrency: totalDividendInBaseCurrency,
        averagePrice: item.averagePrice,
        currency: item.currency,
        dataSource: item.dataSource,
        fee: item.fee,
        firstBuyDate: item.firstBuyDate,
        grossPerformance: !hasErrors ? (grossPerformance ?? null) : null,
        grossPerformancePercentage: !hasErrors
          ? (grossPerformancePercentage ?? null)
          : null,
        grossPerformancePercentageWithCurrencyEffect: !hasErrors
          ? (grossPerformancePercentageWithCurrencyEffect ?? null)
          : null,
        grossPerformanceWithCurrencyEffect: !hasErrors
          ? (grossPerformanceWithCurrencyEffect ?? null)
          : null,
        investment: totalInvestment,
        investmentWithCurrencyEffect: totalInvestmentWithCurrencyEffect,
        marketPrice:
          marketSymbolMap[endDateString]?.[item.symbol]?.toNumber() ?? null,
        marketPriceInBaseCurrency:
          marketPriceInBaseCurrency?.toNumber() ?? null,
        netPerformance: !hasErrors ? (netPerformance ?? null) : null,
        netPerformancePercentage: !hasErrors
          ? (netPerformancePercentage ?? null)
          : null,
        netPerformancePercentageWithCurrencyEffectMap: !hasErrors
          ? (netPerformancePercentageWithCurrencyEffectMap ?? null)
          : null,
        netPerformanceWithCurrencyEffectMap: !hasErrors
          ? (netPerformanceWithCurrencyEffectMap ?? null)
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

      if (
        (hasErrors ||
          currentRateErrors.find(({ dataSource, symbol }) => {
            return dataSource === item.dataSource && symbol === item.symbol;
          })) &&
        item.investment.gt(0) &&
        item.skipErrors === false
      ) {
        errors.push({ dataSource: item.dataSource, symbol: item.symbol });
      }
    }

    const accountBalanceItemsMap = this.accountBalanceItems.reduce(
      (map, { date, value }) => {
        map[date] = new Big(value);

        return map;
      },
      {} as { [date: string]: Big }
    );

    const accountBalanceMap: { [date: string]: Big } = {};

    let lastKnownBalance = new Big(0);

    for (const dateString of chartDates) {
      if (accountBalanceItemsMap[dateString] !== undefined) {
        // If there's an exact balance for this date, update lastKnownBalance
        lastKnownBalance = accountBalanceItemsMap[dateString];
      }

      // Add the most recent balance to the accountBalanceMap
      accountBalanceMap[dateString] = lastKnownBalance;

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
          totalAccountBalanceWithCurrencyEffect: accountBalanceMap[dateString],
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

    const historicalData: HistoricalDataItem[] = Object.entries(
      accumulatedValuesByDate
    ).map(([date, values]) => {
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

      const netPerformanceInPercentage = totalTimeWeightedInvestmentValue.eq(0)
        ? 0
        : totalNetPerformanceValue
            .div(totalTimeWeightedInvestmentValue)
            .toNumber();

      const netPerformanceInPercentageWithCurrencyEffect =
        totalTimeWeightedInvestmentValueWithCurrencyEffect.eq(0)
          ? 0
          : totalNetPerformanceValueWithCurrencyEffect
              .div(totalTimeWeightedInvestmentValueWithCurrencyEffect)
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

    const overall = this.calculateOverallPerformance(positions);

    return {
      ...overall,
      errors,
      historicalData,
      positions,
      totalInterestWithCurrencyEffect,
      totalLiabilitiesWithCurrencyEffect,
      hasErrors: hasAnySymbolMetricsErrors || overall.hasErrors
    };
  }

  protected abstract getPerformanceCalculationType(): PerformanceCalculationType;

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

  public async getPerformance({ end, start }) {
    await this.snapshotPromise;

    const { historicalData } = this.snapshot;

    const chart: HistoricalDataItem[] = [];

    let netPerformanceAtStartDate: number;
    let netPerformanceWithCurrencyEffectAtStartDate: number;
    const totalInvestmentValuesWithCurrencyEffect: number[] = [];

    for (const historicalDataItem of historicalData) {
      const date = resetHours(parseDate(historicalDataItem.date));

      if (!isBefore(date, start) && !isAfter(date, end)) {
        if (!isNumber(netPerformanceAtStartDate)) {
          netPerformanceAtStartDate = historicalDataItem.netPerformance;

          netPerformanceWithCurrencyEffectAtStartDate =
            historicalDataItem.netPerformanceWithCurrencyEffect;
        }

        const netPerformanceSinceStartDate =
          historicalDataItem.netPerformance - netPerformanceAtStartDate;

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

        chart.push({
          ...historicalDataItem,
          netPerformance:
            historicalDataItem.netPerformance - netPerformanceAtStartDate,
          netPerformanceWithCurrencyEffect:
            netPerformanceWithCurrencyEffectSinceStartDate,
          netPerformanceInPercentage:
            timeWeightedInvestmentValue === 0
              ? 0
              : netPerformanceSinceStartDate / timeWeightedInvestmentValue,
          netPerformanceInPercentageWithCurrencyEffect:
            timeWeightedInvestmentValue === 0
              ? 0
              : netPerformanceWithCurrencyEffectSinceStartDate /
                timeWeightedInvestmentValue
          // TODO: Add net worth
          // netWorth: totalCurrentValueWithCurrencyEffect
          //   .plus(totalAccountBalanceWithCurrencyEffect)
          //   .toNumber()
          // netWorth: 0
        });
      }
    }

    return { chart };
  }

  public async getSnapshot() {
    await this.snapshotPromise;

    return this.snapshot;
  }

  public getStartDate() {
    let firstAccountBalanceDate: Date;
    let firstActivityDate: Date;

    try {
      const firstAccountBalanceDateString = this.accountBalanceItems[0]?.date;
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
    chartDateMap,
    dataSource,
    end,
    exchangeRates,
    marketSymbolMap,
    start,
    symbol
  }: {
    chartDateMap: { [date: string]: boolean };
    end: Date;
    exchangeRates: { [dateString: string]: number };
    marketSymbolMap: {
      [date: string]: { [symbol: string]: Big };
    };
    start: Date;
  } & AssetProfileIdentifier): SymbolMetrics;

  public getTransactionPoints() {
    return this.transactionPoints;
  }

  private getChartDateMap({
    endDate,
    startDate,
    step
  }: {
    endDate: Date;
    startDate: Date;
    step: number;
  }): { [date: string]: true } {
    // Create a map of all relevant chart dates:
    // 1. Add transaction point dates
    const chartDateMap = this.transactionPoints.reduce((result, { date }) => {
      result[date] = true;
      return result;
    }, {});

    // 2. Add dates between transactions respecting the specified step size
    for (const date of eachDayOfInterval(
      { end: endDate, start: startDate },
      { step }
    )) {
      chartDateMap[format(date, DATE_FORMAT)] = true;
    }

    if (step > 1) {
      // Reduce the step size of last 90 days
      for (const date of eachDayOfInterval(
        { end: endDate, start: subDays(endDate, 90) },
        { step: 3 }
      )) {
        chartDateMap[format(date, DATE_FORMAT)] = true;
      }

      // Reduce the step size of last 30 days
      for (const date of eachDayOfInterval(
        { end: endDate, start: subDays(endDate, 30) },
        { step: 1 }
      )) {
        chartDateMap[format(date, DATE_FORMAT)] = true;
      }
    }

    // Make sure the end date is present
    chartDateMap[format(endDate, DATE_FORMAT)] = true;

    // Make sure some key dates are present
    for (const dateRange of ['1d', '1y', '5y', 'max', 'mtd', 'wtd', 'ytd']) {
      const { endDate: dateRangeEnd, startDate: dateRangeStart } =
        getIntervalFromDateRange(dateRange);

      if (
        !isBefore(dateRangeStart, startDate) &&
        !isAfter(dateRangeStart, endDate)
      ) {
        chartDateMap[format(dateRangeStart, DATE_FORMAT)] = true;
      }

      if (
        !isBefore(dateRangeEnd, startDate) &&
        !isAfter(dateRangeEnd, endDate)
      ) {
        chartDateMap[format(dateRangeEnd, DATE_FORMAT)] = true;
      }
    }

    return chartDateMap;
  }

  @LogPerformance
  private computeTransactionPoints() {
    this.transactionPoints = [];
    const symbols: { [symbol: string]: TransactionPointSymbol } = {};

    let lastDate: string = null;
    let lastTransactionPoint: TransactionPoint = null;

    for (const {
      date,
      fee,
      quantity,
      SymbolProfile,
      tags,
      type,
      unitPrice
    } of this.activities) {
      let currentTransactionPointItem: TransactionPointSymbol;

      const currency = SymbolProfile.currency;
      const dataSource = SymbolProfile.dataSource;
      const factor = getFactor(type);
      const skipErrors = !!SymbolProfile.userId; // Skip errors for custom asset profiles
      const symbol = SymbolProfile.symbol;

      const oldAccumulatedSymbol = symbols[symbol];

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
          currency,
          dataSource,
          investment,
          skipErrors,
          symbol,
          averagePrice: newQuantity.gt(0)
            ? investment.div(newQuantity)
            : new Big(0),
          dividend: new Big(0),
          fee: oldAccumulatedSymbol.fee.plus(fee),
          firstBuyDate: oldAccumulatedSymbol.firstBuyDate,
          quantity: newQuantity,
          tags: oldAccumulatedSymbol.tags.concat(tags),
          transactionCount: oldAccumulatedSymbol.transactionCount + 1
        };
      } else {
        currentTransactionPointItem = {
          currency,
          dataSource,
          fee,
          skipErrors,
          symbol,
          tags,
          averagePrice: unitPrice,
          dividend: new Big(0),
          firstBuyDate: date,
          investment: unitPrice.mul(quantity).mul(factor),
          quantity: quantity.mul(factor),
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

      if (lastDate !== date || lastTransactionPoint === null) {
        lastTransactionPoint = {
          date,
          fees,
          interest,
          liabilities,
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
      }

      lastDate = date;
    }
  }

  @LogPerformance
  private async initialize() {
    const startTimeTotal = performance.now();

    let cachedPortfolioSnapshot: PortfolioSnapshot;
    let isCachedPortfolioSnapshotExpired = false;
    const jobId = this.userId;

    try {
      const cachedPortfolioSnapshotValue = await this.redisCacheService.get(
        this.redisCacheService.getPortfolioSnapshotKey({
          filters: this.filters,
          userId: this.userId
        })
      );

      const { expiration, portfolioSnapshot }: PortfolioSnapshotValue =
        JSON.parse(cachedPortfolioSnapshotValue);

      cachedPortfolioSnapshot = plainToClass(
        PortfolioSnapshot,
        portfolioSnapshot
      );

      if (isAfter(new Date(), new Date(expiration))) {
        isCachedPortfolioSnapshotExpired = true;
      }
    } catch {}

    if (cachedPortfolioSnapshot) {
      this.snapshot = cachedPortfolioSnapshot;

      Logger.debug(
        `Fetched portfolio snapshot from cache in ${(
          (performance.now() - startTimeTotal) /
          1000
        ).toFixed(3)} seconds`,
        'PortfolioCalculator'
      );

      if (isCachedPortfolioSnapshotExpired) {
        // Compute in the background
        this.portfolioSnapshotService.addJobToQueue({
          data: {
            calculationType: this.getPerformanceCalculationType(),
            filters: this.filters,
            userCurrency: this.currency,
            userId: this.userId
          },
          name: PORTFOLIO_SNAPSHOT_PROCESS_JOB_NAME,
          opts: {
            ...PORTFOLIO_SNAPSHOT_PROCESS_JOB_OPTIONS,
            jobId,
            priority: PORTFOLIO_SNAPSHOT_COMPUTATION_QUEUE_PRIORITY_LOW
          }
        });
      }
    } else {
      // Wait for computation
      await this.portfolioSnapshotService.addJobToQueue({
        data: {
          calculationType: this.getPerformanceCalculationType(),
          filters: this.filters,
          userCurrency: this.currency,
          userId: this.userId
        },
        name: PORTFOLIO_SNAPSHOT_PROCESS_JOB_NAME,
        opts: {
          ...PORTFOLIO_SNAPSHOT_PROCESS_JOB_OPTIONS,
          jobId,
          priority: PORTFOLIO_SNAPSHOT_COMPUTATION_QUEUE_PRIORITY_HIGH
        }
      });

      const job = await this.portfolioSnapshotService.getJob(jobId);

      if (job) {
        await job.finished();
      }

      await this.initialize();
    }
  }
}
