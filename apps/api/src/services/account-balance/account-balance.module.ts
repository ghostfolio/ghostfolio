import { AccountBalanceService } from '@ghostfolio/api/services/account-balance/account-balance.service';
import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';

@Module({
  exports: [AccountBalanceService],
  imports: [PrismaModule],
  providers: [AccountBalanceService]
})
export class AccountBalanceModule {}
