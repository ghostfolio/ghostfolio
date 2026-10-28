import { RedactValuesInResponseModule } from '@ghostfolio/api/interceptors/redact-values-in-response/redact-values-in-response.module';
import { TransformDataSourceInRequestModule } from '@ghostfolio/api/interceptors/transform-data-source-in-request/transform-data-source-in-request.module';
import { TransformDataSourceInResponseModule } from '@ghostfolio/api/interceptors/transform-data-source-in-response/transform-data-source-in-response.module';
import { ActivitiesModule as ActivitiesServiceModule } from '@ghostfolio/api/services/activities/activities.module';
import { ApiModule } from '@ghostfolio/api/services/api/api.module';
import { DataProviderModule } from '@ghostfolio/api/services/data-provider/data-provider.module';
import { ImpersonationModule } from '@ghostfolio/api/services/impersonation/impersonation.module';
import { DataGatheringQueueModule } from '@ghostfolio/api/services/queues/data-gathering/data-gathering.module';
import { RedisCacheModule } from '@ghostfolio/api/services/redis-cache/redis-cache.module';
import { SymbolProfileModule } from '@ghostfolio/api/services/symbol-profile/symbol-profile.module';

import { Module } from '@nestjs/common';

import { ActivitiesController } from './activities.controller';

@Module({
  controllers: [ActivitiesController],
  imports: [
    ActivitiesServiceModule,
    ApiModule,
    DataGatheringQueueModule,
    DataProviderModule,
    ImpersonationModule,
    RedactValuesInResponseModule,
    RedisCacheModule,
    SymbolProfileModule,
    TransformDataSourceInRequestModule,
    TransformDataSourceInResponseModule
  ]
})
export class ActivitiesModule {}
