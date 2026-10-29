import { PortfolioModule } from '@ghostfolio/api/app/portfolio/portfolio.module';
import { UserModule } from '@ghostfolio/api/app/user/user.module';
import { RedactValuesInResponseModule } from '@ghostfolio/api/interceptors/redact-values-in-response/redact-values-in-response.module';
import { AccountBalanceModule } from '@ghostfolio/api/services/account-balance/account-balance.module';
import { AccountModule } from '@ghostfolio/api/services/account/account.module';
import { ApiModule } from '@ghostfolio/api/services/api/api.module';
import { ConfigurationModule } from '@ghostfolio/api/services/configuration/configuration.module';
import { ImpersonationModule } from '@ghostfolio/api/services/impersonation/impersonation.module';

import { Module } from '@nestjs/common';

import { AccountBalanceController } from './account-balance.controller';
import { AccountsController } from './accounts.controller';

@Module({
  controllers: [AccountBalanceController, AccountsController],
  imports: [
    AccountBalanceModule,
    AccountModule,
    ApiModule,
    ConfigurationModule,
    ImpersonationModule,
    PortfolioModule,
    RedactValuesInResponseModule,
    UserModule
  ]
})
export class AccountsModule {}
