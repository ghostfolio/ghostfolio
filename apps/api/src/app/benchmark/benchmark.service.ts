import { RedisCacheService } from '@ghostfolio/api/app/redis-cache/redis-cache.service';
import { SymbolService } from '@ghostfolio/api/app/symbol/symbol.service';
import { DataProviderService } from '@ghostfolio/api/services/data-provider/data-provider.service';
import { MarketDataService } from '@ghostfolio/api/services/market-data.service';
import { PropertyService } from '@ghostfolio/api/services/property/property.service';
import { SymbolProfileService } from '@ghostfolio/api/services/symbol-profile.service';
import { PROPERTY_BENCHMARKS } from '@ghostfolio/common/config';
import { DATE_FORMAT } from '@ghostfolio/common/helper';
import {
  BenchmarkMarketDataDetails,
  BenchmarkResponse,
  UniqueAsset
} from '@ghostfolio/common/interfaces';
import { Injectable } from '@nestjs/common';
import { SymbolProfile } from '@prisma/client';
import Big from 'big.js';
import { format } from 'date-fns';
import ms from 'ms';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class BenchmarkService {
  private readonly CACHE_KEY_BENCHMARKS = 'BENCHMARKS';

  public constructor(
    private readonly dataProviderService: DataProviderService,
    private readonly marketDataService: MarketDataService,
    private readonly propertyService: PropertyService,
    private readonly redisCacheService: RedisCacheService,
    private readonly symbolProfileService: SymbolProfileService,
    private readonly symbolService: SymbolService
  ) {}

  public calculateChangeInPercentage(baseValue: number, currentValue: number) {
    if (baseValue && currentValue) {
      return new Big(currentValue).div(baseValue).minus(1).toNumber();
    }

    return 0;
  }

  public async getBenchmarks({ useCache = true } = {}): Promise<
    BenchmarkResponse['benchmarks']
  > {
    let benchmarks: BenchmarkResponse['benchmarks'];

    if (useCache) {
      try {
        benchmarks = JSON.parse(
          await this.redisCacheService.get(this.CACHE_KEY_BENCHMARKS)
        );

        if (benchmarks) {
          return benchmarks;
        }
      } catch {}
    }

    const benchmarkAssetProfiles = await this.getBenchmarkAssetProfiles();

    const promises: Promise<number>[] = [];

    const quotes = await this.dataProviderService.getQuotes(
      benchmarkAssetProfiles.map(({ dataSource, symbol }) => {
        return { dataSource, symbol };
      })
    );

    for (const { dataSource, symbol } of benchmarkAssetProfiles) {
      promises.push(this.marketDataService.getMax({ dataSource, symbol }));
    }

    const allTimeHighs = await Promise.all(promises);

    benchmarks = allTimeHighs.map((allTimeHigh, index) => {
      const { marketPrice } =
        quotes[benchmarkAssetProfiles[index].symbol] ?? {};

      let performancePercentFromAllTimeHigh = 0;

      if (allTimeHigh && marketPrice) {
        performancePercentFromAllTimeHigh = this.calculateChangeInPercentage(
          allTimeHigh,
          marketPrice
        );
      }

      return {
        marketCondition: this.getMarketCondition(
          performancePercentFromAllTimeHigh
        ),
        name: benchmarkAssetProfiles[index].name,
        performances: {
          allTimeHigh: {
            performancePercent: performancePercentFromAllTimeHigh
          }
        }
      };
    });

    await this.redisCacheService.set(
      this.CACHE_KEY_BENCHMARKS,
      JSON.stringify(benchmarks),
      ms('4 hours') / 1000
    );

    return benchmarks;
  }

  public async getBenchmarkAssetProfiles(): Promise<Partial<SymbolProfile>[]> {
    const symbolProfileIds: string[] = (
      ((await this.propertyService.getByKey(PROPERTY_BENCHMARKS)) as {
        symbolProfileId: string;
      }[]) ?? []
    ).map(({ symbolProfileId }) => {
      return symbolProfileId;
    });

    const assetProfiles =
      await this.symbolProfileService.getSymbolProfilesByIds(symbolProfileIds);

    return assetProfiles.map(({ dataSource, id, name, symbol }) => {
      return {
        dataSource,
        id,
        name,
        symbol
      };
    });
  }

  public async getMarketDataBySymbol({
    dataSource,
    startDate,
    symbol
  }: { startDate: Date } & UniqueAsset): Promise<BenchmarkMarketDataDetails> {
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
            gte: startDate
          }
        }
      })
    ]);

    marketDataItems.push({
      ...currentSymbolItem,
      createdAt: new Date(),
      date: new Date(),
      id: uuidv4()
    });

    const marketPriceAtStartDate = marketDataItems?.[0]?.marketPrice ?? 0;
    return {
      marketData: marketDataItems.map((marketDataItem) => {
        return {
          date: format(marketDataItem.date, DATE_FORMAT),
          value:
            marketPriceAtStartDate === 0
              ? 0
              : this.calculateChangeInPercentage(
                  marketPriceAtStartDate,
                  marketDataItem.marketPrice
                ) * 100
        };
      })
    };
  }

  private getMarketCondition(aPerformanceInPercent: number) {
    return aPerformanceInPercent <= -0.2 ? 'BEAR_MARKET' : 'NEUTRAL_MARKET';
  }
}
