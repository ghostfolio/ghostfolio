import { RedisCacheModule } from '@ghostfolio/api/app/redis-cache/redis-cache.module';
import { BenchmarkModule } from '@ghostfolio/api/services/benchmark/benchmark.module';
import { ConfigurationModule } from '@ghostfolio/api/services/configuration/configuration.module';
import { DataProviderModule } from '@ghostfolio/api/services/data-provider/data-provider.module';
import { MarketDataModule } from '@ghostfolio/api/services/market-data/market-data.module';
import { PrismaModule } from '@ghostfolio/api/services/prisma/prisma.module';
import { WatchlistComputationService } from '@ghostfolio/api/services/queues/watchlist/watchlist-computation.service';
import { SymbolProfileModule } from '@ghostfolio/api/services/symbol-profile/symbol-profile.module';
import {
  DEFAULT_PROCESSOR_WATCHLIST_COMPUTATION_TIMEOUT,
  WATCHLIST_COMPUTATION_QUEUE
} from '@ghostfolio/common/config';

import { BullAdapter } from '@bull-board/api/bullAdapter';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';

import { WatchlistProcessor } from './watchlist.processor';

@Module({
  exports: [BullModule, WatchlistComputationService],
  imports: [
    BenchmarkModule,
    BullBoardModule.forFeature({
      adapter: BullAdapter,
      name: WATCHLIST_COMPUTATION_QUEUE,
      options: {
        displayName: 'Watchlist Computation',
        readOnlyMode: process.env.BULL_BOARD_IS_READ_ONLY !== 'false'
      }
    }),
    BullModule.registerQueue({
      name: WATCHLIST_COMPUTATION_QUEUE,
      settings: {
        lockDuration: parseInt(
          process.env.PROCESSOR_WATCHLIST_COMPUTATION_TIMEOUT ??
            DEFAULT_PROCESSOR_WATCHLIST_COMPUTATION_TIMEOUT.toString(),
          10
        )
      }
    }),
    ConfigurationModule,
    DataProviderModule,
    MarketDataModule,
    PrismaModule,
    RedisCacheModule,
    SymbolProfileModule
  ],
  providers: [WatchlistComputationService, WatchlistProcessor]
})
export class WatchlistComputationQueueModule {}
