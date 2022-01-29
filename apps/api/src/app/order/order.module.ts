import { AccountService } from '@ghostfolio/api/app/account/account.service';
import { CacheService } from '@ghostfolio/api/app/cache/cache.service';
import { RedisCacheModule } from '@ghostfolio/api/app/redis-cache/redis-cache.module';
import { UserModule } from '@ghostfolio/api/app/user/user.module';
import { ConfigurationModule } from '@ghostfolio/api/services/configuration.module';
import { DataGatheringModule } from '@ghostfolio/api/services/data-gathering.module';
import { DataProviderModule } from '@ghostfolio/api/services/data-provider/data-provider.module';
import { ExchangeRateDataModule } from '@ghostfolio/api/services/exchange-rate-data.module';
import { ImpersonationModule } from '@ghostfolio/api/services/impersonation.module';
import { PrismaModule } from '@ghostfolio/api/services/prisma.module';
import { Module } from '@nestjs/common';

import { OrderController } from './order.controller';
import { OrderService } from './order.service';

@Module({
  imports: [
    ConfigurationModule,
    DataGatheringModule,
    DataProviderModule,
    ExchangeRateDataModule,
    ImpersonationModule,
    PrismaModule,
    RedisCacheModule,
    UserModule
  ],
  controllers: [OrderController],
  providers: [AccountService, CacheService, OrderService],
  exports: [OrderService]
})
export class OrderModule {}
