import { FamilyOfficeBenchmarkService } from '@ghostfolio/api/services/benchmark/family-office-benchmark.service';
import { PrismaModule } from '@ghostfolio/api/services/prisma/prisma.module';

import { Module } from '@nestjs/common';

import { PartnershipController } from './partnership.controller';
import { PartnershipService } from './partnership.service';

@Module({
  controllers: [PartnershipController],
  exports: [PartnershipService],
  imports: [PrismaModule],
  providers: [FamilyOfficeBenchmarkService, PartnershipService]
})
export class PartnershipModule {}
