import { RedisCacheModule } from '@ghostfolio/api/app/redis-cache/redis-cache.module';
import { TransformDataSourceInRequestModule } from '@ghostfolio/api/interceptors/transform-data-source-in-request/transform-data-source-in-request.module';
import { DataEnhancerModule } from '@ghostfolio/api/services/data-provider/data-enhancer/data-enhancer.module';
import { DataProviderModule } from '@ghostfolio/api/services/data-provider/data-provider.module';
import { PropertyModule } from '@ghostfolio/api/services/property/property.module';

import { Module } from '@nestjs/common';

import { HealthController } from './health.controller';
import { HealthService } from './health.service';

@Module({
  controllers: [HealthController],
  imports: [
    DataEnhancerModule,
    DataProviderModule,
    PropertyModule,
    RedisCacheModule,
    TransformDataSourceInRequestModule
  ],
  providers: [HealthService]
})
export class HealthModule {}
