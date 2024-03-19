import { PrismaModule } from '@ghostfolio/api/services/prisma/prisma.module';

import { Module } from '@nestjs/common';

import { TagService } from './tag.service';

@Module({
  exports: [TagService],
  imports: [PrismaModule],
  providers: [TagService]
})
export class TagModule {}
