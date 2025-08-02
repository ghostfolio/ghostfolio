import { RedisCacheModule } from '@ghostfolio/api/app/redis-cache/redis-cache.module';
import { DataProviderModule } from '@ghostfolio/api/services/data-provider/data-provider.module';
import { MarketDataModule } from '@ghostfolio/api/services/market-data/market-data.module';
import { PrismaModule } from '@ghostfolio/api/services/prisma/prisma.module';
import { PropertyModule } from '@ghostfolio/api/services/property/property.module';
import { SymbolProfileModule } from '@ghostfolio/api/services/symbol-profile/symbol-profile.module';

import { Module } from '@nestjs/common';

import { BenchmarkService } from './benchmark.service';

@Module({
  exports: [BenchmarkService],
  imports: [
    DataProviderModule,
    MarketDataModule,
    PrismaModule,
    PropertyModule,
    RedisCacheModule,
    SymbolProfileModule
  ],
  providers: [BenchmarkService]
})
export class BenchmarkModule {}
