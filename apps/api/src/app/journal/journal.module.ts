import { OrderModule } from '@ghostfolio/api/app/order/order.module';
import { PortfolioModule } from '@ghostfolio/api/app/portfolio/portfolio.module';
import { PrismaModule } from '@ghostfolio/api/services/prisma/prisma.module';

import { Module } from '@nestjs/common';

import { JournalController } from './journal.controller';
import { JournalService } from './journal.service';

@Module({
  controllers: [JournalController],
  exports: [JournalService],
  imports: [OrderModule, PortfolioModule, PrismaModule],
  providers: [JournalService]
})
export class JournalModule {}
