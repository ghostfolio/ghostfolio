import { ActivitiesService } from '@ghostfolio/api/services/activities/activities.service';
import { YahooFinanceService } from '@ghostfolio/api/services/data-provider/yahoo-finance/yahoo-finance.service';
import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.service';
import { ExchangeRatesByCurrency } from '@ghostfolio/api/services/exchange-rate-data/interfaces/exchange-rate-data.interface';
import { MarketDataService } from '@ghostfolio/api/services/market-data/market-data.service';
import { RedisCacheService } from '@ghostfolio/api/services/redis-cache/redis-cache.service';
import { SymbolProfileService } from '@ghostfolio/api/services/symbol-profile/symbol-profile.service';
import { getIntervalFromDateRange } from '@ghostfolio/common/calculation-helper';
import { DEFAULT_CURRENCY } from '@ghostfolio/common/config';
import {
  DATE_FORMAT,
  getAssetProfileIdentifier
} from '@ghostfolio/common/helper';
import { AssetProfileIdentifier } from '@ghostfolio/common/interfaces';
import { PortfolioIntradayResponse } from '@ghostfolio/common/interfaces';

import { Injectable, Logger } from '@nestjs/common';
import { AssetSubClass, DataSource } from '@prisma/client';
import { addDays, format, startOfMonth, startOfWeek, subDays } from 'date-fns';

import { PortfolioService } from '../portfolio.service';
import {
  getInstrumentIntradayItems,
  getIntradayGrid,
  getIntradaySessions,
  getPortfolioIntradayItems,
  INTRADAY_INTERVALS,
  IntradayDateRange,
  IntradayHolding,
  IntradayInstrument,
  isAnyMarketOpen
} from './intraday.helper';

@Injectable()
export class IntradayService {
  private static readonly CACHE_TTL_IN_MS = 60 * 1000;

  private readonly logger = new Logger(IntradayService.name);

  public constructor(
    private readonly activitiesService: ActivitiesService,
    private readonly exchangeRateDataService: ExchangeRateDataService,
    private readonly marketDataService: MarketDataService,
    private readonly portfolioService: PortfolioService,
    private readonly redisCacheService: RedisCacheService,
    private readonly symbolProfileService: SymbolProfileService,
    private readonly yahooFinanceService: YahooFinanceService
  ) {}

  public async getIntraday({
    benchmarkIds = [],
    dateRange,
    userCurrency = DEFAULT_CURRENCY,
    userId
  }: {
    benchmarkIds?: string[];
    dateRange: IntradayDateRange;
    userCurrency?: string;
    userId: string;
  }): Promise<PortfolioIntradayResponse> {
    const now = Date.now();
    const { interval, intervalInMs } = INTRADAY_INTERVALS[dateRange];
    const from = this.getFrom(dateRange);

    const [{ holdings }, benchmarkProfiles] = await Promise.all([
      this.portfolioService.getDetails({
        userId,
        filters: [{ id: 'ACTIVE', type: 'HOLDING_TYPE' }]
      }),
      benchmarkIds.length > 0
        ? this.symbolProfileService.getSymbolProfilesByIds(benchmarkIds)
        : Promise.resolve([])
    ]);

    const positions = Object.values(holdings).filter(({ assetProfile }) => {
      return assetProfile.assetSubClass !== AssetSubClass.CASH;
    });

    // The performance of the date range starts from the close of this day, so
    // the chart starts from the same stored close and exchange rate
    const { startDate: rangeStartDate } = getIntervalFromDateRange({
      dateRange
    });

    const [closes, exchangeRates] = await Promise.all([
      this.getClosesAt({
        assetProfileIdentifiers: [
          ...positions.map(({ assetProfile: { dataSource, symbol } }) => {
            return { dataSource, symbol };
          }),
          ...benchmarkProfiles.map(({ dataSource, symbol }) => {
            return { dataSource, symbol };
          })
        ],
        date: rangeStartDate
      }),
      this.exchangeRateDataService.getExchangeRatesByCurrency({
        currencies: Array.from(
          new Set(
            positions.map(({ assetProfile }) => {
              return assetProfile.currency;
            })
          )
        ),
        endDate: new Date(),
        startDate: rangeStartDate,
        targetCurrency: userCurrency
      })
    ]);

    const { activities } = await this.activitiesService.getActivities({
      userCurrency,
      userId,
      startDate: subDays(from, 1),
      types: ['BUY', 'SELL']
    });

    const intradayHoldings: IntradayHolding[] = await Promise.all(
      positions.map(async ({ assetProfile, marketPrice, quantity }) => {
        const instrument = await this.getInstrument({
          from,
          interval,
          dataSource: assetProfile.dataSource,
          symbol: assetProfile.symbol
        });

        const activitiesOfHolding = activities.filter(
          ({ assetProfile: { dataSource, symbol } }) => {
            return (
              dataSource === assetProfile.dataSource &&
              symbol === assetProfile.symbol
            );
          }
        );

        return {
          ...instrument,
          quantity,
          baselinePrice: closes[getAssetProfileIdentifier(assetProfile)],
          exchangeRate: this.getExchangeRateRange({
            exchangeRates,
            rangeStartDate,
            userCurrency,
            currency: assetProfile.currency
          }),
          livePrice: marketPrice,
          quantityChanges: activitiesOfHolding.map(
            ({ date, quantity: activityQuantity, type }) => {
              return {
                quantity:
                  type === 'SELL' ? -activityQuantity : activityQuantity,
                time: new Date(date).getTime()
              };
            }
          )
        };
      })
    );

    const benchmarks = await Promise.all(
      benchmarkProfiles.map(async ({ dataSource, id, symbol }) => {
        return {
          id,
          instrument: {
            ...(await this.getInstrument({
              dataSource,
              from,
              interval,
              symbol
            })),
            baselinePrice:
              closes[getAssetProfileIdentifier({ dataSource, symbol })]
          }
        };
      })
    );

    const sessions = getIntradaySessions({
      dateRange,
      now,
      instruments: [
        ...intradayHoldings,
        ...benchmarks.map(({ instrument }) => {
          return instrument;
        })
      ]
    });

    const grid = getIntradayGrid({ intervalInMs, sessions });
    const start = sessions[0]?.start ?? now;

    return {
      interval,
      benchmarks: benchmarks.map(({ id, instrument }) => {
        return {
          id,
          items: getInstrumentIntradayItems({
            grid,
            instrument,
            intervalInMs,
            now,
            start
          })
        };
      }),
      chart: getPortfolioIntradayItems({
        grid,
        intervalInMs,
        now,
        start,
        cashFlows: activities.map(
          ({ date, feeInBaseCurrency, type, valueInBaseCurrency }) => {
            return {
              amount:
                type === 'SELL'
                  ? -(valueInBaseCurrency - feeInBaseCurrency)
                  : valueInBaseCurrency + feeInBaseCurrency,
              time: new Date(date).getTime()
            };
          }
        ),
        holdings: intradayHoldings
      }),
      isMarketOpen: isAnyMarketOpen({ now, instruments: intradayHoldings })
    };
  }

