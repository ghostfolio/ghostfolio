import { ActivitiesModule } from '@ghostfolio/api/app/activities/activities.module';
import { PortfolioCalculatorFactory } from '@ghostfolio/api/app/portfolio/calculator/portfolio-calculator.factory';
import { CurrentRateService } from '@ghostfolio/api/app/portfolio/current-rate.service';
import { PortfolioService } from '@ghostfolio/api/app/portfolio/portfolio.service';
import { RulesService } from '@ghostfolio/api/app/portfolio/rules.service';
import { UserModule } from '@ghostfolio/api/app/user/user.module';
import { TransformDataSourceInRequestModule } from '@ghostfolio/api/interceptors/transform-data-source-in-request/transform-data-source-in-request.module';
import { AccessModule } from '@ghostfolio/api/services/access/access.module';
import { AccountBalanceModule } from '@ghostfolio/api/services/account-balance/account-balance.module';
import { AccountModule } from '@ghostfolio/api/services/account/account.module';
import { BenchmarkModule } from '@ghostfolio/api/services/benchmark/benchmark.module';
import { DataProviderModule } from '@ghostfolio/api/services/data-provider/data-provider.module';
import { ExchangeRateDataModule } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.module';
import { I18nModule } from '@ghostfolio/api/services/i18n/i18n.module';
import { ImpersonationModule } from '@ghostfolio/api/services/impersonation/impersonation.module';
import { MarketDataModule } from '@ghostfolio/api/services/market-data/market-data.module';
import { PortfolioSnapshotQueueModule } from '@ghostfolio/api/services/queues/portfolio-snapshot/portfolio-snapshot.module';
import { RedisCacheModule } from '@ghostfolio/api/services/redis-cache/redis-cache.module';
import { SymbolProfileModule } from '@ghostfolio/api/services/symbol-profile/symbol-profile.module';

import { Module } from '@nestjs/common';

import { PublicController } from './public.controller';
import { PublicService } from './public.service';

@Module({
  controllers: [PublicController],
  imports: [
    AccessModule,
    AccountBalanceModule,
    AccountModule,
    ActivitiesModule,
    BenchmarkModule,
    DataProviderModule,
    ExchangeRateDataModule,
    I18nModule,
    ImpersonationModule,
    MarketDataModule,
    PortfolioSnapshotQueueModule,
    RedisCacheModule,
    SymbolProfileModule,
    TransformDataSourceInRequestModule,
    UserModule
  ],
  providers: [
    CurrentRateService,
    PortfolioCalculatorFactory,
    PortfolioService,
    PublicService,
    RulesService
  ]
})
export class PublicModule {}
