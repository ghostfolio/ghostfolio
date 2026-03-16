import { FamilyOfficeBenchmarkService } from '@ghostfolio/api/services/benchmark/family-office-benchmark.service';
import { PrismaModule } from '@ghostfolio/api/services/prisma/prisma.module';

import { Module } from '@nestjs/common';

import { FamilyOfficeController } from './family-office.controller';
import { FamilyOfficeService } from './family-office.service';

@Module({
  controllers: [FamilyOfficeController],
  exports: [FamilyOfficeService],
  imports: [PrismaModule],
  providers: [FamilyOfficeBenchmarkService, FamilyOfficeService]
})
export class FamilyOfficeModule {}
