import { DataProviderModule } from '@ghostfolio/api/services/data-provider/data-provider.module';
import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data.service';
import { ImpersonationService } from '@ghostfolio/api/services/impersonation.service';
import { Module } from '@nestjs/common';

import { RedisCacheModule } from '../redis-cache/redis-cache.module';
import { AccountController } from './account.controller';
import { AccountService } from './account.service';
import { ConfigurationModule } from '@ghostfolio/api/services/configuration.module';
import { PrismaModule } from '@ghostfolio/api/services/prisma.module';

@Module({
  imports: [
    ConfigurationModule,
    RedisCacheModule,
    DataProviderModule,
    PrismaModule
  ],
  controllers: [AccountController],
  providers: [AccountService, ExchangeRateDataService, ImpersonationService]
})
export class AccountModule {}
