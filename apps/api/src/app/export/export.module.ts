import { AccountModule } from '@ghostfolio/api/app/account/account.module';
import { OrderModule } from '@ghostfolio/api/app/order/order.module';
import { TransformDataSourceInRequestModule } from '@ghostfolio/api/interceptors/transform-data-source-in-request/transform-data-source-in-request.module';
import { ApiModule } from '@ghostfolio/api/services/api/api.module';
import { TagModule } from '@ghostfolio/api/services/tag/tag.module';

import { Module } from '@nestjs/common';

import { ExportController } from './export.controller';
import { ExportService } from './export.service';

@Module({
  controllers: [ExportController],
  imports: [
    AccountModule,
    ApiModule,
    OrderModule,
    TagModule,
    TransformDataSourceInRequestModule
  ],
  providers: [ExportService]
})
export class ExportModule {}
