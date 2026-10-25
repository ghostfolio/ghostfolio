import { ExchangeRateDataModule } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.module';
import { PrismaModule } from '@ghostfolio/api/services/prisma/prisma.module';

import { Module } from '@nestjs/common';

import { CashManagementService } from './cash-management.service';

@Module({
  exports: [CashManagementService],
  imports: [ExchangeRateDataModule, PrismaModule],
  providers: [CashManagementService]
})
export class CashManagementModule {}
