import { ExchangeRateDataModule } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.module';
import { PrismaModule } from '@ghostfolio/api/services/prisma/prisma.module';

import { Module } from '@nestjs/common';

import { AccountBalanceController } from './account-balance.controller';
import { AccountBalanceService } from './account-balance.service';

@Module({
  controllers: [AccountBalanceController],
  exports: [AccountBalanceService],
  imports: [ExchangeRateDataModule, PrismaModule],
  providers: [AccountBalanceService]
})
export class AccountBalanceModule {}
