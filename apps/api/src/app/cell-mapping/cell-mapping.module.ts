import { PrismaModule } from '@ghostfolio/api/services/prisma/prisma.module';

import { Module } from '@nestjs/common';

import { CellMappingController } from './cell-mapping.controller';
import { CellMappingService } from './cell-mapping.service';

@Module({
  controllers: [CellMappingController],
  exports: [CellMappingService],
  imports: [PrismaModule],
  providers: [CellMappingService]
})
export class CellMappingModule {}
