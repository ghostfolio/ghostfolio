import { RedisCacheService } from '@ghostfolio/api/app/redis-cache/redis-cache.service';
import { DataProviderService } from '@ghostfolio/api/services/data-provider/data-provider.service';
import { PrismaService } from '@ghostfolio/api/services/prisma/prisma.service';
import { DataGatheringService } from '@ghostfolio/api/services/queues/data-gathering/data-gathering.service';
import { WatchlistComputationService } from '@ghostfolio/api/services/queues/watchlist/watchlist-computation.service';
import { SymbolProfileService } from '@ghostfolio/api/services/symbol-profile/symbol-profile.service';
import {
  WATCHLIST_COMPUTATION_QUEUE_PRIORITY_HIGH,
  WATCHLIST_COMPUTATION_QUEUE_PRIORITY_LOW,
  WATCHLIST_PROCESS_JOB_NAME,
  WATCHLIST_PROCESS_JOB_OPTIONS
} from '@ghostfolio/common/config';
import { WatchlistResponse } from '@ghostfolio/common/interfaces';

import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { DataSource, Prisma } from '@prisma/client';
import { isAfter } from 'date-fns';

import { WatchlistValue } from './interfaces/watchlist-value.interface';

@Injectable()
export class WatchlistService {
  private readonly logger = new Logger(WatchlistService.name);

  public constructor(
    private readonly dataGatheringService: DataGatheringService,
    private readonly dataProviderService: DataProviderService,
    private readonly prismaService: PrismaService,
    private readonly redisCacheService: RedisCacheService,
    private readonly symbolProfileService: SymbolProfileService,
    private readonly watchlistComputationService: WatchlistComputationService
  ) {}

  public async createWatchlistItem({
    dataSource,
    symbol,
    userId
  }: {
    dataSource: DataSource;
    symbol: string;
    userId: string;
  }): Promise<void> {
    const symbolProfile = await this.prismaService.symbolProfile.findUnique({
      where: {
        dataSource_symbol: { dataSource, symbol }
      }
    });

    if (!symbolProfile) {
      const assetProfiles = await this.dataProviderService.getAssetProfiles([
        { dataSource, symbol }
      ]);

      if (!assetProfiles[symbol]?.currency) {
        throw new BadRequestException(
          `Asset profile not found for ${symbol} (${dataSource})`
        );
      }

      await this.symbolProfileService.add(
        assetProfiles[symbol] as Prisma.SymbolProfileCreateInput
      );
    }

    await this.dataGatheringService.gatherSymbol({
      dataSource,
      symbol
    });

    await this.prismaService.user.update({
      data: {
        watchlist: {
          connect: {
            dataSource_symbol: { dataSource, symbol }
          }
        }
      },
      where: { id: userId }
    });

    await this.redisCacheService.remove(
      this.redisCacheService.getWatchlistKey({ userId })
    );
  }

  public async deleteWatchlistItem({
    dataSource,
    symbol,
    userId
  }: {
    dataSource: DataSource;
    symbol: string;
    userId: string;
  }) {
    await this.prismaService.user.update({
      data: {
        watchlist: {
          disconnect: {
            dataSource_symbol: { dataSource, symbol }
          }
        }
      },
      where: { id: userId }
    });

    await this.redisCacheService.remove(
      this.redisCacheService.getWatchlistKey({ userId })
    );
  }

  public async getWatchlistItems(
    userId: string
  ): Promise<WatchlistResponse['watchlist']> {
    let cachedWatchlist: WatchlistResponse['watchlist'];
    let isCachedWatchlistExpired = false;

    try {
      const cachedWatchlistValue = await this.redisCacheService.get(
        this.redisCacheService.getWatchlistKey({ userId })
      );

      const { expiration, watchlist }: WatchlistValue =
        JSON.parse(cachedWatchlistValue);

      cachedWatchlist = watchlist;

      if (isAfter(new Date(), new Date(expiration))) {
        isCachedWatchlistExpired = true;
      }
    } catch {}

    if (cachedWatchlist) {
      this.logger.debug(`Fetched watchlist of user '${userId}' from cache`);

      if (isCachedWatchlistExpired) {
        // Compute in the background
        this.watchlistComputationService.addJobToQueue({
          data: { userId },
          name: WATCHLIST_PROCESS_JOB_NAME,
          opts: {
            ...WATCHLIST_PROCESS_JOB_OPTIONS,
            jobId: userId,
            priority: WATCHLIST_COMPUTATION_QUEUE_PRIORITY_LOW
          }
        });
      }

      return cachedWatchlist;
    }

    // Wait for computation
    await this.watchlistComputationService.addJobToQueue({
      data: { userId },
      name: WATCHLIST_PROCESS_JOB_NAME,
      opts: {
        ...WATCHLIST_PROCESS_JOB_OPTIONS,
        jobId: userId,
        priority: WATCHLIST_COMPUTATION_QUEUE_PRIORITY_HIGH
      }
    });

    const job = await this.watchlistComputationService.getJob(userId);

    if (job) {
      await job.finished();
    }

    return this.getWatchlistItems(userId);
  }
}
