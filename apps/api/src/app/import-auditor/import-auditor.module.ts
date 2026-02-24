import { Module } from '@nestjs/common';

import { ImportAuditorController } from './import-auditor.controller';
import { ImportAuditorService } from './import-auditor.service';

@Module({
  controllers: [ImportAuditorController],
  exports: [ImportAuditorService],
  providers: [ImportAuditorService]
})
export class ImportAuditorModule {}
