import { DataProviderModule } from '@ghostfolio/api/services/data-provider/data-provider.module';
import { Module } from '@nestjs/common';

import { RedisCacheModule } from '../redis-cache/redis-cache.module';
import { AccountController } from './account.controller';
import { AccountService } from './account.service';
import { ConfigurationModule } from '@ghostfolio/api/services/configuration.module';
import { PrismaModule } from '@ghostfolio/api/services/prisma.module';
import { ExchangeRateDataModule } from '@ghostfolio/api/services/exchange-rate-data.module';
import { ImpersonationModule } from '@ghostfolio/api/services/impersonation.module';

@Module({
  imports: [
    ConfigurationModule,
    DataProviderModule,
    ExchangeRateDataModule,
    ImpersonationModule,
    RedisCacheModule,
    PrismaModule
  ],
  controllers: [AccountController],
  providers: [AccountService]
})
export class AccountModule {}
