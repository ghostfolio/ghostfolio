import { AccountModule } from '@ghostfolio/api/app/account/account.module';
import { OrderModule } from '@ghostfolio/api/app/order/order.module';
import { ApiModule } from '@ghostfolio/api/services/api/api.module';

import { Module } from '@nestjs/common';

import { ExportController } from './export.controller';
import { ExportService } from './export.service';

@Module({
  imports: [AccountModule, ApiModule, OrderModule],
  controllers: [ExportController],
  providers: [ExportService]
})
export class ExportModule {}
