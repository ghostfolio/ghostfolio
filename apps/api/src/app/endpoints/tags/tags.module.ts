import { PrismaModule } from '@ghostfolio/api/services/prisma/prisma.module';
import { TagModule } from '@ghostfolio/api/services/tag/tag.module';

import { Module } from '@nestjs/common';

import { TagsController } from './tags.controller';

@Module({
  controllers: [TagsController],
  imports: [PrismaModule, TagModule]
})
export class TagsModule {}
