import { TransformDataSourceInRequestModule } from '@ghostfolio/api/interceptors/transform-data-source-in-request/transform-data-source-in-request.module';
import { TransformDataSourceInResponseModule } from '@ghostfolio/api/interceptors/transform-data-source-in-response/transform-data-source-in-response.module';
import { ImpersonationModule } from '@ghostfolio/api/services/impersonation/impersonation.module';
import { ImportModule as ImportServiceModule } from '@ghostfolio/api/services/import/import.module';

import { Module } from '@nestjs/common';

import { ImportController } from './import.controller';
import { PortfolioRestoreController } from './portfolio-restore.controller';

@Module({
  controllers: [ImportController, PortfolioRestoreController],
  imports: [
    ImpersonationModule,
    ImportServiceModule,
    TransformDataSourceInRequestModule,
    TransformDataSourceInResponseModule
  ]
})
export class ImportModule {}
