import { RedisCacheService } from '@ghostfolio/api/app/redis-cache/redis-cache.service';
import { DataProviderService } from '@ghostfolio/api/services/data-provider/data-provider.service';
import { MarketDataService } from '@ghostfolio/api/services/market-data.service';
import { PropertyService } from '@ghostfolio/api/services/property/property.service';
import { SymbolProfileService } from '@ghostfolio/api/services/symbol-profile.service';
import { PROPERTY_BENCHMARKS } from '@ghostfolio/common/config';
import { BenchmarkResponse, UniqueAsset } from '@ghostfolio/common/interfaces';
import { Injectable } from '@nestjs/common';
import Big from 'big.js';
import ms from 'ms';

@Injectable()
export class BenchmarkService {
  private readonly CACHE_KEY_BENCHMARKS = 'BENCHMARKS';

  public constructor(
    private readonly dataProviderService: DataProviderService,
    private readonly marketDataService: MarketDataService,
    private readonly propertyService: PropertyService,
    private readonly redisCacheService: RedisCacheService,
    private readonly symbolProfileService: SymbolProfileService
  ) {}

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

    const benchmarkAssets: UniqueAsset[] =
      ((await this.propertyService.getByKey(
        PROPERTY_BENCHMARKS
      )) as UniqueAsset[]) ?? [];
    const promises: Promise<number>[] = [];

    const [quotes, assetProfiles] = await Promise.all([
      this.dataProviderService.getQuotes(benchmarkAssets),
      this.symbolProfileService.getSymbolProfiles(benchmarkAssets)
    ]);

    for (const benchmarkAsset of benchmarkAssets) {
      promises.push(this.marketDataService.getMax(benchmarkAsset));
    }

    const allTimeHighs = await Promise.all(promises);

    benchmarks = allTimeHighs.map((allTimeHigh, index) => {
      const { marketPrice } = quotes[benchmarkAssets[index].symbol];

      let performancePercentFromAllTimeHigh = new Big(0);

      if (allTimeHigh) {
        performancePercentFromAllTimeHigh = new Big(marketPrice)
          .div(allTimeHigh)
          .minus(1);
      }

      return {
        marketCondition: this.getMarketCondition(
          performancePercentFromAllTimeHigh
        ),
        name: assetProfiles.find(({ dataSource, symbol }) => {
          return (
            dataSource === benchmarkAssets[index].dataSource &&
            symbol === benchmarkAssets[index].symbol
          );
        })?.name,
        performances: {
          allTimeHigh: {
            performancePercent: performancePercentFromAllTimeHigh.toNumber()
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

  private getMarketCondition(aPerformanceInPercent: Big) {
    return aPerformanceInPercent.lte(-0.2) ? 'BEAR_MARKET' : 'NEUTRAL_MARKET';
  }
}
