import { PrismaModule } from '@ghostfolio/api/services/prisma/prisma.module';

import { Module } from '@nestjs/common';

import { NewsController } from './news.controller';
import { NewsService } from './news.service';

@Module({
  controllers: [NewsController],
  exports: [NewsService],
  imports: [PrismaModule],
  providers: [NewsService]
})
export class NewsModule {}
