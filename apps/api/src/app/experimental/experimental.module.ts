import { AccountService } from '@ghostfolio/api/app/account/account.service';
import { RedisCacheModule } from '@ghostfolio/api/app/redis-cache/redis-cache.module';
import { ConfigurationModule } from '@ghostfolio/api/services/configuration.module';
import { DataProviderModule } from '@ghostfolio/api/services/data-provider/data-provider.module';
import { ExchangeRateDataModule } from '@ghostfolio/api/services/exchange-rate-data.module';
import { PrismaModule } from '@ghostfolio/api/services/prisma.module';
import { Module } from '@nestjs/common';

import { ExperimentalController } from './experimental.controller';
import { ExperimentalService } from './experimental.service';

@Module({
  imports: [
    ConfigurationModule,
    DataProviderModule,
    ExchangeRateDataModule,
    RedisCacheModule,
    PrismaModule
  ],
  controllers: [ExperimentalController],
  providers: [AccountService, ExperimentalService]
})
export class ExperimentalModule {}
