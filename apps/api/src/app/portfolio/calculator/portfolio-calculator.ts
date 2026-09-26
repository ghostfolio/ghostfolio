import { CurrentRateService } from '@ghostfolio/api/app/portfolio/current-rate.service';
import { PortfolioSnapshotComputationError } from '@ghostfolio/api/app/portfolio/errors/portfolio-snapshot-computation.error';
import { AccumulatedValues } from '@ghostfolio/api/app/portfolio/interfaces/accumulated-values.interface';
import { HoldingBalance } from '@ghostfolio/api/app/portfolio/interfaces/holding-balance.interface';
import { HoldingBalancesAtDate } from '@ghostfolio/api/app/portfolio/interfaces/holding-balances-at-date.interface';
import { HoldingPerformance } from '@ghostfolio/api/app/portfolio/interfaces/holding-performance.interface';
import { HoldingValuationItem } from '@ghostfolio/api/app/portfolio/interfaces/holding-valuation-item.interface';
import { HoldingValuation } from '@ghostfolio/api/app/portfolio/interfaces/holding-valuation.interface';
import { PortfolioCalculatorActivityItem } from '@ghostfolio/api/app/portfolio/interfaces/portfolio-calculator-activity-item.interface';
import { PortfolioCalculatorActivity } from '@ghostfolio/api/app/portfolio/interfaces/portfolio-calculator-activity.interface';
import { PortfolioCalculatorHolding } from '@ghostfolio/api/app/portfolio/interfaces/portfolio-calculator-holding.interface';
import { PortfolioSnapshotValue } from '@ghostfolio/api/app/portfolio/interfaces/snapshot-value.interface';
import { PerformancePercentages } from '@ghostfolio/api/app/portfolio/types/performance-percentages.type';
import { RedisCacheService } from '@ghostfolio/api/app/redis-cache/redis-cache.service';
import { getFactor } from '@ghostfolio/api/helper/portfolio.helper';
import { LogPerformance } from '@ghostfolio/api/interceptors/performance-logging/performance-logging.interceptor';
import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';
import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.service';
import { DataGatheringItem } from '@ghostfolio/api/services/interfaces/interfaces';
import { PortfolioSnapshotService } from '@ghostfolio/api/services/queues/portfolio-snapshot/portfolio-snapshot.service';
import { getIntervalFromDateRange } from '@ghostfolio/common/calculation-helper';
import {
  INVESTMENT_ACTIVITY_TYPES,
  PORTFOLIO_SNAPSHOT_PROCESS_JOB_NAME,
  PORTFOLIO_SNAPSHOT_PROCESS_JOB_OPTIONS,
  PORTFOLIO_SNAPSHOT_COMPUTATION_QUEUE_PRIORITY_HIGH,
  PORTFOLIO_SNAPSHOT_COMPUTATION_QUEUE_PRIORITY_LOW
} from '@ghostfolio/common/config';
import { SubscriptionType } from '@ghostfolio/common/enums';
import {
  DATE_FORMAT,
  getAssetProfileIdentifier,
  getSum,
  parseDate,
  resetHours
} from '@ghostfolio/common/helper';
import {
  Activity,
  AssetProfileIdentifier,
  DataProviderInfo,
  Filter,
  HistoricalDataItem,
  InvestmentItem,
  ResponseError
} from '@ghostfolio/common/interfaces';
import {
  PortfolioSnapshot,
  PortfolioSnapshotHolding
} from '@ghostfolio/common/models';
import { GroupBy } from '@ghostfolio/common/types';
import { PerformanceCalculationType } from '@ghostfolio/common/types/performance-calculation-type.type';

import { Logger } from '@nestjs/common';
import { AssetSubClass, DataSource } from '@prisma/client';
import { Big } from 'big.js';
import { plainToClass } from 'class-transformer';
import {
  addMilliseconds,
  differenceInDays,
  eachDayOfInterval,
  eachYearOfInterval,
  endOfDay,
  endOfYear,
  format,
  isAfter,
  isBefore,
  isFuture,
  isPast,
  isWithinInterval,
  min,
  startOfDay,
  startOfYear,
  subDays
} from 'date-fns';
import { groupBy, sortBy, uniqBy } from 'lodash';

export abstract class PortfolioCalculator {
  protected static readonly ENABLE_LOGGING = false;

  private static readonly MAX_INITIALIZATION_ATTEMPTS = 3;

  protected readonly logger = new Logger(PortfolioCalculator.name);

  protected accountBalanceItems: HistoricalDataItem[];
  protected activities: PortfolioCalculatorActivity[];

  protected activitiesByAssetProfileIdentifier: {
    [assetProfileIdentifier: string]: PortfolioCalculatorActivity[];
  };

