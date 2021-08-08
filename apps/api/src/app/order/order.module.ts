import { ConfigurationService } from '@ghostfolio/api/services/configuration.service';
import { DataGatheringService } from '@ghostfolio/api/services/data-gathering.service';
import { ImpersonationService } from '@ghostfolio/api/services/impersonation.service';
import { PrismaService } from '@ghostfolio/api/services/prisma.service';
import { Module } from '@nestjs/common';

import { CacheService } from '../cache/cache.service';
import { RedisCacheModule } from '../redis-cache/redis-cache.module';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';
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
  controllers: [OrderController],
  providers: [
    CacheService,
    DataGatheringService,
    ImpersonationService,
    OrderService
  ]
})
export class OrderModule {}
