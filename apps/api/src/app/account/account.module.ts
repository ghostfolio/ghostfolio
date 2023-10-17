import { PortfolioModule } from '@ghostfolio/api/app/portfolio/portfolio.module';
import { RedisCacheModule } from '@ghostfolio/api/app/redis-cache/redis-cache.module';
import { UserModule } from '@ghostfolio/api/app/user/user.module';
import { AccountBalanceModule } from '@ghostfolio/api/services/account-balance/account-balance.module';
import { ConfigurationModule } from '@ghostfolio/api/services/configuration/configuration.module';
import { DataProviderModule } from '@ghostfolio/api/services/data-provider/data-provider.module';
import { ExchangeRateDataModule } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.module';
import { ImpersonationModule } from '@ghostfolio/api/services/impersonation/impersonation.module';
import { PrismaModule } from '@ghostfolio/api/services/prisma/prisma.module';
import { Module } from '@nestjs/common';

import { AccountController } from './account.controller';
import { AccountService } from './account.service';
import { I18nModule } from '@ghostfolio/api/services/i18n/i18n.module';

@Module({
  controllers: [AccountController],
  exports: [AccountService],
  imports: [
    AccountBalanceModule,
    ConfigurationModule,
    DataProviderModule,
    ExchangeRateDataModule,
    ImpersonationModule,
    I18nModule,
    PortfolioModule,
    PrismaModule,
    RedisCacheModule,
    UserModule
  ],
  providers: [AccountService]
})
export class AccountModule {}
