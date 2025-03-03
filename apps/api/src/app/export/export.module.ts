import { AccountModule } from '@ghostfolio/api/app/account/account.module';
import { OrderModule } from '@ghostfolio/api/app/order/order.module';
import { ApiModule } from '@ghostfolio/api/services/api/api.module';
import { TagModule } from '@ghostfolio/api/services/tag/tag.module';

import { Module } from '@nestjs/common';

import { ExportController } from './export.controller';
import { ExportService } from './export.service';

@Module({
  imports: [AccountModule, ApiModule, OrderModule, TagModule],
  controllers: [ExportController],
  providers: [ExportService]
})
export class ExportModule {}
