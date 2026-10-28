import { PortfolioModule } from '@ghostfolio/api/app/portfolio/portfolio.module';
import { SymbolModule } from '@ghostfolio/api/app/symbol/symbol.module';
import { TransformDataSourceInRequestModule } from '@ghostfolio/api/interceptors/transform-data-source-in-request/transform-data-source-in-request.module';
import { TransformDataSourceInResponseModule } from '@ghostfolio/api/interceptors/transform-data-source-in-response/transform-data-source-in-response.module';
import { ApiModule } from '@ghostfolio/api/services/api/api.module';
import { BenchmarkService } from '@ghostfolio/api/services/benchmark/benchmark.service';
import { ConfigurationModule } from '@ghostfolio/api/services/configuration/configuration.module';
import { DataProviderModule } from '@ghostfolio/api/services/data-provider/data-provider.module';
import { ExchangeRateDataModule } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.module';
import { ImpersonationModule } from '@ghostfolio/api/services/impersonation/impersonation.module';
import { MarketDataModule } from '@ghostfolio/api/services/market-data/market-data.module';
import { MarketDataService } from '@ghostfolio/api/services/market-data/market-data.service';
import { PrismaModule } from '@ghostfolio/api/services/prisma/prisma.module';
import { PropertyModule } from '@ghostfolio/api/services/property/property.module';
import { RedisCacheModule } from '@ghostfolio/api/services/redis-cache/redis-cache.module';
import { SymbolProfileModule } from '@ghostfolio/api/services/symbol-profile/symbol-profile.module';

import { Module } from '@nestjs/common';

import { BenchmarksController } from './benchmarks.controller';
import { BenchmarksService } from './benchmarks.service';

@Module({
  controllers: [BenchmarksController],
  imports: [
    ApiModule,
    ConfigurationModule,
    DataProviderModule,
    ExchangeRateDataModule,
    ImpersonationModule,
    MarketDataModule,
    PortfolioModule,
    PrismaModule,
    PropertyModule,
    RedisCacheModule,
    SymbolModule,
    SymbolProfileModule,
    TransformDataSourceInRequestModule,
    TransformDataSourceInResponseModule
  ],
  providers: [BenchmarkService, BenchmarksService, MarketDataService]
})
export class BenchmarksModule {}
