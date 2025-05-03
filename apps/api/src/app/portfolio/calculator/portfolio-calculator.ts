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
  addDays,
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

import { OrderService } from '../../order/order.service';

export abstract class PortfolioCalculator {
  protected static readonly ENABLE_LOGGING = false;

  protected accountBalanceItems: HistoricalDataItem[];
  protected activities: PortfolioOrder[];

  protected configurationService: ConfigurationService;
  protected currency: string;
  protected currentRateService: CurrentRateService;
  protected exchangeRateDataService: ExchangeRateDataService;
  protected orderService: OrderService;
  protected snapshot: PortfolioSnapshot;
  protected snapshotPromise: Promise<void>;
  protected userId: string;
  protected marketMap: { [date: string]: { [symbol: string]: Big } } = {};
  private dataProviderInfos: DataProviderInfo[];
  private endDate: Date;
  private filters: Filter[];
  private portfolioSnapshotService: PortfolioSnapshotService;
  private redisCacheService: RedisCacheService;
  private startDate: Date;
  private transactionPoints: TransactionPoint[];
  private holdings: { [date: string]: { [symbol: string]: Big } } = {};
  private holdingCurrencies: { [symbol: string]: string } = {};

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
    userId,
    orderService
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
    orderService: OrderService;
  }) {
    this.accountBalanceItems = accountBalanceItems;
    this.configurationService = configurationService;
    this.currency = currency;
    this.currentRateService = currentRateService;
    this.exchangeRateDataService = exchangeRateDataService;
    this.filters = filters;
    this.orderService = orderService;

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
        totalLiabilitiesWithCurrencyEffect: new Big(0),
        totalValuablesWithCurrencyEffect: new Big(0)
      };
    }

    const currencies: { [symbol: string]: string } = {};
    const dataGatheringItems: IDataGatheringItem[] = [];
    let firstIndex = transactionPoints.length;
    let firstTransactionPoint: TransactionPoint = null;
    let totalInterestWithCurrencyEffect = new Big(0);
    let totalLiabilitiesWithCurrencyEffect = new Big(0);
    let totalValuablesWithCurrencyEffect = new Big(0);

    for (const { currency, dataSource, symbol } of transactionPoints[
      firstIndex - 1
    ].items) {
      dataGatheringItems.push({ dataSource, symbol });

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
      dateQuery: { gte: this.startDate, lt: this.endDate }
    });

    this.dataProviderInfos = dataProviderInfos;

    const marketSymbolMap: { [date: string]: { [symbol: string]: Big } } = {};

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
        totalLiabilitiesInBaseCurrency,
        totalValuablesInBaseCurrency
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

    const historicalData: HistoricalDataItem[] = this.getHistoricalDataItems(
      accumulatedValuesByDate
    );

    const overall = this.calculateOverallPerformance(positions);

    return {
      ...overall,
      errors,
      historicalData,
      positions,
      totalInterestWithCurrencyEffect,
      totalLiabilitiesWithCurrencyEffect,
      totalValuablesWithCurrencyEffect,
      hasErrors: hasAnySymbolMetricsErrors || overall.hasErrors
    };
  }

  @LogPerformance
  public async getUnfilteredNetWorth(currency: string): Promise<Big> {
    const activities = await this.orderService.getOrders({
      userId: this.userId,
      userCurrency: currency,
      types: ['BUY', 'SELL', 'STAKE'],
      withExcludedAccounts: true
    });
    const orders = this.activitiesToPortfolioOrder(activities.activities);
    const start = orders.reduce(
      (date, order) =>
        parseDate(date.date).getTime() < parseDate(order.date).getTime()
          ? date
          : order,
      { date: orders[0].date }
    ).date;

    const end = new Date(Date.now());

    const holdings = await this.getHoldings(orders, parseDate(start), end);
    const marketMap = await this.currentRateService.getValues({
      dataGatheringItems: this.mapToDataGatheringItems(orders),
      dateQuery: { in: [end] }
    });
    const endString = format(end, DATE_FORMAT);
    const exchangeRates = await Promise.all(
      Object.keys(holdings[endString]).map(async (holding) => {
        const symbolCurrency = this.getCurrencyFromActivities(orders, holding);
        const exchangeRate =
          await this.exchangeRateDataService.toCurrencyAtDate(
            1,
            symbolCurrency,
            this.currency,
            end
          );
        return { symbolCurrency, exchangeRate };
      })
    );
    const currencyRates = exchangeRates.reduce<{ [currency: string]: number }>(
      (all, currency): { [currency: string]: number } => {
        all[currency.symbolCurrency] ??= currency.exchangeRate;
        return all;
      },
      {}
    );

    const totalInvestment = await Object.keys(holdings[endString]).reduce(
      (sum, holding) => {
        if (!holdings[endString][holding].toNumber()) {
          return sum;
        }
        const symbol = marketMap.values.find((m) => m.symbol === holding);

        if (symbol?.marketPrice === undefined) {
          Logger.warn(
            `Missing historical market data for ${holding} (${end})`,
            'PortfolioCalculator'
          );
          return sum;
        } else {
          const symbolCurrency = this.getCurrency(holding);
          const price = new Big(currencyRates[symbolCurrency]).mul(
            symbol.marketPrice
          );
          return sum.plus(new Big(price).mul(holdings[endString][holding]));
        }
      },
      new Big(0)
    );
    return totalInvestment;
  }

  @LogPerformance
  public getDataProviderInfos() {
    return this.dataProviderInfos;
  }

  @LogPerformance
  public async getDividendInBaseCurrency() {
    await this.snapshotPromise;

    return getSum(
      this.snapshot.positions.map(({ dividendInBaseCurrency }) => {
        return dividendInBaseCurrency;
      })
    );
  }

  @LogPerformance
  public async getFeesInBaseCurrency() {
    await this.snapshotPromise;

    return this.snapshot.totalFeesWithCurrencyEffect;
  }

  @LogPerformance
  public async getInterestInBaseCurrency() {
    await this.snapshotPromise;

    return this.snapshot.totalInterestWithCurrencyEffect;
  }

  @LogPerformance
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

  @LogPerformance
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

  @LogPerformance
  public async getLiabilitiesInBaseCurrency() {
    await this.snapshotPromise;

    return this.snapshot.totalLiabilitiesWithCurrencyEffect;
  }

  @LogPerformance
  public async getPerformance({ end, start }): Promise<{
    chart: HistoricalDataItem[];
    netPerformance: number;
    netPerformanceInPercentage: number;
    netPerformanceWithCurrencyEffect: number;
    netPerformanceInPercentageWithCurrencyEffect: number;
    netWorth: number;
    totalInvestment: number;
    valueWithCurrencyEffect: number;
  }> {
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

        //TODO : Extract in abstractFunction and use timeweighted for ROI + Handle total values separately
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
          // TODO: Add net worth with valuables
          // netWorth: totalCurrentValueWithCurrencyEffect
          //   .plus(totalAccountBalanceWithCurrencyEffect)
          //   .toNumber()
          // netWorth: 0
        });
      }
    }

    const last = chart.at(-1);

    return {
      chart,
      netPerformance: last?.netPerformance ?? 0,
      netPerformanceInPercentage: last?.netPerformanceInPercentage ?? 0,
      netPerformanceWithCurrencyEffect:
        last?.netPerformanceWithCurrencyEffect ?? 0,
      netPerformanceInPercentageWithCurrencyEffect:
        last?.netPerformanceInPercentageWithCurrencyEffect ?? 0,
      netWorth: last?.netWorth ?? 0,
      totalInvestment: last?.totalInvestment ?? 0,
      valueWithCurrencyEffect: last?.valueWithCurrencyEffect ?? 0
    };
  }

  @LogPerformance
  protected getHistoricalDataItems(accumulatedValuesByDate: {
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
  }): HistoricalDataItem[] {
    let previousDateString = '';
    let timeWeightedPerformancePreviousPeriod = new Big(0);
    let timeWeightedPerformancePreviousPeriodWithCurrencyEffect = new Big(0);
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

      let timeWeightedPerformanceInPercentage: number;
      let timeWeightedPerformanceInPercentageWithCurrencyEffect: number;
      ({
        timeWeightedPerformanceInPercentage,
        timeWeightedPerformanceInPercentageWithCurrencyEffect,
        previousDateString,
        timeWeightedPerformancePreviousPeriod,
        timeWeightedPerformancePreviousPeriodWithCurrencyEffect
      } = this.handleTimeWeightedPerformance(
        accumulatedValuesByDate,
        previousDateString,
        totalNetPerformanceValue,
        totalNetPerformanceValueWithCurrencyEffect,
        timeWeightedPerformancePreviousPeriod,
        timeWeightedPerformancePreviousPeriodWithCurrencyEffect,
        date
      ));

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
        valueWithCurrencyEffect: totalCurrentValueWithCurrencyEffect.toNumber(),
        timeWeightedPerformanceInPercentage,
        timeWeightedPerformanceInPercentageWithCurrencyEffect
      };
    });
  }

  @LogPerformance
  public async getSnapshot() {
    await this.snapshotPromise;

    return this.snapshot;
  }

  @LogPerformance
  protected getCurrency(symbol: string) {
    return this.getCurrencyFromActivities(this.activities, symbol);
  }

  @LogPerformance
  protected getCurrencyFromActivities(
    activities: PortfolioOrder[],
    symbol: string
  ) {
    if (!this.holdingCurrencies[symbol]) {
      this.holdingCurrencies[symbol] = activities.find(
        (a) => a.SymbolProfile.symbol === symbol
      ).SymbolProfile.currency;
    }

    return this.holdingCurrencies[symbol];
  }

  @LogPerformance
  protected computeTransactionPoints() {
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

  @LogPerformance
  protected async initialize() {
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

  @LogPerformance
  protected activitiesToPortfolioOrder(
    activities: Activity[]
  ): PortfolioOrder[] {
    return activities
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
  }

  @LogPerformance
  protected async getHoldings(
    activities: PortfolioOrder[],
    start: Date,
    end: Date
  ) {
    if (
      this.holdings &&
      Object.keys(this.holdings).some((h) =>
        isAfter(parseDate(h), subDays(end, 1))
      ) &&
      Object.keys(this.holdings).some((h) =>
        isBefore(parseDate(h), addDays(start, 1))
      )
    ) {
      return this.holdings;
    }

    this.computeHoldings(activities, start, end);
    return this.holdings;
  }

  @LogPerformance
  protected async computeHoldings(
    activities: PortfolioOrder[],
    start: Date,
    end: Date
  ) {
    const investmentByDate = this.getInvestmentByDate(activities);
    this.calculateHoldings(investmentByDate, start, end);
  }

  @LogPerformance
  protected calculateInitialHoldings(
    investmentByDate: { [date: string]: PortfolioOrder[] },
    start: Date,
    currentHoldings: { [date: string]: { [symbol: string]: Big } }
  ) {
    const preRangeTrades = Object.keys(investmentByDate)
      .filter((date) => resetHours(new Date(date)) <= start)
      .map((date) => investmentByDate[date])
      .reduce((a, b) => a.concat(b), [])
      .reduce((groupBySymbol, trade) => {
        if (!groupBySymbol[trade.SymbolProfile.symbol]) {
          groupBySymbol[trade.SymbolProfile.symbol] = [];
        }

        groupBySymbol[trade.SymbolProfile.symbol].push(trade);

        return groupBySymbol;
      }, {});

    currentHoldings[format(start, DATE_FORMAT)] = {};

    for (const symbol of Object.keys(preRangeTrades)) {
      const trades: PortfolioOrder[] = preRangeTrades[symbol];
      const startQuantity = trades.reduce((sum, trade) => {
        return sum.plus(trade.quantity.mul(getFactor(trade.type)));
      }, new Big(0));
      currentHoldings[format(start, DATE_FORMAT)][symbol] = startQuantity;
    }
  }

  @LogPerformance
  protected getInvestmentByDate(activities: PortfolioOrder[]): {
    [date: string]: PortfolioOrder[];
  } {
    return activities.reduce((groupedByDate, order) => {
      if (!groupedByDate[order.date]) {
        groupedByDate[order.date] = [];
      }

      groupedByDate[order.date].push(order);

      return groupedByDate;
    }, {});
  }

  @LogPerformance
  protected mapToDataGatheringItems(
    orders: PortfolioOrder[]
  ): IDataGatheringItem[] {
    return orders
      .map((activity) => {
        return {
          symbol: activity.SymbolProfile.symbol,
          dataSource: activity.SymbolProfile.dataSource
        };
      })
      .filter(
        (gathering, i, arr) =>
          arr.findIndex((t) => t.symbol === gathering.symbol) === i
      );
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

  public getTransactionPoints() {
    return this.transactionPoints;
  }

  public async getValuablesInBaseCurrency() {
    await this.snapshotPromise;

    return this.snapshot.totalValuablesWithCurrencyEffect;
  }

  private calculateHoldings(
    investmentByDate: { [date: string]: PortfolioOrder[] },
    start: Date,
    end: Date
  ) {
    const transactionDates = Object.keys(investmentByDate).sort();
    const dates = eachDayOfInterval({ start, end }, { step: 1 })
      .map((date) => {
        return resetHours(date);
      })
      .sort((a, b) => a.getTime() - b.getTime());
    const currentHoldings: { [date: string]: { [symbol: string]: Big } } = {};

    this.calculateInitialHoldings(investmentByDate, start, currentHoldings);

    for (let i = 1; i < dates.length; i++) {
      const dateString = format(dates[i], DATE_FORMAT);
      const previousDateString = format(dates[i - 1], DATE_FORMAT);
      if (transactionDates.some((d) => d === dateString)) {
        const holdings = { ...currentHoldings[previousDateString] };
        investmentByDate[dateString].forEach((trade) => {
          holdings[trade.SymbolProfile.symbol] ??= new Big(0);
          holdings[trade.SymbolProfile.symbol] = holdings[
            trade.SymbolProfile.symbol
          ].plus(trade.quantity.mul(getFactor(trade.type)));
        });
        currentHoldings[dateString] = holdings;
      } else {
        currentHoldings[dateString] = currentHoldings[previousDateString];
      }
    }

    this.holdings = currentHoldings;
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

  private handleTimeWeightedPerformance(
    accumulatedValuesByDate: {
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
    },
    previousDateString: string,
    totalNetPerformanceValue: Big,
    totalNetPerformanceValueWithCurrencyEffect: Big,
    timeWeightedPerformancePreviousPeriod: Big,
    timeWeightedPerformancePreviousPeriodWithCurrencyEffect: Big,
    date: string
  ): {
    timeWeightedPerformanceInPercentage: number;
    timeWeightedPerformanceInPercentageWithCurrencyEffect: number;
    previousDateString: string;
    timeWeightedPerformancePreviousPeriod: Big;
    timeWeightedPerformancePreviousPeriodWithCurrencyEffect: Big;
  } {
    const previousValues = accumulatedValuesByDate[previousDateString] ?? {
      totalNetPerformanceValue: new Big(0),
      totalNetPerformanceValueWithCurrencyEffect: new Big(0),
      totalTimeWeightedInvestmentValue: new Big(0),
      totalTimeWeightedInvestmentValueWithCurrencyEffect: new Big(0)
    };

    const timeWeightedPerformanceCurrentPeriod = this.divideByOrZero(
      (div) =>
        totalNetPerformanceValue
          .minus(previousValues.totalNetPerformanceValue)
          .div(div),
      previousValues.totalTimeWeightedInvestmentValue
    );
    const timeWeightedPerformanceCurrentPeriodWithCurrencyEffect =
      this.divideByOrZero(
        (div) =>
          totalNetPerformanceValueWithCurrencyEffect
            .minus(previousValues.totalNetPerformanceValueWithCurrencyEffect)
            .div(div),
        previousValues.totalTimeWeightedInvestmentValueWithCurrencyEffect
      );

    const timeWeightedPerformanceInPercentage = new Big(1)
      .plus(timeWeightedPerformancePreviousPeriod)
      .mul(new Big(1).plus(timeWeightedPerformanceCurrentPeriod))
      .minus(1);
    const timeWeightedPerformanceInPercentageWithCurrencyEffect = new Big(1)
      .plus(timeWeightedPerformancePreviousPeriodWithCurrencyEffect)
      .mul(
        new Big(1).plus(timeWeightedPerformanceCurrentPeriodWithCurrencyEffect)
      )
      .minus(1);

    return {
      timeWeightedPerformanceInPercentage:
        timeWeightedPerformanceInPercentage.toNumber(),
      timeWeightedPerformanceInPercentageWithCurrencyEffect:
        timeWeightedPerformanceInPercentageWithCurrencyEffect.toNumber(),
      previousDateString: date,
      timeWeightedPerformancePreviousPeriod:
        timeWeightedPerformanceInPercentage,
      timeWeightedPerformancePreviousPeriodWithCurrencyEffect:
        timeWeightedPerformanceInPercentageWithCurrencyEffect
    };
  }

  private divideByOrZero(fn: (big: Big) => Big, divisor: Big): Big {
    if (divisor.eq(0)) {
      return new Big(0);
    } else {
      return fn(divisor);
    }
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
    marketSymbolMap: { [date: string]: { [symbol: string]: Big } };
    start: Date;
  } & AssetProfileIdentifier): SymbolMetrics;

  protected abstract calculateOverallPerformance(
    positions: TimelinePosition[]
  ): PortfolioSnapshot;

  protected abstract getPerformanceCalculationType(): PerformanceCalculationType;
}
