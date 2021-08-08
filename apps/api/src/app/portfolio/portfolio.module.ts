import { AccountService } from '@ghostfolio/api/app/account/account.service';
import { CacheService } from '@ghostfolio/api/app/cache/cache.service';
import { CurrentRateService } from '@ghostfolio/api/app/core/current-rate.service';
import { MarketDataService } from '@ghostfolio/api/app/core/market-data.service';
import { OrderService } from '@ghostfolio/api/app/order/order.service';
import { RedisCacheModule } from '@ghostfolio/api/app/redis-cache/redis-cache.module';
import { UserService } from '@ghostfolio/api/app/user/user.service';
import { RulesService } from '@ghostfolio/api/services/rules.service';
import { SymbolProfileService } from '@ghostfolio/api/services/symbol-profile.service';
import { Module } from '@nestjs/common';

import { PortfolioController } from './portfolio.controller';
import { PortfolioService } from './portfolio.service';
import { DataProviderModule } from '@ghostfolio/api/services/data-provider/data-provider.module';
import { ConfigurationModule } from '@ghostfolio/api/services/configuration.module';
import { PrismaModule } from '@ghostfolio/api/services/prisma.module';
import { DataGatheringModule } from '@ghostfolio/api/services/data-gathering.module';
import { ExchangeRateDataModule } from '@ghostfolio/api/services/exchange-rate-data.module';
import { ImpersonationModule } from '@ghostfolio/api/services/impersonation.module';

@Module({
  imports: [
    ConfigurationModule,
    DataProviderModule,
    DataGatheringModule,
    ExchangeRateDataModule,
    ImpersonationModule,
    RedisCacheModule,
    PrismaModule
  ],
  controllers: [PortfolioController],
  providers: [
    AccountService,
    CacheService,
    CurrentRateService,
    MarketDataService,
    OrderService,
    PortfolioService,
    RulesService,
    SymbolProfileService,
    UserService
  ]
})
export class PortfolioModule {}
