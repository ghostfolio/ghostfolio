import { WatchlistValue } from '@ghostfolio/api/app/endpoints/watchlist/interfaces/watchlist-value.interface';
import { RedisCacheService } from '@ghostfolio/api/app/redis-cache/redis-cache.service';
import { BenchmarkService } from '@ghostfolio/api/services/benchmark/benchmark.service';
import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';
import { DataProviderService } from '@ghostfolio/api/services/data-provider/data-provider.service';
import { MarketDataService } from '@ghostfolio/api/services/market-data/market-data.service';
import { PrismaService } from '@ghostfolio/api/services/prisma/prisma.service';
import { SymbolProfileService } from '@ghostfolio/api/services/symbol-profile/symbol-profile.service';
import {
  CACHE_TTL_INFINITE,
  DEFAULT_PROCESSOR_WATCHLIST_COMPUTATION_CONCURRENCY,
  WATCHLIST_COMPUTATION_QUEUE,
  WATCHLIST_PROCESS_JOB_NAME
} from '@ghostfolio/common/config';
import { WatchlistResponse } from '@ghostfolio/common/interfaces';

import { Process, Processor } from '@nestjs/bull';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bull';
import { addMilliseconds } from 'date-fns';

import { WatchlistQueueJob } from './interfaces/watchlist-queue-job.interface';

@Injectable()
@Processor(WATCHLIST_COMPUTATION_QUEUE)
export class WatchlistProcessor {
  private readonly logger = new Logger(WatchlistProcessor.name);

  public constructor(
    private readonly benchmarkService: BenchmarkService,
    private readonly configurationService: ConfigurationService,
    private readonly dataProviderService: DataProviderService,
    private readonly marketDataService: MarketDataService,
    private readonly prismaService: PrismaService,
    private readonly redisCacheService: RedisCacheService,
    private readonly symbolProfileService: SymbolProfileService
  ) {}

  @Process({
    concurrency: parseInt(
      process.env.PROCESSOR_WATCHLIST_COMPUTATION_CONCURRENCY ??
        DEFAULT_PROCESSOR_WATCHLIST_COMPUTATION_CONCURRENCY.toString(),
      10
    ),
    name: WATCHLIST_PROCESS_JOB_NAME
  })
  public async calculateWatchlist(job: Job<WatchlistQueueJob>) {
    try {
      const startTime = performance.now();
      const { userId } = job.data;

      this.logger.log(
        `Watchlist calculation of user '${userId}' has been started`
      );

      const user = await this.prismaService.user.findUnique({
        select: {
          watchlist: {
            select: { dataSource: true, symbol: true }
          }
        },
        where: { id: userId }
      });

      const [assetProfiles, quotes] = await Promise.all([
        this.symbolProfileService.getSymbolProfiles(user.watchlist),
        this.dataProviderService.getQuotes({
          items: user.watchlist.map(({ dataSource, symbol }) => {
            return { dataSource, symbol };
          })
        })
      ]);

      let isComplete = user.watchlist.length > 0;

      const watchlist: WatchlistResponse['watchlist'] = await Promise.all(
        user.watchlist.map(async ({ dataSource, symbol }) => {
          const assetProfile = assetProfiles.find((profile) => {
            return (
              profile.dataSource === dataSource && profile.symbol === symbol
            );
          });

          const [allTimeHigh, trends] = await Promise.all([
            this.marketDataService.getMax({
              dataSource,
              symbol
            }),
            this.benchmarkService.getBenchmarkTrends({ dataSource, symbol })
          ]);

          if (!allTimeHigh?.marketPrice || !quotes[symbol]?.marketPrice) {
            isComplete = false;
          }

          const performancePercent =
            this.benchmarkService.calculateChangeInPercentage(
              allTimeHigh?.marketPrice,
              quotes[symbol]?.marketPrice
            );

          return {
            dataSource,
            symbol,
            marketCondition:
              this.benchmarkService.getMarketCondition(performancePercent),
            name: assetProfile?.name,
            performances: {
              allTimeHigh: {
                performancePercent,
                date: allTimeHigh?.date
              }
            },
            trend50d: trends.trend50d,
            trend200d: trends.trend200d
          };
        })
      );

      const sortedWatchlist = watchlist.sort((a, b) => {
        return a.name.localeCompare(b.name);
      });

      this.logger.log(
        `Watchlist calculation of user '${userId}' has been completed in ${(
          (performance.now() - startTime) /
          1000
        ).toFixed(3)} seconds`
      );

      const expiration = addMilliseconds(
        new Date(),
        isComplete ? this.configurationService.get('CACHE_QUOTES_TTL') : 0
      );

      await this.redisCacheService.set(
        this.redisCacheService.getWatchlistKey({ userId }),
        JSON.stringify({
          expiration: expiration.getTime(),
          watchlist: sortedWatchlist
        } as WatchlistValue),
        CACHE_TTL_INFINITE
      );

      return sortedWatchlist;
    } catch (error) {
      this.logger.error(error);

      throw new Error(error);
    }
  }
}
