import { PrismaModule } from '@ghostfolio/api/services/prisma/prisma.module';

import { Module } from '@nestjs/common';

import { TagController } from './tag.controller';
import { TagService } from './tag.service';

@Module({
  controllers: [TagController],
  exports: [TagService],
  imports: [PrismaModule],
  providers: [TagService]
})
export class TagModule {}
