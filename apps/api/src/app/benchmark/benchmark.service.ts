import { RedisCacheService } from '@ghostfolio/api/app/redis-cache/redis-cache.service';
import { SymbolService } from '@ghostfolio/api/app/symbol/symbol.service';
import { DataProviderService } from '@ghostfolio/api/services/data-provider/data-provider.service';
import { MarketDataService } from '@ghostfolio/api/services/market-data/market-data.service';
import { PrismaService } from '@ghostfolio/api/services/prisma/prisma.service';
import { PropertyService } from '@ghostfolio/api/services/property/property.service';
import { SymbolProfileService } from '@ghostfolio/api/services/symbol-profile/symbol-profile.service';
import {
  MAX_CHART_ITEMS,
  PROPERTY_BENCHMARKS
} from '@ghostfolio/common/config';
import { DATE_FORMAT } from '@ghostfolio/common/helper';
import {
  BenchmarkMarketDataDetails,
  BenchmarkProperty,
  BenchmarkResponse,
  UniqueAsset
} from '@ghostfolio/common/interfaces';
import { Injectable } from '@nestjs/common';
import { SymbolProfile } from '@prisma/client';
import Big from 'big.js';
import { format } from 'date-fns';
import { uniqBy } from 'lodash';
import ms from 'ms';

@Injectable()
export class BenchmarkService {
  private readonly CACHE_KEY_BENCHMARKS = 'BENCHMARKS';

  public constructor(
    private readonly dataProviderService: DataProviderService,
    private readonly marketDataService: MarketDataService,
    private readonly prismaService: PrismaService,
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

    const promises: Promise<{ date: Date; marketPrice: number }>[] = [];

    const quotes = await this.dataProviderService.getQuotes({
      items: benchmarkAssetProfiles.map(({ dataSource, symbol }) => {
        return { dataSource, symbol };
      })
    });

    for (const { dataSource, symbol } of benchmarkAssetProfiles) {
      promises.push(this.marketDataService.getMax({ dataSource, symbol }));
    }

    const allTimeHighs = await Promise.all(promises);
    let storeInCache = true;

    benchmarks = allTimeHighs.map((allTimeHigh, index) => {
      const { marketPrice } =
        quotes[benchmarkAssetProfiles[index].symbol] ?? {};

      let performancePercentFromAllTimeHigh = 0;

      if (allTimeHigh?.marketPrice && marketPrice) {
        performancePercentFromAllTimeHigh = this.calculateChangeInPercentage(
          allTimeHigh.marketPrice,
          marketPrice
        );
      } else {
        storeInCache = false;
      }
      return {
        marketCondition: this.getMarketCondition(
          performancePercentFromAllTimeHigh
        ),
        name: benchmarkAssetProfiles[index].name,
        performances: {
          allTimeHigh: {
            date: allTimeHigh.date,
            performancePercent: performancePercentFromAllTimeHigh
          }
        }
      };
    });

    if (storeInCache) {
      await this.redisCacheService.set(
        this.CACHE_KEY_BENCHMARKS,
        JSON.stringify(benchmarks),
        ms('4 hours') / 1000
      );
    }

    return benchmarks;
  }

  public async getBenchmarkAssetProfiles(): Promise<Partial<SymbolProfile>[]> {
    const symbolProfileIds: string[] = (
      ((await this.propertyService.getByKey(
        PROPERTY_BENCHMARKS
      )) as BenchmarkProperty[]) ?? []
    ).map(({ symbolProfileId }) => {
      return symbolProfileId;
    });

    const assetProfiles =
      await this.symbolProfileService.getSymbolProfilesByIds(symbolProfileIds);

    return assetProfiles
      .map(({ dataSource, id, name, symbol }) => {
        return {
          dataSource,
          id,
          name,
          symbol
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
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

    const step = Math.round(
      marketDataItems.length / Math.min(marketDataItems.length, MAX_CHART_ITEMS)
    );

    const marketPriceAtStartDate = marketDataItems?.[0]?.marketPrice ?? 0;
    const response = {
      marketData: [
        ...marketDataItems
          .filter((marketDataItem, index) => {
            return index % step === 0;
          })
          .map((marketDataItem) => {
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
      ]
    };

    if (currentSymbolItem?.marketPrice) {
      response.marketData.push({
        date: format(new Date(), DATE_FORMAT),
        value:
          this.calculateChangeInPercentage(
            marketPriceAtStartDate,
            currentSymbolItem.marketPrice
          ) * 100
      });
    }

    return response;
  }

  public async addBenchmark({
    dataSource,
    symbol
  }: UniqueAsset): Promise<Partial<SymbolProfile>> {
    const assetProfile = await this.prismaService.symbolProfile.findFirst({
      where: {
        dataSource,
        symbol
      }
    });

    if (!assetProfile) {
      return;
    }

    let benchmarks =
      ((await this.propertyService.getByKey(
        PROPERTY_BENCHMARKS
      )) as BenchmarkProperty[]) ?? [];

    benchmarks.push({ symbolProfileId: assetProfile.id });

    benchmarks = uniqBy(benchmarks, 'symbolProfileId');

    await this.propertyService.put({
      key: PROPERTY_BENCHMARKS,
      value: JSON.stringify(benchmarks)
    });

    return {
      dataSource,
      symbol,
      id: assetProfile.id,
      name: assetProfile.name
    };
  }

  public async deleteBenchmark({
    dataSource,
    symbol
  }: UniqueAsset): Promise<Partial<SymbolProfile>> {
    const assetProfile = await this.prismaService.symbolProfile.findFirst({
      where: {
        dataSource,
        symbol
      }
    });

    if (!assetProfile) {
      return null;
    }

    let benchmarks =
      ((await this.propertyService.getByKey(
        PROPERTY_BENCHMARKS
      )) as BenchmarkProperty[]) ?? [];

    benchmarks = benchmarks.filter(({ symbolProfileId }) => {
      return symbolProfileId !== assetProfile.id;
    });

    await this.propertyService.put({
      key: PROPERTY_BENCHMARKS,
      value: JSON.stringify(benchmarks)
    });

    return {
      dataSource,
      symbol,
      id: assetProfile.id,
      name: assetProfile.name
    };
  }

  private getMarketCondition(aPerformanceInPercent: number) {
    return aPerformanceInPercent <= -0.2 ? 'BEAR_MARKET' : 'NEUTRAL_MARKET';
  }
}
