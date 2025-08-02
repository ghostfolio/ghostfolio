import { PortfolioService } from '@ghostfolio/api/app/portfolio/portfolio.service';
import { SymbolService } from '@ghostfolio/api/app/symbol/symbol.service';
import { BenchmarkService } from '@ghostfolio/api/services/benchmark/benchmark.service';
import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.service';
import { MarketDataService } from '@ghostfolio/api/services/market-data/market-data.service';
import { DATE_FORMAT, parseDate, resetHours } from '@ghostfolio/common/helper';
import {
  AssetProfileIdentifier,
  BenchmarkMarketDataDetails,
  Filter
} from '@ghostfolio/common/interfaces';
import { DateRange, UserWithSettings } from '@ghostfolio/common/types';

import { Injectable, Logger } from '@nestjs/common';
import { format, isSameDay } from 'date-fns';
import { isNumber } from 'lodash';

@Injectable()
export class BenchmarksService {
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
    impersonationId,
    startDate,
    symbol,
    user,
    withExcludedAccounts
  }: {
    dateRange: DateRange;
    endDate?: Date;
    filters?: Filter[];
    impersonationId: string;
    startDate: Date;
    user: UserWithSettings;
    withExcludedAccounts?: boolean;
  } & AssetProfileIdentifier): Promise<BenchmarkMarketDataDetails> {
    const marketData: { date: string; value: number }[] = [];
    const userCurrency = user.settings.settings.baseCurrency;
    const userId = user.id;

    const { chart } = await this.portfolioService.getPerformance({
      dateRange,
      filters,
      impersonationId,
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

    const exchangeRates =
      await this.exchangeRateDataService.getExchangeRatesByCurrency({
        startDate,
        currencies: [currentSymbolItem.currency],
        targetCurrency: userCurrency
      });

    const exchangeRateAtStartDate =
      exchangeRates[`${currentSymbolItem.currency}${userCurrency}`]?.[
        format(startDate, DATE_FORMAT)
      ];

    const marketPriceAtStartDate = marketDataItems?.find(({ date }) => {
      return isSameDay(date, startDate);
    })?.marketPrice;

    if (!marketPriceAtStartDate) {
      Logger.error(
        `No historical market data has been found for ${symbol} (${dataSource}) at ${format(
          startDate,
          DATE_FORMAT
        )}`,
        'BenchmarkService'
      );

      return { marketData };
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
