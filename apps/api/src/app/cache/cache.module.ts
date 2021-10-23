import { CacheService } from '@ghostfolio/api/app/cache/cache.service';
import { RedisCacheModule } from '@ghostfolio/api/app/redis-cache/redis-cache.module';
import { ConfigurationService } from '@ghostfolio/api/services/configuration.service';
import { DataGatheringModule } from '@ghostfolio/api/services/data-gathering.module';
import { DataGatheringService } from '@ghostfolio/api/services/data-gathering.service';
import { DataProviderModule } from '@ghostfolio/api/services/data-provider/data-provider.module';
import { ExchangeRateDataModule } from '@ghostfolio/api/services/exchange-rate-data.module';
import { PrismaService } from '@ghostfolio/api/services/prisma.service';
import { Module } from '@nestjs/common';

import { CacheController } from './cache.controller';

@Module({
  imports: [
    DataGatheringModule,
    DataProviderModule,
    ExchangeRateDataModule,
    RedisCacheModule
  ],
  controllers: [CacheController],
  providers: [
    CacheService,
    ConfigurationService,
    DataGatheringService,
    PrismaService
  ]
})
export class CacheModule {}
