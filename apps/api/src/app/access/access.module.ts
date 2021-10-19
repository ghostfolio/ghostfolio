import { PrismaService } from '@ghostfolio/api/services/prisma.service';
import { Module } from '@nestjs/common';

import { AccessController } from './access.controller';
import { AccessService } from './access.service';

@Module({
  controllers: [AccessController],
  exports: [AccessService],
  imports: [],
  providers: [AccessService, PrismaService]
})
export class AccessModule {}
