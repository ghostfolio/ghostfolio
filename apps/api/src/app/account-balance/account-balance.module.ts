import { CashManagementModule } from '@ghostfolio/api/app/account-balance/cash-management.module';
import { AccountService } from '@ghostfolio/api/app/account/account.service';
import { ExchangeRateDataModule } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.module';
import { ImpersonationModule } from '@ghostfolio/api/services/impersonation/impersonation.module';
import { PrismaModule } from '@ghostfolio/api/services/prisma/prisma.module';
import { TagModule } from '@ghostfolio/api/services/tag/tag.module';

import { Module } from '@nestjs/common';

import { AccountBalanceController } from './account-balance.controller';
import { AccountBalanceService } from './account-balance.service';
import { CashManagementController } from './cash-management.controller';

@Module({
  controllers: [AccountBalanceController, CashManagementController],
  exports: [AccountBalanceService],
  imports: [
    CashManagementModule,
    ExchangeRateDataModule,
    ImpersonationModule,
    PrismaModule,
    TagModule
  ],
  providers: [AccountBalanceService, AccountService]
})
export class AccountBalanceModule {}
