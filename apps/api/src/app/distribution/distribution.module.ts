import { PrismaModule } from '@ghostfolio/api/services/prisma/prisma.module';

import { Module } from '@nestjs/common';

import { DistributionController } from './distribution.controller';
import { DistributionService } from './distribution.service';

@Module({
  controllers: [DistributionController],
  exports: [DistributionService],
  imports: [PrismaModule],
  providers: [DistributionService]
})
export class DistributionModule {}
