import { TransformDataSourceInRequestModule } from '@ghostfolio/api/interceptors/transform-data-source-in-request/transform-data-source-in-request.module';
import { TransformDataSourceInResponseModule } from '@ghostfolio/api/interceptors/transform-data-source-in-response/transform-data-source-in-response.module';
import { DataProviderModule } from '@ghostfolio/api/services/data-provider/data-provider.module';
import { ImpersonationModule } from '@ghostfolio/api/services/impersonation/impersonation.module';
import { PrismaModule } from '@ghostfolio/api/services/prisma/prisma.module';
import { DataGatheringModule } from '@ghostfolio/api/services/queues/data-gathering/data-gathering.module';
import { SymbolProfileModule } from '@ghostfolio/api/services/symbol-profile/symbol-profile.module';

import { Module } from '@nestjs/common';

import { WatchlistController } from './watchlist.controller';
import { WatchlistService } from './watchlist.service';

@Module({
  controllers: [WatchlistController],
  imports: [
    DataGatheringModule,
    DataProviderModule,
    ImpersonationModule,
    PrismaModule,
    SymbolProfileModule,
    TransformDataSourceInRequestModule,
    TransformDataSourceInResponseModule
  ],
  providers: [WatchlistService]
})
export class WatchlistModule {}
