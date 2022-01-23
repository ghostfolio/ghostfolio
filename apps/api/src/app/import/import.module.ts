import { CacheService } from '@ghostfolio/api/app/cache/cache.service';
import { OrderModule } from '@ghostfolio/api/app/order/order.module';
import { RedisCacheModule } from '@ghostfolio/api/app/redis-cache/redis-cache.module';
import { ConfigurationModule } from '@ghostfolio/api/services/configuration.module';
import { DataGatheringModule } from '@ghostfolio/api/services/data-gathering.module';
import { DataProviderModule } from '@ghostfolio/api/services/data-provider/data-provider.module';
import { PrismaModule } from '@ghostfolio/api/services/prisma.module';
import { Module } from '@nestjs/common';

import { ImportController } from './import.controller';
import { ImportService } from './import.service';

@Module({
  imports: [
    ConfigurationModule,
    DataGatheringModule,
    DataProviderModule,
    OrderModule,
    PrismaModule,
    RedisCacheModule
  ],
  controllers: [ImportController],
  providers: [CacheService, ImportService]
})
export class ImportModule {}
