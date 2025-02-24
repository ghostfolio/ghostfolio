import { RedisCacheService } from '@ghostfolio/api/app/redis-cache/redis-cache.service';
import { DataProviderService } from '@ghostfolio/api/services/data-provider/data-provider.service';
import { MarketDataService } from '@ghostfolio/api/services/market-data/market-data.service';
import { PrismaService } from '@ghostfolio/api/services/prisma/prisma.service';
import { PropertyService } from '@ghostfolio/api/services/property/property.service';
import { SymbolProfileService } from '@ghostfolio/api/services/symbol-profile/symbol-profile.service';
import {
  CACHE_TTL_INFINITE,
  PROPERTY_BENCHMARKS
} from '@ghostfolio/common/config';
import { calculateBenchmarkTrend } from '@ghostfolio/common/helper';
import {
  AssetProfileIdentifier,
  Benchmark,
  BenchmarkProperty,
  BenchmarkResponse
} from '@ghostfolio/common/interfaces';
import { BenchmarkTrend } from '@ghostfolio/common/types';

import { Injectable, Logger } from '@nestjs/common';
import { SymbolProfile } from '@prisma/client';
import { Big } from 'big.js';
import { addHours, isAfter, subDays } from 'date-fns';
import { uniqBy } from 'lodash';
import ms from 'ms';

import { BenchmarkValue } from './interfaces/benchmark-value.interface';

@Injectable()
export class BenchmarkService {
  private readonly CACHE_KEY_BENCHMARKS = 'BENCHMARKS';

  public constructor(
    private readonly dataProviderService: DataProviderService,
    private readonly marketDataService: MarketDataService,
    private readonly prismaService: PrismaService,
    private readonly propertyService: PropertyService,
    private readonly redisCacheService: RedisCacheService,
    private readonly symbolProfileService: SymbolProfileService
  ) {}

  public calculateChangeInPercentage(baseValue: number, currentValue: number) {
    if (baseValue && currentValue) {
      return new Big(currentValue).div(baseValue).minus(1).toNumber();
    }

    return 0;
  }

  public async getBenchmarkTrends({
    dataSource,
    symbol
  }: AssetProfileIdentifier) {
    const historicalData = await this.marketDataService.marketDataItems({
      orderBy: {
        date: 'desc'
      },
      where: {
        dataSource,
        symbol,
        date: { gte: subDays(new Date(), 400) }
      }
    });

    const fiftyDayAverage = calculateBenchmarkTrend({
      historicalData,
      days: 50
    });
    const twoHundredDayAverage = calculateBenchmarkTrend({
      historicalData,
      days: 200
    });

    return { trend50d: fiftyDayAverage, trend200d: twoHundredDayAverage };
  }

  public async getBenchmarks({
    enableSharing = false,
    useCache = true
  } = {}): Promise<BenchmarkResponse['benchmarks']> {
    if (useCache) {
      try {
        const cachedBenchmarkValue = await this.redisCacheService.get(
          this.CACHE_KEY_BENCHMARKS
        );

        const { benchmarks, expiration }: BenchmarkValue =
          JSON.parse(cachedBenchmarkValue);

        Logger.debug('Fetched benchmarks from cache', 'BenchmarkService');

        if (isAfter(new Date(), new Date(expiration))) {
          this.calculateAndCacheBenchmarks({
            enableSharing
          });
        }

        return benchmarks;
      } catch {}
    }

    return this.calculateAndCacheBenchmarks({ enableSharing });
  }

  public async getBenchmarkAssetProfiles({
    enableSharing = false
  } = {}): Promise<Partial<SymbolProfile>[]> {
    const symbolProfileIds: string[] = (
      ((await this.propertyService.getByKey(
        PROPERTY_BENCHMARKS
      )) as BenchmarkProperty[]) ?? []
    )
      .filter((benchmark) => {
        if (enableSharing) {
          return benchmark.enableSharing;
        }

        return true;
      })
      .map(({ symbolProfileId }) => {
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
      .sort((a, b) => a.name?.localeCompare(b?.name) ?? 0);
  }

  public async addBenchmark({
    dataSource,
    symbol
  }: AssetProfileIdentifier): Promise<Partial<SymbolProfile>> {
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
  }: AssetProfileIdentifier): Promise<Partial<SymbolProfile>> {
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

  private async calculateAndCacheBenchmarks({
    enableSharing = false
  }): Promise<BenchmarkResponse['benchmarks']> {
    Logger.debug('Calculate benchmarks', 'BenchmarkService');

    const benchmarkAssetProfiles = await this.getBenchmarkAssetProfiles({
      enableSharing
    });

    const promisesAllTimeHighs: Promise<{ date: Date; marketPrice: number }>[] =
      [];
    const promisesBenchmarkTrends: Promise<{
      trend50d: BenchmarkTrend;
      trend200d: BenchmarkTrend;
    }>[] = [];

    const quotes = await this.dataProviderService.getQuotes({
      items: benchmarkAssetProfiles.map(({ dataSource, symbol }) => {
        return { dataSource, symbol };
      }),
      requestTimeout: ms('30 seconds'),
      useCache: false
    });

    for (const { dataSource, symbol } of benchmarkAssetProfiles) {
      promisesAllTimeHighs.push(
        this.marketDataService.getMax({ dataSource, symbol })
      );
      promisesBenchmarkTrends.push(
        this.getBenchmarkTrends({ dataSource, symbol })
      );
    }

    const [allTimeHighs, benchmarkTrends] = await Promise.all([
      Promise.all(promisesAllTimeHighs),
      Promise.all(promisesBenchmarkTrends)
    ]);
    let storeInCache = true;

    const benchmarks = allTimeHighs.map((allTimeHigh, index) => {
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
        dataSource: benchmarkAssetProfiles[index].dataSource,
        marketCondition: this.getMarketCondition(
          performancePercentFromAllTimeHigh
        ),
        name: benchmarkAssetProfiles[index].name,
        performances: {
          allTimeHigh: {
            date: allTimeHigh?.date,
            performancePercent:
              performancePercentFromAllTimeHigh >= 0
                ? 0
                : performancePercentFromAllTimeHigh
          }
        },
        symbol: benchmarkAssetProfiles[index].symbol,
        trend50d: benchmarkTrends[index].trend50d,
        trend200d: benchmarkTrends[index].trend200d
      };
    });

    if (!enableSharing && storeInCache) {
      const expiration = addHours(new Date(), 2);

      await this.redisCacheService.set(
        this.CACHE_KEY_BENCHMARKS,
        JSON.stringify({
          benchmarks,
          expiration: expiration.getTime()
        } as BenchmarkValue),
        CACHE_TTL_INFINITE
      );
    }

    return benchmarks;
  }

  private getMarketCondition(
    aPerformanceInPercent: number
  ): Benchmark['marketCondition'] {
    if (aPerformanceInPercent >= 0) {
      return 'ALL_TIME_HIGH';
    } else if (aPerformanceInPercent <= -0.2) {
      return 'BEAR_MARKET';
    } else {
      return 'NEUTRAL_MARKET';
    }
  }
}
