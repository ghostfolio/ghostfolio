import { CacheService } from '@ghostfolio/api/app/cache/cache.service';
import { RedisCacheModule } from '@ghostfolio/api/app/redis-cache/redis-cache.module';
import { Module } from '@nestjs/common';

import { ExportController } from './export.controller';
import { ExportService } from './export.service';
import { DataProviderModule } from '@ghostfolio/api/services/data-provider/data-provider.module';
import { ConfigurationModule } from '@ghostfolio/api/services/configuration.module';
import { PrismaModule } from '@ghostfolio/api/services/prisma.module';
import { DataGatheringModule } from '@ghostfolio/api/services/data-gathering.module';

@Module({
  imports: [
    ConfigurationModule,
    RedisCacheModule,
    DataProviderModule,
    DataGatheringModule,
    PrismaModule
  ],
  controllers: [ExportController],
  providers: [CacheService, ExportService]
})
export class ExportModule {}
