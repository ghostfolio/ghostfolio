import { AccountBalanceService } from '@ghostfolio/api/services/account-balance/account-balance.service';
import { PrismaModule } from '@ghostfolio/api/services/prisma/prisma.module';
import { Module } from '@nestjs/common';

@Module({
  exports: [AccountBalanceService],
  imports: [PrismaModule],
  providers: [AccountBalanceService]
})
export class AccountBalanceModule {}
