import { AccountBalanceService } from '@ghostfolio/api/services/account-balance/account-balance.service';
import { ExchangeRateDataModule } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.module';
import { PrismaModule } from '@ghostfolio/api/services/prisma/prisma.module';
import { Module } from '@nestjs/common';

@Module({
  exports: [AccountBalanceService],
  imports: [ExchangeRateDataModule, PrismaModule],
  providers: [AccountBalanceService]
})
export class AccountBalanceModule {}
