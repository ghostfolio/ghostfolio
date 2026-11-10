import { DataProviderService } from '@ghostfolio/api/services/data-provider/data-provider.service';

import { Injectable } from '@nestjs/common';

import { validateBenchmarkDateRange } from './benchmark-date-range';
import { getBenchmarkFxPairs } from './benchmark-fx-pairs';
import { BenchmarkFxQuote } from './benchmark-fx.adapter';
import { BenchmarkMarketDataProvider } from './benchmark-market-data.provider';

export interface BenchmarkHistoricalFxInput {
  currencyFrom: string;
  currencyTo: string;
  startDate: Date;
  endDate: Date;
}

@Injectable()
export class BenchmarkFxMarketDataProvider {
  public constructor(
    private readonly dataProviderService: DataProviderService,
    private readonly benchmarkMarketDataProvider: BenchmarkMarketDataProvider
  ) {}

  public async getHistoricalFxQuotes({
    currencyFrom,
    currencyTo,
    startDate,
    endDate
  }: BenchmarkHistoricalFxInput): Promise<BenchmarkFxQuote[]> {
    validateBenchmarkDateRange({ startDate, endDate });

    const pairs = getBenchmarkFxPairs({
      currencyFrom,
      currencyTo
    });

    if (pairs.length === 0) {
      return [];
    }

    const dataSource = this.dataProviderService.getDataSourceForExchangeRates();

    const quotes: BenchmarkFxQuote[] = [];

    for (const pair of pairs) {
      const result = await this.benchmarkMarketDataProvider.getHistoricalPrices(
        {
          dataSource,
          symbol: pair.symbol,
          startDate,
          endDate
        }
      );

      for (const price of result.prices) {
        quotes.push({
          currencyFrom: pair.currencyFrom,
          currencyTo: pair.currencyTo,
          date: price.date,
          rate: price.price
        });
      }
    }

    return quotes;
  }
}
