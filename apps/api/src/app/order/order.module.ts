import { AccountBalanceService } from '@ghostfolio/api/app/account-balance/account-balance.service';
import { AccountService } from '@ghostfolio/api/app/account/account.service';
import { CacheModule } from '@ghostfolio/api/app/cache/cache.module';
import { RedisCacheModule } from '@ghostfolio/api/app/redis-cache/redis-cache.module';
import { UserModule } from '@ghostfolio/api/app/user/user.module';
import { ApiModule } from '@ghostfolio/api/services/api/api.module';
import { ConfigurationModule } from '@ghostfolio/api/services/configuration/configuration.module';
import { DataGatheringModule } from '@ghostfolio/api/services/data-gathering/data-gathering.module';
import { DataProviderModule } from '@ghostfolio/api/services/data-provider/data-provider.module';
import { ExchangeRateDataModule } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.module';
import { ImpersonationModule } from '@ghostfolio/api/services/impersonation/impersonation.module';
import { PrismaModule } from '@ghostfolio/api/services/prisma/prisma.module';
import { SymbolProfileModule } from '@ghostfolio/api/services/symbol-profile/symbol-profile.module';

import { Module } from '@nestjs/common';

import { OrderController } from './order.controller';
import { OrderService } from './order.service';

@Module({
  controllers: [OrderController],
  exports: [OrderService],
  imports: [
    ApiModule,
    CacheModule,
    ConfigurationModule,
    DataGatheringModule,
    DataProviderModule,
    ExchangeRateDataModule,
    ImpersonationModule,
    PrismaModule,
    RedisCacheModule,
    SymbolProfileModule,
    UserModule
  ],
  providers: [AccountBalanceService, AccountService, OrderService]
})
export class OrderModule {}
