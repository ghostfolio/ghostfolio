import { RedisCacheModule } from '@ghostfolio/api/app/redis-cache/redis-cache.module';
import { ConfigurationModule } from '@ghostfolio/api/services/configuration.module';
import { DataGatheringModule } from '@ghostfolio/api/services/data-gathering.module';
import { DataProviderModule } from '@ghostfolio/api/services/data-provider/data-provider.module';
import { ExchangeRateDataModule } from '@ghostfolio/api/services/exchange-rate-data.module';
import { PrismaModule } from '@ghostfolio/api/services/prisma.module';
import { SymbolProfileModule } from '@ghostfolio/api/services/symbol-profile.module';
import { Module } from '@nestjs/common';

import { CacheController } from './cache.controller';

@Module({
  controllers: [CacheController],
  imports: [
    ConfigurationModule,
    DataGatheringModule,
    DataProviderModule,
    ExchangeRateDataModule,
    PrismaModule,
    RedisCacheModule,
    SymbolProfileModule
  ]
})
export class CacheModule {}