  private configurationService: ConfigurationService;
  private currency: string;
  private currentRateService: CurrentRateService;
  private dataProviderInfos: DataProviderInfo[];
  private endDate: Date;
  private exchangeRateDataService: ExchangeRateDataService;
  private filters: Filter[];
  private holdingBalancesByDate: HoldingBalancesAtDate[];
  private portfolioSnapshotService: PortfolioSnapshotService;
  private redisCacheService: RedisCacheService;
  private snapshot: PortfolioSnapshot;
  private snapshotPromise: Promise<void>;
  private startDate: Date;
  private subscriptionType?: SubscriptionType;
  private usePortfolioSnapshotCache: boolean;
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
    usePortfolioSnapshotCache = true,
    subscriptionType,
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
    usePortfolioSnapshotCache?: boolean;
    subscriptionType?: SubscriptionType;
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
          assetProfile,
          date,
          feeInAssetProfileCurrency,
          feeInBaseCurrency,
          quantity,
          tags = [],
          type,
          unitPriceInAssetProfileCurrency
        }) => {
          if (isBefore(date, dateOfFirstActivity)) {
            dateOfFirstActivity = date;
          }

          if (isFuture(date)) {
            // Adapt date to today if activity is in future (e.g. liability)
            // to include it in the interval
            date = endOfDay(new Date());
          }

          return {
            assetProfile,
            tags,
            type,
            date: format(date, DATE_FORMAT),
            fee: new Big(feeInAssetProfileCurrency),
            feeInBaseCurrency: new Big(feeInBaseCurrency),
            quantity: new Big(quantity),
            unitPrice: new Big(unitPriceInAssetProfileCurrency)
          };
        }
      )
      .sort((a, b) => {
        return a.date?.localeCompare(b.date);
      });

    this.activitiesByAssetProfileIdentifier = groupBy(
      this.activities,
      ({ assetProfile }) => {
        return getAssetProfileIdentifier(assetProfile);
      }
    );

    this.portfolioSnapshotService = portfolioSnapshotService;
    this.redisCacheService = redisCacheService;
    this.usePortfolioSnapshotCache = usePortfolioSnapshotCache;
    this.subscriptionType = subscriptionType;
    this.userId = userId;

    const { endDate, startDate } = getIntervalFromDateRange({
      dateRange: 'max',
      startDate: subDays(dateOfFirstActivity, 1)
    });

    this.endDate = endOfDay(endDate);
    this.startDate = startOfDay(startDate);

    this.computeHoldingBalancesByDate();

    this.snapshotPromise = this.usePortfolioSnapshotCache
      ? this.initialize()
      : this.computeSnapshot().then((snapshot) => {
          this.snapshot = snapshot;
        });

    // Mark the rejection as handled to prevent an unhandled promise rejection
    // in case the snapshot promise is never awaited. Consumers awaiting it
    // still receive the error.
    this.snapshotPromise.catch(() => undefined);
  }

  protected abstract calculateOverallPerformance(
    positions: PortfolioCalculatorHolding[]
  ): PortfolioSnapshot;

  protected abstract calculatePerformancePercentages({
    accumulatedValuesByDate
  }: {
    accumulatedValuesByDate: { [date: string]: AccumulatedValues };
  }): { [date: string]: PerformancePercentages };

  protected abstract calculatePerformancePercentagesForDateRange({
    historicalDataItems
  }: {
    historicalDataItems: HistoricalDataItem[];
  }): { [date: string]: PerformancePercentages };

  @LogPerformance
  public async computeSnapshot(): Promise<PortfolioSnapshot> {
    const latestHoldingBalances = this.holdingBalancesByDate.at(-1);

    const holdingBalancesByDate = this.holdingBalancesByDate?.filter(
      ({ date }) => {
        return isBefore(parseDate(date), this.endDate);
      }
    );

    if (!holdingBalancesByDate.length) {
      return {
        activitiesCount: 0,
        createdAt: new Date(),
        currentValueInBaseCurrency: new Big(0),
        dividendYieldPercent: new Big(0),
        dividendYieldPercentWithCurrencyEffect: new Big(0),
        errors: [],
        hasErrors: false,
        historicalData: [],
        positions: [],
        totalCashInBaseCurrency: new Big(0),
        totalFeesWithCurrencyEffect: new Big(0),
        totalInterestWithCurrencyEffect: new Big(0),
        totalInvestment: new Big(0),
        totalInvestmentWithCurrencyEffect: new Big(0),
        totalLiabilitiesWithCurrencyEffect: new Big(0)
      };
    }

    const cashAssetProfileIdentifiers = new Set<string>();
    const currencies: { [assetProfileIdentifier: string]: string } = {};
    const dataGatheringItems: DataGatheringItem[] = [];
    let totalCashInBaseCurrency = new Big(0);
    let totalInterestWithCurrencyEffect = new Big(0);
    let totalLiabilitiesWithCurrencyEffect = new Big(0);

    for (const {
      assetSubClass,
      currency,
      dataSource,
      symbol
    } of holdingBalancesByDate.at(-1).holdings) {
      // Gather data for all assets except CASH
      if (assetSubClass !== 'CASH') {
        dataGatheringItems.push({
          dataSource,
          symbol
        });
      }

      currencies[getAssetProfileIdentifier({ dataSource, symbol })] = currency;
    }

    const exchangeRatesByCurrency =
      await this.exchangeRateDataService.getExchangeRatesByCurrency({
        currencies: Array.from(new Set(Object.values(currencies))),
        endDate: this.endDate,
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
      },
      subscriptionType: this.subscriptionType
    });

    this.dataProviderInfos = dataProviderInfos;

    const marketSymbolMap: {
      [date: string]: { [assetProfileIdentifier: string]: Big };
    } = {};

    const latestMarketPriceMap: {
      [assetProfileIdentifier: string]: { date: string; price: Big };
    } = {};

    for (const marketSymbol of marketSymbols) {
      const date = format(marketSymbol.date, DATE_FORMAT);

      if (!marketSymbolMap[date]) {
        marketSymbolMap[date] = {};
      }

      if (marketSymbol.marketPrice) {
        const identifier = getAssetProfileIdentifier(marketSymbol);
        const price = new Big(marketSymbol.marketPrice);

        marketSymbolMap[date][identifier] = price;

        if (
          !latestMarketPriceMap[identifier] ||
          latestMarketPriceMap[identifier].date < date
        ) {
          latestMarketPriceMap[identifier] = { date, price };
        }
      }
    }

    const endDateString = format(this.endDate, DATE_FORMAT);

    if (!marketSymbolMap[endDateString]) {
      marketSymbolMap[endDateString] = {};
    }

    for (const identifier of Object.keys(latestMarketPriceMap)) {
      if (!marketSymbolMap[endDateString][identifier]) {
        marketSymbolMap[endDateString][identifier] =
          latestMarketPriceMap[identifier].price;
      }
    }

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

    const errors: ResponseError['errors'] = [];
    let hasAnyHoldingPerformanceErrors = false;

    const positions: PortfolioCalculatorHolding[] = [];

    const accumulatedValuesByDate: {
      [date: string]: AccumulatedValues;
    } = {};

    const valuesByAssetProfileIdentifier: {
      [assetProfileIdentifier: string]: {
        averageInvestmentValues: { [date: string]: Big };
        averageInvestmentValuesWithCurrencyEffect: { [date: string]: Big };
        currentValues: { [date: string]: Big };
        currentValuesWithCurrencyEffect: { [date: string]: Big };
        investmentValuesAccumulated: { [date: string]: Big };
        investmentValuesAccumulatedWithCurrencyEffect: { [date: string]: Big };
        investmentValuesWithCurrencyEffect: { [date: string]: Big };
        netPerformanceValues: { [date: string]: Big };
        netPerformanceValuesWithCurrencyEffect: { [date: string]: Big };
        netWorthValuesWithCurrencyEffect: { [date: string]: Big };
      };
    } = {};

    for (const item of latestHoldingBalances.holdings) {
      const assetProfileIdentifier = getAssetProfileIdentifier(item);

      const marketPriceInBaseCurrency = (
        marketSymbolMap[endDateString]?.[assetProfileIdentifier] ??
        item.averagePrice
      ).mul(
        exchangeRatesByCurrency[`${item.currency}${this.currency}`]?.[
          endDateString
        ] ?? 1
      );

      const valueInBaseCurrency = marketPriceInBaseCurrency.mul(item.quantity);

      const isCashInBaseCurrency =
        item.assetSubClass === AssetSubClass.CASH &&
        item.currency === this.currency &&
        item.symbol === this.currency;

      const {
        averageInvestment,
        averageInvestmentValues,
        averageInvestmentValuesWithCurrencyEffect,
        averageInvestmentWithCurrencyEffect,
        currentValues,
        currentValuesWithCurrencyEffect,
        dividendYieldPercent,
        dividendYieldPercentWithCurrencyEffect,
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
        totalDividend,
        totalDividendInBaseCurrency,
        totalInterestInBaseCurrency,
        totalInvestment,
        totalInvestmentWithCurrencyEffect,
        totalLiabilitiesInBaseCurrency
      } = this.getHoldingPerformance({
        chartDates,
        marketSymbolMap,
        dataSource: item.dataSource,
        end: this.endDate,
        exchangeRates:
          exchangeRatesByCurrency[`${item.currency}${this.currency}`],
        start: this.startDate,
        symbol: item.symbol
      });

      hasAnyHoldingPerformanceErrors =
        hasAnyHoldingPerformanceErrors || hasErrors;

      // Cash in the base currency cannot generate a currency effect and thus
      // contributes nothing but its balance to the performance calculation. It
      // is therefore excluded from the value and the investment, while still
      // contributing to the net worth.
      valuesByAssetProfileIdentifier[assetProfileIdentifier] =
        isCashInBaseCurrency
          ? {
              averageInvestmentValues: {},
              averageInvestmentValuesWithCurrencyEffect: {},
              currentValues: {},
              currentValuesWithCurrencyEffect: {},
              investmentValuesAccumulated: {},
              investmentValuesAccumulatedWithCurrencyEffect: {},
              investmentValuesWithCurrencyEffect: {},
              netPerformanceValues: {},
              netPerformanceValuesWithCurrencyEffect: {},
              netWorthValuesWithCurrencyEffect: currentValuesWithCurrencyEffect
            }
          : {
              averageInvestmentValues,
              averageInvestmentValuesWithCurrencyEffect,
              currentValues,
              currentValuesWithCurrencyEffect,
              investmentValuesAccumulated,
              investmentValuesAccumulatedWithCurrencyEffect,
              investmentValuesWithCurrencyEffect,
              netPerformanceValues,
              netPerformanceValuesWithCurrencyEffect,
              netWorthValuesWithCurrencyEffect: currentValuesWithCurrencyEffect
            };

      positions.push({
        averageInvestment,
        averageInvestmentWithCurrencyEffect,
        dividendYieldPercent,
        dividendYieldPercentWithCurrencyEffect,
        activitiesCount: item.activitiesCount,
        averagePrice: item.averagePrice,
        currency: item.currency,
        dataSource: item.dataSource,
        dateOfFirstActivity: item.dateOfFirstActivity,
        dividend: totalDividend,
        dividendInBaseCurrency: totalDividendInBaseCurrency,
        fee: item.fee,
        feeInBaseCurrency: item.feeInBaseCurrency,
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
        includeInHoldings: item.includeInHoldings,
        includeInPerformance: !isCashInBaseCurrency,
        investment: totalInvestment,
        investmentWithCurrencyEffect: totalInvestmentWithCurrencyEffect,
        marketPrice:
          marketSymbolMap[endDateString]?.[
            assetProfileIdentifier
          ]?.toNumber() ?? 1,
        marketPriceInBaseCurrency: marketPriceInBaseCurrency?.toNumber() ?? 1,
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
        valueInBaseCurrency
      });

      if (item.assetSubClass === AssetSubClass.CASH) {
        cashAssetProfileIdentifiers.add(assetProfileIdentifier);

        totalCashInBaseCurrency =
          totalCashInBaseCurrency.plus(valueInBaseCurrency);
      }

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

    const assetProfileIdentifiers = Object.keys(valuesByAssetProfileIdentifier);

    for (const dateString of chartDates) {
      for (const assetProfileIdentifier of assetProfileIdentifiers) {
        const assetProfileValues =
          valuesByAssetProfileIdentifier[assetProfileIdentifier];

        const currentValue =
          assetProfileValues.currentValues?.[dateString] ?? new Big(0);

        const currentValueWithCurrencyEffect =
          assetProfileValues.currentValuesWithCurrencyEffect?.[dateString] ??
          new Big(0);

        const investmentValueAccumulated =
          assetProfileValues.investmentValuesAccumulated?.[dateString] ??
          new Big(0);

        const investmentValueAccumulatedWithCurrencyEffect =
          assetProfileValues.investmentValuesAccumulatedWithCurrencyEffect?.[
            dateString
          ] ?? new Big(0);

        const investmentValueWithCurrencyEffect =
          assetProfileValues.investmentValuesWithCurrencyEffect?.[dateString] ??
          new Big(0);

        const netPerformanceValue =
          assetProfileValues.netPerformanceValues?.[dateString] ?? new Big(0);

        const netPerformanceValueWithCurrencyEffect =
          assetProfileValues.netPerformanceValuesWithCurrencyEffect?.[
            dateString
          ] ?? new Big(0);

        const netWorthValueWithCurrencyEffect =
          assetProfileValues.netWorthValuesWithCurrencyEffect?.[dateString] ??
          new Big(0);

        const averageInvestmentValue =
          assetProfileValues.averageInvestmentValues?.[dateString] ??
          new Big(0);

        const averageInvestmentValueWithCurrencyEffect =
          assetProfileValues.averageInvestmentValuesWithCurrencyEffect?.[
            dateString
          ] ?? new Big(0);

        accumulatedValuesByDate[dateString] = {
          investmentValueWithCurrencyEffect: (
            accumulatedValuesByDate[dateString]
              ?.investmentValueWithCurrencyEffect ?? new Big(0)
          ).add(investmentValueWithCurrencyEffect),
          totalAverageInvestmentValue: (
            accumulatedValuesByDate[dateString]?.totalAverageInvestmentValue ??
            new Big(0)
          ).add(averageInvestmentValue),
          totalAverageInvestmentValueWithCurrencyEffect: (
            accumulatedValuesByDate[dateString]
              ?.totalAverageInvestmentValueWithCurrencyEffect ?? new Big(0)
          ).add(averageInvestmentValueWithCurrencyEffect),
          totalCashValueWithCurrencyEffect: (
            accumulatedValuesByDate[dateString]
              ?.totalCashValueWithCurrencyEffect ?? new Big(0)
          ).add(
            cashAssetProfileIdentifiers.has(assetProfileIdentifier)
              ? netWorthValueWithCurrencyEffect
              : new Big(0)
          ),
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
          totalNetWorthValueWithCurrencyEffect: (
            accumulatedValuesByDate[dateString]
              ?.totalNetWorthValueWithCurrencyEffect ?? new Big(0)
          ).add(netWorthValueWithCurrencyEffect)
        };
      }
    }

    const performancePercentagesByDate = this.calculatePerformancePercentages({
      accumulatedValuesByDate
    });

    const historicalData: HistoricalDataItem[] = Object.entries(
      accumulatedValuesByDate
    ).map(([date, values]) => {
      const {
        investmentValueWithCurrencyEffect,
        totalCashValueWithCurrencyEffect,
        totalCurrentValue,
        totalCurrentValueWithCurrencyEffect,
        totalInvestmentValue,
        totalInvestmentValueWithCurrencyEffect,
        totalNetPerformanceValue,
        totalNetPerformanceValueWithCurrencyEffect,
        totalNetWorthValueWithCurrencyEffect
      } = values;

      return {
        ...performancePercentagesByDate[date],
        date,
        investmentValueWithCurrencyEffect:
          investmentValueWithCurrencyEffect.toNumber(),
        netPerformance: totalNetPerformanceValue.toNumber(),
        netPerformanceWithCurrencyEffect:
          totalNetPerformanceValueWithCurrencyEffect.toNumber(),
        netWorth: totalNetWorthValueWithCurrencyEffect.toNumber(),
        totalCashInBaseCurrency: totalCashValueWithCurrencyEffect.toNumber(),
        totalInvestment: totalInvestmentValue.toNumber(),
        totalInvestmentValueWithCurrencyEffect:
          totalInvestmentValueWithCurrencyEffect.toNumber(),
        value: totalCurrentValue.toNumber(),
        valueWithCurrencyEffect: totalCurrentValueWithCurrencyEffect.toNumber()
      };
    });

    const overall = this.calculateOverallPerformance(positions);

    const positionsIncludedInHoldings = positions
      .filter(({ includeInHoldings }) => {
        return includeInHoldings;
      })
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      .map(({ includeInHoldings, includeInPerformance, ...rest }) => {
        return rest;
      });

    return {
      ...overall,
      errors,
      historicalData,
      totalCashInBaseCurrency,
      totalInterestWithCurrencyEffect,
      totalLiabilitiesWithCurrencyEffect,
      hasErrors: hasAnyHoldingPerformanceErrors || overall.hasErrors,
      positions: positionsIncludedInHoldings
    };
  }

  protected getActivitiesWithMarketPrices({
    activities,
    assetProfile,
    chartDates,
    endDateString,
    marketSymbolMap,
    startDateString,
    unitPriceAtEndDate,
    unitPriceAtStartDate
  }: {
    activities: PortfolioCalculatorActivityItem[];
    assetProfile: PortfolioCalculatorActivityItem['assetProfile'];
    chartDates: string[];
    endDateString: string;
    marketSymbolMap: {
      [date: string]: { [assetProfileIdentifier: string]: Big };
    };
    startDateString: string;
    unitPriceAtEndDate: Big;
    unitPriceAtStartDate: Big;
  }): PortfolioCalculatorActivityItem[] {
    if (activities.length <= 0) {
      return [];
    }

    const assetProfileIdentifier = getAssetProfileIdentifier(assetProfile);
    const dateStringOfFirstActivity = activities[0].date;

    // Copy the items as they are enriched below. A shallow copy is sufficient
    // because only top-level properties are written.
    const activitiesWithMarketPrices = activities.map((activity) => {
      return { ...activity };
    });

    // Add a synthetic activity at the start and the end date
    activitiesWithMarketPrices.push({
      assetProfile,
      date: startDateString,
      fee: new Big(0),
      feeInBaseCurrency: new Big(0),
      itemType: 'start',
      quantity: new Big(0),
      type: 'BUY',
      unitPrice: unitPriceAtStartDate
    });

    activitiesWithMarketPrices.push({
      assetProfile,
      date: endDateString,
      fee: new Big(0),
      feeInBaseCurrency: new Big(0),
      itemType: 'end',
      quantity: new Big(0),
      type: 'BUY',
      unitPrice: unitPriceAtEndDate
    });

    // Fall back to the unit price of the most recent BUY / SELL activity for
    // the chart dates before the first known market price of the symbol
    let lastActivityUnitPrice: Big | undefined;
    let lastMarketPrice: Big | undefined;

    const activitiesByDate: {
      [date: string]: PortfolioCalculatorActivityItem[];
    } = {};

    for (const activity of activitiesWithMarketPrices) {
      activitiesByDate[activity.date] = activitiesByDate[activity.date] ?? [];
      activitiesByDate[activity.date].push(activity);
    }

    for (const dateString of chartDates) {
      if (dateString < startDateString) {
        continue;
      } else if (dateString > endDateString) {
        break;
      }

      const activitiesOfDate = activitiesByDate[dateString];

      if (!lastMarketPrice && activitiesOfDate?.length > 0) {
        for (const { itemType, type, unitPrice } of activitiesOfDate) {
          if (!itemType && ['BUY', 'SELL'].includes(type)) {
            lastActivityUnitPrice = unitPrice;
          }
        }
      }

      const marketPrice = marketSymbolMap[dateString]?.[assetProfileIdentifier];

      const unitPrice =
        marketPrice ??
        lastMarketPrice ??
        lastActivityUnitPrice ??
        unitPriceAtEndDate;

      if (activitiesOfDate?.length > 0) {
        for (const activity of activitiesOfDate) {
          activity.unitPriceFromMarketData = unitPrice;
        }
      } else if (dateString >= dateStringOfFirstActivity) {
        activitiesWithMarketPrices.push({
          assetProfile,
          unitPrice,
          date: dateString,
          fee: new Big(0),
          feeInBaseCurrency: new Big(0),
          quantity: new Big(0),
          type: 'BUY',
          unitPriceFromMarketData: unitPrice
        });
      }

      if (marketPrice) {
        lastMarketPrice = marketPrice;
      }
    }

    // Sort the activities so that the start and end placeholder activities
    // are at the correct position
    return sortBy(activitiesWithMarketPrices, ({ date, itemType }) => {
      let sortIndex = new Date(date);

      if (itemType === 'end') {
        sortIndex = addMilliseconds(sortIndex, 1);
      } else if (itemType === 'start') {
        sortIndex = addMilliseconds(sortIndex, -1);
      }

      return sortIndex.getTime();
    });
  }

  public getDataProviderInfos() {
    return this.dataProviderInfos;
  }

  public async getDividendInBaseCurrency() {
    await this.snapshotPromise;

    return this.getDividendInBaseCurrencyOfHoldings(this.snapshot.positions);
  }

  protected getDividendInBaseCurrencyOfHoldings(
    holdings: PortfolioSnapshotHolding[]
  ) {
    return getSum(
      holdings.map(({ dividendInBaseCurrency }) => {
        return dividendInBaseCurrency;
      })
    );
  }

  protected getEmptyHoldingPerformance(): HoldingPerformance {
    return {
      averageInvestment: new Big(0),
      averageInvestmentValues: {},
      averageInvestmentValuesWithCurrencyEffect: {},
      averageInvestmentWithCurrencyEffect: new Big(0),
      currentValues: {},
      currentValuesWithCurrencyEffect: {},
      dividendYieldPercent: new Big(0),
      dividendYieldPercentWithCurrencyEffect: new Big(0),
      grossPerformance: new Big(0),
      grossPerformancePercentage: new Big(0),
      grossPerformancePercentageWithCurrencyEffect: new Big(0),
      grossPerformanceWithCurrencyEffect: new Big(0),
      hasErrors: false,
      investmentValuesAccumulated: {},
      investmentValuesAccumulatedWithCurrencyEffect: {},
      investmentValuesWithCurrencyEffect: {},
      netPerformance: new Big(0),
      netPerformancePercentage: new Big(0),
      netPerformancePercentageWithCurrencyEffectMap: {},
      netPerformanceValues: {},
      netPerformanceValuesWithCurrencyEffect: {},
      netPerformanceWithCurrencyEffectMap: {},
      totalDividend: new Big(0),
      totalDividendInBaseCurrency: new Big(0),
      totalInterestInBaseCurrency: new Big(0),
      totalInvestment: new Big(0),
      totalInvestmentWithCurrencyEffect: new Big(0),
      totalLiabilitiesInBaseCurrency: new Big(0)
    };
  }

  public async getFeesInBaseCurrency() {
    await this.snapshotPromise;

    return this.snapshot.totalFeesWithCurrencyEffect;
  }

  public getHoldingBalancesByDate() {
    return this.holdingBalancesByDate;
  }

  protected abstract getHoldingPerformance({
    chartDates,
    dataSource,
    end,
    exchangeRates,
    marketSymbolMap,
    start,
    symbol
  }: {
    chartDates: string[];
    end: Date;
    exchangeRates: { [dateString: string]: number };
    marketSymbolMap: {
      [date: string]: { [assetProfileIdentifier: string]: Big };
    };
    start: Date;
  } & AssetProfileIdentifier): HoldingPerformance;

  protected getHoldingValuation({
    activities,
    exchangeRates,
    unitPriceAtStartDate
  }: {
    activities: PortfolioCalculatorActivityItem[];
    exchangeRates: { [dateString: string]: number };
    unitPriceAtStartDate: Big | undefined;
  }): HoldingValuation {
    const currentExchangeRate = exchangeRates[format(new Date(), DATE_FORMAT)];
    const currentValues: { [date: string]: Big } = {};
    const currentValuesWithCurrencyEffect: { [date: string]: Big } = {};
    let fees = new Big(0);
    let feesAtStartDate = new Big(0);
    let feesAtStartDateWithCurrencyEffect = new Big(0);
    let feesWithCurrencyEffect = new Big(0);
    let grossPerformance = new Big(0);
    let grossPerformanceWithCurrencyEffect = new Big(0);
    let grossPerformanceAtStartDate = new Big(0);
    let grossPerformanceAtStartDateWithCurrencyEffect = new Big(0);
    let grossPerformanceFromSells = new Big(0);
    let grossPerformanceFromSellsWithCurrencyEffect = new Big(0);
    let initialValue: Big;
    const investmentValuesAccumulated: { [date: string]: Big } = {};

    const investmentValuesAccumulatedWithCurrencyEffect: {
      [date: string]: Big;
    } = {};

    const investmentValuesWithCurrencyEffect: { [date: string]: Big } = {};
    const items: HoldingValuationItem[] = [];
    let lastAveragePrice = new Big(0);
    let lastAveragePriceWithCurrencyEffect = new Big(0);
    const netPerformanceValues: { [date: string]: Big } = {};
    const netPerformanceValuesWithCurrencyEffect: { [date: string]: Big } = {};
    let totalInvestment = new Big(0);
    let totalInvestmentFromBuyTransactions = new Big(0);
    let totalInvestmentFromBuyTransactionsWithCurrencyEffect = new Big(0);
    let totalInvestmentWithCurrencyEffect = new Big(0);
    let totalQuantity = new Big(0);
    let totalQuantityFromBuyTransactions = new Big(0);

    const indexOfStartActivity = activities.findIndex(({ itemType }) => {
      return itemType === 'start';
    });

    const indexOfEndActivity = activities.findIndex(({ itemType }) => {
      return itemType === 'end';
    });

    for (let i = 0; i < activities.length; i += 1) {
      const activity = activities[i];

      if (PortfolioCalculator.ENABLE_LOGGING) {
        console.log();
        console.log();
        console.log(
          i + 1,
          activity.date,
          activity.type,
          activity.itemType ? `(${activity.itemType})` : ''
        );
      }

      const exchangeRateAtActivityDate = exchangeRates[activity.date];

      if (activity.itemType === 'start') {
        // Take the unit price of the activity as the market price if there are no
        // activities of this symbol before the start date
        activity.unitPrice =
          indexOfStartActivity === 0
            ? activities[i + 1]?.unitPrice
            : unitPriceAtStartDate;
      }

      if (activity.fee) {
        activity.feeInBaseCurrency = activity.fee.mul(currentExchangeRate ?? 1);
        activity.feeInBaseCurrencyWithCurrencyEffect = activity.fee.mul(
          exchangeRateAtActivityDate ?? 1
        );
      }

      const unitPrice = ['BUY', 'SELL'].includes(activity.type)
        ? activity.unitPrice
        : activity.unitPriceFromMarketData;

      if (unitPrice) {
        activity.unitPriceInBaseCurrency = unitPrice.mul(
          currentExchangeRate ?? 1
        );

        activity.unitPriceInBaseCurrencyWithCurrencyEffect = unitPrice.mul(
          exchangeRateAtActivityDate ?? 1
        );
      }

      const marketPriceInBaseCurrency =
        activity.unitPriceFromMarketData?.mul(currentExchangeRate ?? 1) ??
        new Big(0);
      const marketPriceInBaseCurrencyWithCurrencyEffect =
        activity.unitPriceFromMarketData?.mul(
          exchangeRateAtActivityDate ?? 1
        ) ?? new Big(0);

      const valueOfInvestmentBeforeTransaction = totalQuantity.mul(
        marketPriceInBaseCurrency
      );

      const valueOfInvestmentBeforeTransactionWithCurrencyEffect =
        totalQuantity.mul(marketPriceInBaseCurrencyWithCurrencyEffect);

      let transactionInvestment = new Big(0);
      let transactionInvestmentWithCurrencyEffect = new Big(0);

      if (activity.type === 'BUY') {
        transactionInvestment = activity.quantity
          .mul(activity.unitPriceInBaseCurrency)
          .mul(getFactor(activity.type));

        transactionInvestmentWithCurrencyEffect = activity.quantity
          .mul(activity.unitPriceInBaseCurrencyWithCurrencyEffect)
          .mul(getFactor(activity.type));

        totalQuantityFromBuyTransactions =
          totalQuantityFromBuyTransactions.plus(activity.quantity);

        totalInvestmentFromBuyTransactions =
          totalInvestmentFromBuyTransactions.plus(transactionInvestment);

        totalInvestmentFromBuyTransactionsWithCurrencyEffect =
          totalInvestmentFromBuyTransactionsWithCurrencyEffect.plus(
            transactionInvestmentWithCurrencyEffect
          );
      } else if (activity.type === 'SELL') {
        if (totalQuantity.gt(0)) {
          const remainingQuantity = totalQuantity.minus(activity.quantity);

          transactionInvestment = totalInvestment
            .mul(remainingQuantity)
            .div(totalQuantity)
            .minus(totalInvestment);

          transactionInvestmentWithCurrencyEffect =
            totalInvestmentWithCurrencyEffect
              .mul(remainingQuantity)
              .div(totalQuantity)
              .minus(totalInvestmentWithCurrencyEffect);
        }
      }

      if (PortfolioCalculator.ENABLE_LOGGING) {
        console.log('activity.quantity', activity.quantity.toNumber());
        console.log('transactionInvestment', transactionInvestment.toNumber());

        console.log(
          'transactionInvestmentWithCurrencyEffect',
          transactionInvestmentWithCurrencyEffect.toNumber()
        );
      }

      const totalInvestmentBeforeTransaction = totalInvestment;

      const totalInvestmentBeforeTransactionWithCurrencyEffect =
        totalInvestmentWithCurrencyEffect;

      totalInvestment = totalInvestment.plus(transactionInvestment);

      totalInvestmentWithCurrencyEffect =
        totalInvestmentWithCurrencyEffect.plus(
          transactionInvestmentWithCurrencyEffect
        );

      if (i >= indexOfStartActivity && !initialValue) {
        if (
          i === indexOfStartActivity &&
          !valueOfInvestmentBeforeTransaction.eq(0)
        ) {
          initialValue = valueOfInvestmentBeforeTransaction;
        } else if (transactionInvestment.gt(0)) {
          initialValue = transactionInvestment;
        }
      }

      fees = fees.plus(activity.feeInBaseCurrency ?? 0);

      feesWithCurrencyEffect = feesWithCurrencyEffect.plus(
        activity.feeInBaseCurrencyWithCurrencyEffect ?? 0
      );

      totalQuantity = totalQuantity.plus(
        activity.quantity.mul(getFactor(activity.type))
      );

      const valueOfInvestment = totalQuantity.mul(marketPriceInBaseCurrency);

      const valueOfInvestmentWithCurrencyEffect = totalQuantity.mul(
        marketPriceInBaseCurrencyWithCurrencyEffect
      );

      const grossPerformanceFromSell =
        activity.type === 'SELL'
          ? activity.unitPriceInBaseCurrency
              .minus(lastAveragePrice)
              .mul(activity.quantity)
          : new Big(0);

      const grossPerformanceFromSellWithCurrencyEffect =
        activity.type === 'SELL'
          ? activity.unitPriceInBaseCurrencyWithCurrencyEffect
              .minus(lastAveragePriceWithCurrencyEffect)
              .mul(activity.quantity)
          : new Big(0);

      grossPerformanceFromSells = grossPerformanceFromSells.plus(
        grossPerformanceFromSell
      );

      grossPerformanceFromSellsWithCurrencyEffect =
        grossPerformanceFromSellsWithCurrencyEffect.plus(
          grossPerformanceFromSellWithCurrencyEffect
        );

      lastAveragePrice = totalQuantityFromBuyTransactions.eq(0)
        ? new Big(0)
        : totalInvestmentFromBuyTransactions.div(
            totalQuantityFromBuyTransactions
          );

      lastAveragePriceWithCurrencyEffect = totalQuantityFromBuyTransactions.eq(
        0
      )
        ? new Big(0)
        : totalInvestmentFromBuyTransactionsWithCurrencyEffect.div(
            totalQuantityFromBuyTransactions
          );

      if (totalQuantity.eq(0)) {
        // Reset tracking variables when position is fully closed
        totalInvestmentFromBuyTransactions = new Big(0);
        totalInvestmentFromBuyTransactionsWithCurrencyEffect = new Big(0);
        totalQuantityFromBuyTransactions = new Big(0);
      }

      if (PortfolioCalculator.ENABLE_LOGGING) {
        console.log(
          'grossPerformanceFromSells',
          grossPerformanceFromSells.toNumber()
        );
        console.log(
          'grossPerformanceFromSellWithCurrencyEffect',
          grossPerformanceFromSellWithCurrencyEffect.toNumber()
        );
      }

      const newGrossPerformance = valueOfInvestment
        .minus(totalInvestment)
        .plus(grossPerformanceFromSells);

      const newGrossPerformanceWithCurrencyEffect =
        valueOfInvestmentWithCurrencyEffect
          .minus(totalInvestmentWithCurrencyEffect)
          .plus(grossPerformanceFromSellsWithCurrencyEffect);

      grossPerformance = newGrossPerformance;

      grossPerformanceWithCurrencyEffect =
        newGrossPerformanceWithCurrencyEffect;

      if (activity.itemType === 'start') {
        feesAtStartDate = fees;
        feesAtStartDateWithCurrencyEffect = feesWithCurrencyEffect;
        grossPerformanceAtStartDate = grossPerformance;

        grossPerformanceAtStartDateWithCurrencyEffect =
          grossPerformanceWithCurrencyEffect;
      }

      if (i > indexOfStartActivity) {
        currentValues[activity.date] = valueOfInvestment;

        currentValuesWithCurrencyEffect[activity.date] =
          valueOfInvestmentWithCurrencyEffect;

        netPerformanceValues[activity.date] = grossPerformance
          .minus(grossPerformanceAtStartDate)
          .minus(fees.minus(feesAtStartDate));

        netPerformanceValuesWithCurrencyEffect[activity.date] =
          grossPerformanceWithCurrencyEffect
            .minus(grossPerformanceAtStartDateWithCurrencyEffect)
            .minus(
              feesWithCurrencyEffect.minus(feesAtStartDateWithCurrencyEffect)
            );

        investmentValuesAccumulated[activity.date] = totalInvestment;

        investmentValuesAccumulatedWithCurrencyEffect[activity.date] =
          totalInvestmentWithCurrencyEffect;

        investmentValuesWithCurrencyEffect[activity.date] = (
          investmentValuesWithCurrencyEffect[activity.date] ?? new Big(0)
        ).add(transactionInvestmentWithCurrencyEffect);
      }

      if (PortfolioCalculator.ENABLE_LOGGING) {
        console.log('totalInvestment', totalInvestment.toNumber());

        console.log(
          'totalInvestmentWithCurrencyEffect',
          totalInvestmentWithCurrencyEffect.toNumber()
        );

        console.log(
          'totalGrossPerformance',
          grossPerformance.minus(grossPerformanceAtStartDate).toNumber()
        );

        console.log(
          'totalGrossPerformanceWithCurrencyEffect',
          grossPerformanceWithCurrencyEffect
            .minus(grossPerformanceAtStartDateWithCurrencyEffect)
            .toNumber()
        );
      }

      items.push({
        fees,
        feesWithCurrencyEffect,
        grossPerformance,
        grossPerformanceWithCurrencyEffect,
        transactionInvestment,
        transactionInvestmentWithCurrencyEffect,
        date: activity.date,
        investment: totalInvestment,
        investmentBeforeTransaction: totalInvestmentBeforeTransaction,
        investmentBeforeTransactionWithCurrencyEffect:
          totalInvestmentBeforeTransactionWithCurrencyEffect,
        investmentWithCurrencyEffect: totalInvestmentWithCurrencyEffect,
        itemType: activity.itemType,
        quantity: totalQuantity,
        type: activity.type,
        value: valueOfInvestment,
        valueBeforeTransaction: valueOfInvestmentBeforeTransaction,
        valueBeforeTransactionWithCurrencyEffect:
          valueOfInvestmentBeforeTransactionWithCurrencyEffect,
        valueWithCurrencyEffect: valueOfInvestmentWithCurrencyEffect
      });

      if (i === indexOfEndActivity) {
        break;
      }
    }

    return {
      currentValues,
      currentValuesWithCurrencyEffect,
      initialValue,
      investmentValuesAccumulated,
      investmentValuesAccumulatedWithCurrencyEffect,
      investmentValuesWithCurrencyEffect,
      items,
      netPerformanceValues,
      netPerformanceValuesWithCurrencyEffect
    };
  }

  public async getInterestInBaseCurrency() {
    await this.snapshotPromise;

    return this.snapshot.totalInterestWithCurrencyEffect;
  }

  public getInvestments(): { date: string; investment: Big }[] {
    if (this.holdingBalancesByDate.length === 0) {
      return [];
    }

    return this.holdingBalancesByDate.map(({ date, holdings }) => {
      return {
        date,
        investment: holdings.reduce(
          (investment, { investment: investmentOfHolding }) =>
            investment.plus(investmentOfHolding),
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

    const historicalDataItemsOfDateRange: HistoricalDataItem[] = [];

    let netPerformanceAtStartDate: number;
    let netPerformanceWithCurrencyEffectAtStartDate: number;

    for (const historicalDataItem of historicalData) {
      const date = resetHours(parseDate(historicalDataItem.date));

      if (!isBefore(date, start) && !isAfter(date, end)) {
        // Take the values at the start date from the first day of the date
        // range
        if (historicalDataItemsOfDateRange.length === 0) {
          netPerformanceAtStartDate = historicalDataItem.netPerformance;

          netPerformanceWithCurrencyEffectAtStartDate =
            historicalDataItem.netPerformanceWithCurrencyEffect;
        }

        historicalDataItemsOfDateRange.push({
          ...historicalDataItem,
          netPerformance:
            historicalDataItem.netPerformance - netPerformanceAtStartDate,
          netPerformanceWithCurrencyEffect:
            historicalDataItem.netPerformanceWithCurrencyEffect -
            netPerformanceWithCurrencyEffectAtStartDate
        });
      }
    }

    const performancePercentagesByDate =
      this.calculatePerformancePercentagesForDateRange({
        historicalDataItems: historicalDataItemsOfDateRange
      });

    const chart = historicalDataItemsOfDateRange.map((historicalDataItem) => {
      return {
        ...historicalDataItem,
        ...performancePercentagesByDate[historicalDataItem.date]
      };
    });

    return { chart };
  }

  protected abstract getPerformanceCalculationType(): PerformanceCalculationType;

  public async getSnapshot() {
    await this.snapshotPromise;

    return this.snapshot;
  }

  public getStartDate() {
    let firstAccountBalanceDate: Date;
    let firstActivityDate: Date;

    if (this.accountBalanceItems?.length > 0) {
      try {
        const firstAccountBalanceDateString = this.accountBalanceItems[0].date;
        firstAccountBalanceDate = firstAccountBalanceDateString
          ? parseDate(firstAccountBalanceDateString)
          : new Date();
      } catch (error) {
        firstAccountBalanceDate = new Date();
      }
    }

    if (this.holdingBalancesByDate?.length > 0) {
      try {
        const firstActivityDateString = this.holdingBalancesByDate[0].date;
        firstActivityDate = firstActivityDateString
          ? parseDate(firstActivityDateString)
          : new Date();
      } catch (error) {
        firstActivityDate = new Date();
      }
    }

    const dates = [firstAccountBalanceDate, firstActivityDate].filter(
      (date) => {
        return !!date;
      }
    );

    if (dates.length === 0) {
      return undefined;
    }

    return min(dates);
  }

  protected getTotalsFromActivities({
    activities,
    exchangeRates
  }: {
    activities: PortfolioCalculatorActivity[];
    exchangeRates: { [dateString: string]: number };
  }) {
    let totalDividend = new Big(0);
    let totalDividendInBaseCurrency = new Big(0);
    let totalInterestInBaseCurrency = new Big(0);
    let totalLiabilitiesInBaseCurrency = new Big(0);

    for (const activity of activities) {
      const exchangeRateAtActivityDate = exchangeRates[activity.date];

      if (activity.type === 'DIVIDEND') {
        const dividend = activity.quantity.mul(activity.unitPrice);

        totalDividend = totalDividend.plus(dividend);
        totalDividendInBaseCurrency = totalDividendInBaseCurrency.plus(
          dividend.mul(exchangeRateAtActivityDate ?? 1)
        );
      } else if (activity.type === 'INTEREST') {
        const interest = activity.quantity.mul(activity.unitPrice);

        totalInterestInBaseCurrency = totalInterestInBaseCurrency.plus(
          interest.mul(exchangeRateAtActivityDate ?? 1)
        );
      } else if (activity.type === 'LIABILITY') {
        const liabilities = activity.quantity.mul(activity.unitPrice);

        totalLiabilitiesInBaseCurrency = totalLiabilitiesInBaseCurrency.plus(
          liabilities.mul(exchangeRateAtActivityDate ?? 1)
        );
      }
    }

    return {
      totalDividend,
      totalDividendInBaseCurrency,
      totalInterestInBaseCurrency,
      totalLiabilitiesInBaseCurrency
    };
  }

  protected getUnitPriceAtEndDate({
    activities,
    dataSource,
    isCash,
    marketPriceAtEndDate
  }: {
    activities: PortfolioCalculatorActivity[];
    dataSource: DataSource;
    isCash: boolean;
    marketPriceAtEndDate: Big;
  }): Big {
    const latestActivity = activities.at(-1);

    if (
      dataSource === 'MANUAL' &&
      ['BUY', 'SELL'].includes(latestActivity?.type) &&
      latestActivity?.unitPrice &&
      !marketPriceAtEndDate
    ) {
      // For BUY / SELL activities with a MANUAL data source where no historical market price is available,
      // the calculation should fall back to using the activity’s unit price.
      return latestActivity.unitPrice;
    } else if (isCash) {
      return new Big(1);
    }

    return marketPriceAtEndDate;
  }

  @LogPerformance
  private computeHoldingBalancesByDate() {
    this.holdingBalancesByDate = [];
    const holdingBalancesByAssetProfileIdentifier: {
      [assetProfileIdentifier: string]: HoldingBalance;
    } = {};

    let lastDate: string = null;
    let latestHoldingBalances: HoldingBalancesAtDate = null;

    for (const {
      assetProfile,
      date,
      fee,
      feeInBaseCurrency,
      quantity,
      tags,
      type,
      unitPrice
    } of this.activities) {
      let holdingBalance: HoldingBalance;

      const assetSubClass = assetProfile.assetSubClass;
      const currency = assetProfile.currency;
      const dataSource = assetProfile.dataSource;
      const factor = getFactor(type);
      const skipErrors = !!assetProfile.userId; // Skip errors for custom asset profiles
      const symbol = assetProfile.symbol;

      const assetProfileIdentifier = getAssetProfileIdentifier(assetProfile);

      const previousHoldingBalance =
        holdingBalancesByAssetProfileIdentifier[assetProfileIdentifier];

      if (previousHoldingBalance) {
        let investment = previousHoldingBalance.investment;

        let newQuantity = quantity
          .mul(factor)
          .plus(previousHoldingBalance.quantity);

        if (type === 'BUY') {
          if (previousHoldingBalance.investment.gte(0)) {
            investment = previousHoldingBalance.investment.plus(
              quantity.mul(unitPrice)
            );
          } else {
            investment = previousHoldingBalance.investment.plus(
              quantity.mul(previousHoldingBalance.averagePrice)
            );
          }
        } else if (type === 'SELL') {
          if (previousHoldingBalance.investment.gt(0)) {
            investment = previousHoldingBalance.investment.minus(
              quantity.mul(previousHoldingBalance.averagePrice)
            );
          } else {
            investment = previousHoldingBalance.investment.minus(
              quantity.mul(unitPrice)
            );
          }
        }

        if (newQuantity.abs().lt(Number.EPSILON)) {
          // Reset to zero if quantity is (almost) zero to avoid rounding issues
          investment = new Big(0);
          newQuantity = new Big(0);
        }

        holdingBalance = {
          assetSubClass,
          currency,
          dataSource,
          investment,
          skipErrors,
          symbol,
          activitiesCount: previousHoldingBalance.activitiesCount + 1,
          averagePrice: newQuantity.eq(0)
            ? new Big(0)
            : investment.div(newQuantity).abs(),
          dateOfFirstActivity: previousHoldingBalance.dateOfFirstActivity,
          fee: previousHoldingBalance.fee.plus(fee),
          feeInBaseCurrency:
            previousHoldingBalance.feeInBaseCurrency.plus(feeInBaseCurrency),
          includeInHoldings: previousHoldingBalance.includeInHoldings,
          quantity: newQuantity,
          tags: previousHoldingBalance.tags.concat(tags)
        };
      } else {
        holdingBalance = {
          assetSubClass,
          currency,
          dataSource,
          fee,
          feeInBaseCurrency,
          skipErrors,
          symbol,
          tags,
          activitiesCount: 1,
          averagePrice: unitPrice,
          dateOfFirstActivity: date,
          includeInHoldings: INVESTMENT_ACTIVITY_TYPES.includes(type),
          investment: unitPrice.mul(quantity).mul(factor),
          quantity: quantity.mul(factor)
        };
      }

      holdingBalance.tags = uniqBy(holdingBalance.tags, 'id');

      holdingBalancesByAssetProfileIdentifier[assetProfileIdentifier] =
        holdingBalance;

      const holdings = (latestHoldingBalances?.holdings ?? []).filter(
        (holding) => {
          return getAssetProfileIdentifier(holding) !== assetProfileIdentifier;
        }
      );

      holdings.push(holdingBalance);

      holdings.sort((a, b) => {
        return (
          a.symbol?.localeCompare(b.symbol) ||
          a.dataSource?.localeCompare(b.dataSource)
        );
      });

      if (lastDate !== date || latestHoldingBalances === null) {
        latestHoldingBalances = { date, holdings };

        this.holdingBalancesByDate.push(latestHoldingBalances);
      } else {
        latestHoldingBalances.holdings = holdings;
      }

      lastDate = date;
    }
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
    // 1. Add the dates of the holding balances
    const chartDateMap = this.holdingBalancesByDate.reduce(
      (result, { date }) => {
        result[date] = true;
        return result;
      },
      {}
    );

    // 2. Add the dates in between, with the specified step size
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
        getIntervalFromDateRange({ dateRange });

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

    // Make sure the first and last date of each calendar year is present
    const interval = { start: startDate, end: endDate };

    for (const date of eachYearOfInterval(interval)) {
      const yearStart = startOfYear(date);
      const yearEnd = endOfYear(date);

      if (isWithinInterval(yearStart, interval)) {
        // Add start of year (YYYY-01-01)
        chartDateMap[format(yearStart, DATE_FORMAT)] = true;
      }

      if (isWithinInterval(yearEnd, interval)) {
        // Add end of year (YYYY-12-31)
        chartDateMap[format(yearEnd, DATE_FORMAT)] = true;
      }
    }

    return chartDateMap;
  }

  @LogPerformance
  private async initialize(attempt = 1) {
    const startTimeTotal = performance.now();

    let cachedPortfolioSnapshot: PortfolioSnapshot | undefined;
    let isCachedPortfolioSnapshotExpired = false;

    const calculationType = this.getPerformanceCalculationType();

    const portfolioSnapshotKey = this.redisCacheService.getPortfolioSnapshotKey(
      {
        calculationType,
        filters: this.filters,
        userId: this.userId
      }
    );

    const jobId = portfolioSnapshotKey;

    try {
      const cachedPortfolioSnapshotValue =
        await this.redisCacheService.get(portfolioSnapshotKey);

      const { expiration, portfolioSnapshot }: PortfolioSnapshotValue =
        JSON.parse(cachedPortfolioSnapshotValue);

      cachedPortfolioSnapshot = plainToClass(
        PortfolioSnapshot,
        portfolioSnapshot
      );

      if (isPast(new Date(expiration))) {
        isCachedPortfolioSnapshotExpired = true;
      }
    } catch {}

    if (cachedPortfolioSnapshot) {
      this.snapshot = cachedPortfolioSnapshot;

      this.logger.debug(
        `Fetched portfolio snapshot from cache in ${(
          (performance.now() - startTimeTotal) /
          1000
        ).toFixed(3)} seconds`
      );

      if (isCachedPortfolioSnapshotExpired) {
        // Compute in the background
        this.portfolioSnapshotService.addJobToQueue({
          data: {
            calculationType,
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
      if (attempt > PortfolioCalculator.MAX_INITIALIZATION_ATTEMPTS) {
        throw new PortfolioSnapshotComputationError(
          `Portfolio snapshot of user '${this.userId}' could not be computed after ${PortfolioCalculator.MAX_INITIALIZATION_ATTEMPTS} attempts`
        );
      }

      // Wait for computation
      await this.portfolioSnapshotService.addJobToQueue({
        data: {
          calculationType,
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

      await this.initialize(attempt + 1);
    }
  }
}