  private getFrom(aDateRange: IntradayDateRange) {
    const today = new Date();

    // A few days more to get the close before the start of the date range
    switch (aDateRange) {
      case '1d':
        return subDays(today, 5);
      case 'mtd':
        return subDays(startOfMonth(today), 5);
      case 'wtd':
        return subDays(startOfWeek(today, { weekStartsOn: 1 }), 5);
    }
  }

  /**
   * Returns the last stored close of each asset profile at or before the date
   */
  private async getClosesAt({
    assetProfileIdentifiers,
    date
  }: {
    assetProfileIdentifiers: AssetProfileIdentifier[];
    date: Date;
  }) {
    const closes: { [assetProfileIdentifier: string]: number } = {};

    if (assetProfileIdentifiers.length === 0) {
      return closes;
    }

    const marketData = await this.marketDataService.getRange({
      assetProfileIdentifiers,
      dateQuery: { gte: subDays(date, 14), lt: addDays(date, 1) }
    });

    // Sorted by date, so the latest close of each asset profile is kept
    for (const { dataSource, marketPrice, symbol } of marketData) {
      if (marketPrice > 0) {
        closes[getAssetProfileIdentifier({ dataSource, symbol })] = marketPrice;
      }
    }

    return closes;
  }

  /**
   * Returns the exchange rate of a currency at the start of the date range and
   * now, from the same rates as the performance of the date range
   */
  private getExchangeRateRange({
    currency,
    exchangeRates,
    rangeStartDate,
    userCurrency
  }: {
    currency: string;
    exchangeRates: ExchangeRatesByCurrency;
    rangeStartDate: Date;
    userCurrency: string;
  }) {
    const rates = exchangeRates[`${currency}${userCurrency}`] ?? {};

    const now =
      rates[format(new Date(), DATE_FORMAT)] ??
      this.exchangeRateDataService.toCurrency(1, currency, userCurrency);

    return {
      now,
      start: rates[format(rangeStartDate, DATE_FORMAT)] ?? now
    };
  }

  private async getInstrument({
    dataSource,
    from,
    interval,
    symbol
  }: {
    dataSource: DataSource;
    from: Date;
    interval: '5m' | '15m' | '60m';
    symbol: string;
  }): Promise<IntradayInstrument> {
    if (dataSource !== DataSource.YAHOO) {
      // No intraday data: the value is constant
      return { prices: [], tradingPeriods: [] };
    }

    const key = `intraday-${dataSource}-${symbol}-${interval}-${from
      .toISOString()
      .slice(0, 10)}`;

    try {
      const cached = await this.redisCacheService.get(key);

      if (cached) {
        return JSON.parse(cached) as IntradayInstrument;
      }
    } catch {}

    try {
      const { prices, tradingPeriods } =
        await this.yahooFinanceService.getIntraday({ from, interval, symbol });

      const instrument: IntradayInstrument = {
        prices: prices.map(({ date, price }) => {
          return { price, time: new Date(date).getTime() };
        }),
        tradingPeriods: tradingPeriods.map(({ end, start, type }) => {
          return { type, end: end.getTime(), start: start.getTime() };
        })
      };

      await this.redisCacheService.set(
        key,
        JSON.stringify(instrument),
        IntradayService.CACHE_TTL_IN_MS
      );

      return instrument;
    } catch (error) {
      this.logger.warn(
        `Could not get the intraday prices of ${symbol} (${dataSource}): ${error?.message}`
      );

      return { prices: [], tradingPeriods: [] };
    }
  }
}
