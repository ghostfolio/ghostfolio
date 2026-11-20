import { MarketDataService } from '@ghostfolio/api/services/market-data/market-data.service';
import { AssetProfileIdentifier } from '@ghostfolio/common/interfaces';

import { Injectable } from '@nestjs/common';
import { MarketDataState } from '@prisma/client';

import { validateBenchmarkDateRange } from './benchmark-date-range';
import {
  adaptBenchmarkMarketData,
  BenchmarkMarketDataResult
} from './benchmark-market-data.adapter';

export interface BenchmarkHistoricalPricesInput extends AssetProfileIdentifier {
  startDate: Date;
  endDate: Date;
}

@Injectable()
export class BenchmarkMarketDataProvider {
  public constructor(private readonly marketDataService: MarketDataService) {}

  public async getHistoricalPrices({
    dataSource,
    symbol,
    startDate,
    endDate
  }: BenchmarkHistoricalPricesInput): Promise<BenchmarkMarketDataResult> {
    validateBenchmarkDateRange({ startDate, endDate });

    const where = {
      dataSource,
      symbol,
      state: MarketDataState.CLOSE,
      isCarriedForward: false
    };

    const [previous, current] = await Promise.all([
      this.marketDataService.marketDataItems({
        where: {
          ...where,
          date: { lt: startDate }
        },
        orderBy: { date: 'desc' },
        take: 1
      }),
      this.marketDataService.marketDataItems({
        where: {
          ...where,
          date: {
            gte: startDate,
            lte: endDate
          }
        },
        orderBy: { date: 'asc' }
      })
    ]);

    return adaptBenchmarkMarketData({
      marketData: [...previous, ...current]
    });
  }
}
