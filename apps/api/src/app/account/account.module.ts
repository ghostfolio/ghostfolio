import { AccountBalanceModule } from '@ghostfolio/api/app/account-balance/account-balance.module';
import { PortfolioModule } from '@ghostfolio/api/app/portfolio/portfolio.module';
import { RedactValuesInResponseModule } from '@ghostfolio/api/interceptors/redact-values-in-response/redact-values-in-response.module';
import { ConfigurationModule } from '@ghostfolio/api/services/configuration/configuration.module';
import { ExchangeRateDataModule } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.module';
import { ImpersonationModule } from '@ghostfolio/api/services/impersonation/impersonation.module';
import { PrismaModule } from '@ghostfolio/api/services/prisma/prisma.module';

import { Module } from '@nestjs/common';

import { AccountController } from './account.controller';
import { AccountService } from './account.service';

@Module({
  controllers: [AccountController],
  exports: [AccountService],
  imports: [
    AccountBalanceModule,
    ConfigurationModule,
    ExchangeRateDataModule,
    ImpersonationModule,
    PortfolioModule,
    PrismaModule,
    RedactValuesInResponseModule
  ],
  providers: [AccountService]
})
export class AccountModule {}
