import { PortfolioModule } from '@ghostfolio/api/app/portfolio/portfolio.module';
import { TransformDataSourceInRequestModule } from '@ghostfolio/api/interceptors/transform-data-source-in-request/transform-data-source-in-request.module';
import { TransformDataSourceInResponseModule } from '@ghostfolio/api/interceptors/transform-data-source-in-response/transform-data-source-in-response.module';
import { ApiModule } from '@ghostfolio/api/services/api/api.module';
import { BenchmarkModule } from '@ghostfolio/api/services/benchmark/benchmark.module';
import { ConfigurationModule } from '@ghostfolio/api/services/configuration/configuration.module';
import { ExchangeRateDataModule } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.module';
import { ImpersonationModule } from '@ghostfolio/api/services/impersonation/impersonation.module';
import { MarketDataModule } from '@ghostfolio/api/services/market-data/market-data.module';
import { SymbolModule } from '@ghostfolio/api/services/symbol/symbol.module';

import { Module } from '@nestjs/common';

import { BenchmarksController } from './benchmarks.controller';
import { BenchmarksService } from './benchmarks.service';

@Module({
  controllers: [BenchmarksController],
  imports: [
    ApiModule,
    BenchmarkModule,
    ConfigurationModule,
    ExchangeRateDataModule,
    ImpersonationModule,
    MarketDataModule,
    PortfolioModule,
    SymbolModule,
    TransformDataSourceInRequestModule,
    TransformDataSourceInResponseModule
  ],
  providers: [BenchmarksService]
})
export class BenchmarksModule {}
