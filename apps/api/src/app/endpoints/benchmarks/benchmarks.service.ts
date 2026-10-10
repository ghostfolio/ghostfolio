import { PortfolioService } from '@ghostfolio/api/app/portfolio/portfolio.service';
import { SymbolService } from '@ghostfolio/api/app/symbol/symbol.service';
import { BenchmarkService } from '@ghostfolio/api/services/benchmark/benchmark.service';
import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.service';
import { MarketDataService } from '@ghostfolio/api/services/market-data/market-data.service';
import { DATE_FORMAT, parseDate, resetHours } from '@ghostfolio/common/helper';
import {
  AssetProfileIdentifier,
  BenchmarkMarketDataDetailsResponse,
  Filter,
  UserSettings
} from '@ghostfolio/common/interfaces';
import { DateRange } from '@ghostfolio/common/types';

import { Injectable, Logger } from '@nestjs/common';
import { format, isBefore, isSameDay, min } from 'date-fns';
import { isNumber } from 'lodash-es';

@Injectable()
export class BenchmarksService {
  private readonly logger = new Logger(BenchmarksService.name);

  public constructor(
    private readonly benchmarkService: BenchmarkService,
    private readonly exchangeRateDataService: ExchangeRateDataService,
    private readonly marketDataService: MarketDataService,
    private readonly portfolioService: PortfolioService,
    private readonly symbolService: SymbolService
  ) {}

  public async getMarketDataForUser({
    dataSource,
    dateRange,
    endDate = new Date(),
    filters,
    startDate,
    symbol,
    userId,
    userSettings,
    withExcludedAccounts
  }: {
    dateRange: DateRange;
    endDate?: Date;
    filters?: Filter[];
    startDate: Date;
    userId: string;
    userSettings: UserSettings;
    withExcludedAccounts?: boolean;
  } & AssetProfileIdentifier): Promise<BenchmarkMarketDataDetailsResponse> {
    const marketData: { date: string; value: number }[] = [];
    const userCurrency = userSettings.baseCurrency;

    const { chart } = await this.portfolioService.getPerformance({
      dateRange,
      filters,
      userId,
      withExcludedAccounts
    });

    const [currentSymbolItem, marketDataItems] = await Promise.all([
      this.symbolService.get({
        dataGatheringItem: {
          dataSource,
          symbol
        }
      }),
      this.marketDataService.marketDataItems({
        orderBy: {
          date: 'asc'
        },
        where: {
          dataSource,
          symbol,
          date: {
            in: chart.map(({ date }) => {
              return resetHours(parseDate(date));
            })
          }
        }
      })
    ]);

    if (!currentSymbolItem) {
      this.logger.error(
        `No current market price is available for ${symbol} (${dataSource})`
      );

      return { marketData };
    }

    if (chart.length === 0) {
      return { marketData };
    }

    const baselineDate = resetHours(parseDate(chart[0].date));

    // The market data of the benchmark can start after the baseline date.
    // In this case, the first market data item is the start and the value
    // before it is 0%.
    const [firstMarketDataItem] = marketDataItems;
    const marketPriceAtStartDate = firstMarketDataItem?.marketPrice;

    if (!marketPriceAtStartDate) {
      this.logger.error(
        `No historical market data has been found for ${symbol} (${dataSource}) since ${format(
          baselineDate,
          DATE_FORMAT
        )}`
      );

      return { marketData };
    }

    const exchangeRates =
      await this.exchangeRateDataService.getExchangeRatesByCurrency({
        currencies: [currentSymbolItem.currency],
        startDate: min([baselineDate, startDate]),
        targetCurrency: userCurrency
      });

    const exchangeRateAtStartDate =
      exchangeRates[`${currentSymbolItem.currency}${userCurrency}`]?.[
        format(firstMarketDataItem.date, DATE_FORMAT)
      ];

    for (const { date } of chart) {
      if (!isBefore(resetHours(parseDate(date)), firstMarketDataItem.date)) {
        break;
      }

      marketData.push({ date, value: 0 });
    }

    for (const marketDataItem of marketDataItems) {
      const exchangeRate =
        exchangeRates[`${currentSymbolItem.currency}${userCurrency}`]?.[
          format(marketDataItem.date, DATE_FORMAT)
        ];

      const exchangeRateFactor =
        isNumber(exchangeRateAtStartDate) && isNumber(exchangeRate)
          ? exchangeRate / exchangeRateAtStartDate
          : 1;

      marketData.push({
        date: format(marketDataItem.date, DATE_FORMAT),
        value:
          marketPriceAtStartDate === 0
            ? 0
            : this.benchmarkService.calculateChangeInPercentage(
                marketPriceAtStartDate,
                marketDataItem.marketPrice * exchangeRateFactor
              ) * 100
      });
    }

    const includesEndDate = isSameDay(
      parseDate(marketData.at(-1).date),
      endDate
    );

    if (currentSymbolItem?.marketPrice && !includesEndDate) {
      const exchangeRate =
        exchangeRates[`${currentSymbolItem.currency}${userCurrency}`]?.[
          format(endDate, DATE_FORMAT)
        ];

      const exchangeRateFactor =
        isNumber(exchangeRateAtStartDate) && isNumber(exchangeRate)
          ? exchangeRate / exchangeRateAtStartDate
          : 1;

      marketData.push({
        date: format(endDate, DATE_FORMAT),
        value:
          this.benchmarkService.calculateChangeInPercentage(
            marketPriceAtStartDate,
            currentSymbolItem.marketPrice * exchangeRateFactor
          ) * 100
      });
    }

    return {
      marketData
    };
  }
}
