import { AccountBalanceModule as AccountBalanceServiceModule } from '@ghostfolio/api/services/account-balance/account-balance.module';
import { AccountModule } from '@ghostfolio/api/services/account/account.module';
import { ImpersonationModule } from '@ghostfolio/api/services/impersonation/impersonation.module';

import { Module } from '@nestjs/common';

import { AccountBalanceController } from './account-balance.controller';

@Module({
  controllers: [AccountBalanceController],
  imports: [AccountBalanceServiceModule, AccountModule, ImpersonationModule]
})
export class AccountBalanceModule {}
