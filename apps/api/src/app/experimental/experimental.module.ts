import { AccountService } from '@ghostfolio/api/app/account/account.service';
import { RedisCacheModule } from '@ghostfolio/api/app/redis-cache/redis-cache.module';
import { RulesService } from '@ghostfolio/api/services/rules.service';
import { Module } from '@nestjs/common';

import { ExperimentalController } from './experimental.controller';
import { ExperimentalService } from './experimental.service';
import { DataProviderModule } from '@ghostfolio/api/services/data-provider/data-provider.module';
import { ConfigurationModule } from '@ghostfolio/api/services/configuration.module';
import { PrismaModule } from '@ghostfolio/api/services/prisma.module';
import { ExchangeRateDataModule } from '@ghostfolio/api/services/exchange-rate-data.module';

@Module({
  imports: [
    ConfigurationModule,
    DataProviderModule,
    ExchangeRateDataModule,
    RedisCacheModule,
    PrismaModule
  ],
  controllers: [ExperimentalController],
  providers: [AccountService, ExperimentalService, RulesService]
})
export class ExperimentalModule {}
