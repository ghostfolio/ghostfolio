import { RedisCacheModule } from '@ghostfolio/api/app/redis-cache/redis-cache.module';
import { TransformDataSourceInRequestModule } from '@ghostfolio/api/interceptors/transform-data-source-in-request/transform-data-source-in-request.module';
import { TransformDataSourceInResponseModule } from '@ghostfolio/api/interceptors/transform-data-source-in-response/transform-data-source-in-response.module';
import { DataProviderModule } from '@ghostfolio/api/services/data-provider/data-provider.module';
import { ImpersonationModule } from '@ghostfolio/api/services/impersonation/impersonation.module';
import { PrismaModule } from '@ghostfolio/api/services/prisma/prisma.module';
import { DataGatheringQueueModule } from '@ghostfolio/api/services/queues/data-gathering/data-gathering.module';
import { WatchlistComputationQueueModule } from '@ghostfolio/api/services/queues/watchlist/watchlist.module';
import { SymbolProfileModule } from '@ghostfolio/api/services/symbol-profile/symbol-profile.module';

import { Module } from '@nestjs/common';

import { WatchlistController } from './watchlist.controller';
import { WatchlistService } from './watchlist.service';

@Module({
  controllers: [WatchlistController],
  imports: [
    DataGatheringQueueModule,
    DataProviderModule,
    ImpersonationModule,
    PrismaModule,
    RedisCacheModule,
    SymbolProfileModule,
    TransformDataSourceInRequestModule,
    TransformDataSourceInResponseModule,
    WatchlistComputationQueueModule
  ],
  providers: [WatchlistService]
})
export class WatchlistModule {}
