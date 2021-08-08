import { CacheService } from '@ghostfolio/api/app/cache/cache.service';
import { OrderService } from '@ghostfolio/api/app/order/order.service';
import { RedisCacheModule } from '@ghostfolio/api/app/redis-cache/redis-cache.module';
import { DataGatheringService } from '@ghostfolio/api/services/data-gathering.service';
import { Module } from '@nestjs/common';

import { ImportController } from './import.controller';
import { ImportService } from './import.service';
import { DataProviderModule } from '@ghostfolio/api/services/data-provider/data-provider.module';
import { ConfigurationModule } from '@ghostfolio/api/services/configuration.module';
import { PrismaModule } from '@ghostfolio/api/services/prisma.module';

@Module({
  imports: [
    ConfigurationModule,
    RedisCacheModule,
    DataProviderModule,
    PrismaModule
  ],
  controllers: [ImportController],
  providers: [CacheService, DataGatheringService, ImportService, OrderService]
})
export class ImportModule {}
