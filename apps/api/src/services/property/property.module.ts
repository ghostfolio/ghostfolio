import { PrismaModule } from '@ghostfolio/api/services/prisma/prisma.module';

import { Module } from '@nestjs/common';

import { PropertyService } from './property.service';

@Module({
  exports: [PropertyService],
  imports: [PrismaModule],
  providers: [PropertyService]
})
export class PropertyModule {}
