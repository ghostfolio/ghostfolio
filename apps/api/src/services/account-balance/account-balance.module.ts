import { ExchangeRateDataModule } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.module';
import { PrismaModule } from '@ghostfolio/api/services/prisma/prisma.module';

import { Module } from '@nestjs/common';

import { AccountBalanceService } from './account-balance.service';

@Module({
  exports: [AccountBalanceService],
  imports: [ExchangeRateDataModule, PrismaModule],
  providers: [AccountBalanceService]
})
export class AccountBalanceModule {}
