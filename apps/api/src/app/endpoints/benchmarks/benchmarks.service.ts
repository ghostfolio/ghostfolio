import { PortfolioService } from '@ghostfolio/api/app/portfolio/portfolio.service';
import { SymbolService } from '@ghostfolio/api/app/symbol/symbol.service';
import { BenchmarkService } from '@ghostfolio/api/services/benchmark/benchmark.service';
import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.service';
import { MarketDataService } from '@ghostfolio/api/services/market-data/market-data.service';
import { PrismaService } from '@ghostfolio/api/services/prisma/prisma.service';
import { DATE_FORMAT, parseDate, resetHours } from '@ghostfolio/common/helper';
import {
  AssetProfileIdentifier,
  BenchmarkMarketDataDetailsResponse,
  Filter
} from '@ghostfolio/common/interfaces';
import { DateRange, UserWithSettings } from '@ghostfolio/common/types';

import { Injectable, Logger } from '@nestjs/common';
import { MarketData } from '@prisma/client';
import { format, isSameDay } from 'date-fns';
import { isNumber } from 'lodash';

@Injectable()
export class BenchmarksService {
  public constructor(
    private readonly benchmarkService: BenchmarkService,
    private readonly exchangeRateDataService: ExchangeRateDataService,
    private readonly marketDataService: MarketDataService,
    private readonly portfolioService: PortfolioService,
    private readonly prismaService: PrismaService,
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
  } & AssetProfileIdentifier): Promise<BenchmarkMarketDataDetailsResponse> {
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

    const chartDates = chart.map(({ date }) => {
      return format(parseDate(date), DATE_FORMAT);
    });

    const rangeStart = resetHours(startDate);
    const rangeEnd = resetHours(endDate);

    const [
      currentSymbolItem,
      marketDataItems,
      startMarketDataItems,
      symbolProfile
    ] = await Promise.all([
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
            gte: rangeStart,
            lte: rangeEnd
          }
        }
      }),
      this.marketDataService.marketDataItems({
        orderBy: {
          date: 'desc'
        },
        take: 1,
        where: {
          dataSource,
          symbol,
          date: {
            lte: rangeStart
          }
        }
      }),
      this.prismaService.symbolProfile.findFirst({
        where: {
          dataSource,
          symbol
        }
      })
    ]);

    const benchmarkCurrency =
      currentSymbolItem?.currency ?? symbolProfile?.currency;

    if (!benchmarkCurrency) {
      Logger.error(
        `No currency has been found for ${symbol} (${dataSource})`,
        'BenchmarksService'
      );

      return { marketData };
    }

    const exchangeRates =
      await this.exchangeRateDataService.getExchangeRatesByCurrency({
        startDate: rangeStart,
        currencies: [benchmarkCurrency],
        endDate: rangeEnd,
        targetCurrency: userCurrency
      });

    const exchangeRateAtStartDate = this.getExchangeRateOnOrBefore({
      currencyPair: `${benchmarkCurrency}${userCurrency}`,
      date: rangeStart,
      exchangeRates
    });

    const marketDataItemsWithInitialValue = [
      ...startMarketDataItems,
      ...marketDataItems
    ];
    const marketPriceAtStartDate = this.getMarketPriceOnOrBefore({
      marketDataItems: marketDataItemsWithInitialValue,
      targetDate: rangeStart
    });

    if (!isNumber(marketPriceAtStartDate)) {
      Logger.error(
        `No historical market data has been found for ${symbol} (${dataSource}) at ${format(
          rangeStart,
          DATE_FORMAT
        )}`,
        'BenchmarksService'
      );

      return { marketData };
    }

    for (const chartDate of chartDates) {
      const targetDate = resetHours(parseDate(chartDate));
      const marketPrice = this.getMarketPriceOnOrBefore({
        marketDataItems: marketDataItemsWithInitialValue,
        targetDate
      });

      if (!isNumber(marketPrice)) {
        continue;
      }

      const exchangeRate = this.getExchangeRateOnOrBefore({
        currencyPair: `${benchmarkCurrency}${userCurrency}`,
        date: targetDate,
        exchangeRates
      });

      const exchangeRateFactor =
        isNumber(exchangeRateAtStartDate) && isNumber(exchangeRate)
          ? exchangeRate / exchangeRateAtStartDate
          : 1;

      marketData.push({
        date: chartDate,
        value:
          marketPriceAtStartDate === 0
            ? 0
            : this.benchmarkService.calculateChangeInPercentage(
                marketPriceAtStartDate,
                marketPrice * exchangeRateFactor
              ) * 100
      });
    }

    const endDateIndex = marketData.findIndex(({ date }) => {
      return isSameDay(parseDate(date), endDate);
    });

    if (currentSymbolItem?.marketPrice) {
      const exchangeRate = this.getExchangeRateOnOrBefore({
        currencyPair: `${benchmarkCurrency}${userCurrency}`,
        date: resetHours(endDate),
        exchangeRates
      });

      const exchangeRateFactor =
        isNumber(exchangeRateAtStartDate) && isNumber(exchangeRate)
          ? exchangeRate / exchangeRateAtStartDate
          : 1;

      const endDateMarketData = {
        date: format(endDate, DATE_FORMAT),
        value:
          this.benchmarkService.calculateChangeInPercentage(
            marketPriceAtStartDate,
            currentSymbolItem.marketPrice * exchangeRateFactor
          ) * 100
      };

      if (endDateIndex >= 0) {
        marketData[endDateIndex] = endDateMarketData;
      } else {
        marketData.push(endDateMarketData);
      }
    }

    return {
      marketData
    };
  }

  private getExchangeRateOnOrBefore({
    currencyPair,
    date,
    exchangeRates
  }: {
    currencyPair: string;
    date: Date;
    exchangeRates: Record<string, Record<string, number>>;
  }) {
    const ratesByDate = exchangeRates[currencyPair] ?? {};
    const targetDateString = format(date, DATE_FORMAT);
    let latestDate: string | undefined;
    let latestRate: number | undefined;

    for (const [dateString, rate] of Object.entries(ratesByDate)) {
      if (
        dateString <= targetDateString &&
        (!latestDate || dateString > latestDate)
      ) {
        latestDate = dateString;
        latestRate = rate;
      }
    }

    return latestRate;
  }

  private getMarketPriceOnOrBefore({
    marketDataItems,
    targetDate
  }: {
    marketDataItems: MarketData[];
    targetDate: Date;
  }) {
    let latestMarketPrice: number | undefined;

    for (const { date, marketPrice } of marketDataItems) {
      if (date <= targetDate) {
        latestMarketPrice = marketPrice;
      } else {
        break;
      }
    }

    return latestMarketPrice;
  }
}
