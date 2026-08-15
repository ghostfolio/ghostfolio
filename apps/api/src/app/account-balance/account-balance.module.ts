import { AccountService } from '@ghostfolio/api/app/account/account.service';
import { RedactValuesInResponseModule } from '@ghostfolio/api/interceptors/redact-values-in-response/redact-values-in-response.module';
import { ExchangeRateDataModule } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.module';
import { PrismaModule } from '@ghostfolio/api/services/prisma/prisma.module';
import { TagModule } from '@ghostfolio/api/services/tag/tag.module';

import { Module } from '@nestjs/common';

import { AccountBalanceController } from './account-balance.controller';
import { AccountBalanceService } from './account-balance.service';

@Module({
  controllers: [AccountBalanceController],
  exports: [AccountBalanceService],
  imports: [
    ExchangeRateDataModule,
    PrismaModule,
    RedactValuesInResponseModule,
    TagModule
  ],
  providers: [AccountBalanceService, AccountService]
})
export class AccountBalanceModule {}
