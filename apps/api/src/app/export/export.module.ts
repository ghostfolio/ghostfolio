import { AccountModule } from '@ghostfolio/api/app/account/account.module';
import { OrderModule } from '@ghostfolio/api/app/order/order.module';
import { RedisCacheModule } from '@ghostfolio/api/app/redis-cache/redis-cache.module';
import { ApiModule } from '@ghostfolio/api/services/api/api.module';
import { ConfigurationModule } from '@ghostfolio/api/services/configuration/configuration.module';
import { DataGatheringModule } from '@ghostfolio/api/services/data-gathering/data-gathering.module';
import { DataProviderModule } from '@ghostfolio/api/services/data-provider/data-provider.module';

import { Module } from '@nestjs/common';

import { ExportController } from './export.controller';
import { ExportService } from './export.service';

@Module({
  imports: [
    AccountModule,
    ApiModule,
    ConfigurationModule,
    DataGatheringModule,
    DataProviderModule,
    OrderModule,
    RedisCacheModule
  ],
  controllers: [ExportController],
  providers: [ExportService]
})
export class ExportModule {}
