import { PerformanceLoggingModule } from '@ghostfolio/api/interceptors/performance-logging/performance-logging.module';
import { RedactValuesInResponseModule } from '@ghostfolio/api/interceptors/redact-values-in-response/redact-values-in-response.module';
import { TransformDataSourceInRequestModule } from '@ghostfolio/api/interceptors/transform-data-source-in-request/transform-data-source-in-request.module';
import { TransformDataSourceInResponseModule } from '@ghostfolio/api/interceptors/transform-data-source-in-response/transform-data-source-in-response.module';
import { AccessModule } from '@ghostfolio/api/services/access/access.module';
import { AccountBalanceModule } from '@ghostfolio/api/services/account-balance/account-balance.module';
import { AccountModule } from '@ghostfolio/api/services/account/account.module';
import { ActivitiesModule } from '@ghostfolio/api/services/activities/activities.module';
import { ApiModule } from '@ghostfolio/api/services/api/api.module';
import { BenchmarkModule } from '@ghostfolio/api/services/benchmark/benchmark.module';
import { ConfigurationModule } from '@ghostfolio/api/services/configuration/configuration.module';
import { DataProviderModule } from '@ghostfolio/api/services/data-provider/data-provider.module';
import { ExchangeRateDataModule } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.module';
import { I18nModule } from '@ghostfolio/api/services/i18n/i18n.module';
import { ImpersonationModule } from '@ghostfolio/api/services/impersonation/impersonation.module';
import { MarketDataModule } from '@ghostfolio/api/services/market-data/market-data.module';
import { DataGatheringQueueModule } from '@ghostfolio/api/services/queues/data-gathering/data-gathering.module';
import { PortfolioSnapshotQueueModule } from '@ghostfolio/api/services/queues/portfolio-snapshot/portfolio-snapshot.module';
import { RedisCacheModule } from '@ghostfolio/api/services/redis-cache/redis-cache.module';
import { SymbolProfileModule } from '@ghostfolio/api/services/symbol-profile/symbol-profile.module';
import { UserModule } from '@ghostfolio/api/services/user/user.module';

import { Module } from '@nestjs/common';

import { PortfolioCalculatorFactory } from './calculator/portfolio-calculator.factory';
import { CurrentRateService } from './current-rate.service';
import { PortfolioController } from './portfolio.controller';
import { PortfolioService } from './portfolio.service';
import { RulesService } from './rules.service';

@Module({
  controllers: [PortfolioController],
  exports: [PortfolioService],
  imports: [
    AccessModule,
    AccountBalanceModule,
    AccountModule,
    ActivitiesModule,
    ApiModule,
    BenchmarkModule,
    ConfigurationModule,
    DataGatheringQueueModule,
    DataProviderModule,
    ExchangeRateDataModule,
    I18nModule,
    ImpersonationModule,
    MarketDataModule,
    PerformanceLoggingModule,
    PortfolioSnapshotQueueModule,
    RedactValuesInResponseModule,
    RedisCacheModule,
    SymbolProfileModule,
    TransformDataSourceInRequestModule,
    TransformDataSourceInResponseModule,
    UserModule
  ],
  providers: [
    CurrentRateService,
    PortfolioCalculatorFactory,
    PortfolioService,
    RulesService
  ]
})
export class PortfolioModule {}
