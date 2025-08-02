import { PrismaModule } from '@ghostfolio/api/services/prisma/prisma.module';
import { PropertyModule } from '@ghostfolio/api/services/property/property.module';

import { Module } from '@nestjs/common';

import { DemoService } from './demo.service';

@Module({
  exports: [DemoService],
  imports: [PrismaModule, PropertyModule],
  providers: [DemoService]
})
export class DemoModule {}
