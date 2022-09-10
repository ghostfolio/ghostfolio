import { RedisCacheModule } from '@ghostfolio/api/app/redis-cache/redis-cache.module';
import { SymbolModule } from '@ghostfolio/api/app/symbol/symbol.module';
import { ConfigurationModule } from '@ghostfolio/api/services/configuration.module';
import { DataProviderModule } from '@ghostfolio/api/services/data-provider/data-provider.module';
import { MarketDataModule } from '@ghostfolio/api/services/market-data.module';
import { PropertyModule } from '@ghostfolio/api/services/property/property.module';
import { SymbolProfileModule } from '@ghostfolio/api/services/symbol-profile.module';
import { Module } from '@nestjs/common';

import { BenchmarkController } from './benchmark.controller';
import { BenchmarkService } from './benchmark.service';

@Module({
  controllers: [BenchmarkController],
  exports: [BenchmarkService],
  imports: [
    ConfigurationModule,
    DataProviderModule,
    MarketDataModule,
    PropertyModule,
    RedisCacheModule,
    SymbolModule,
    SymbolProfileModule
  ],
  providers: [BenchmarkService]
})
export class BenchmarkModule {}
