import { PrismaService } from '@ghostfolio/api/services/prisma/prisma.service';

import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Module({
  exports: [PrismaService],
  providers: [ConfigService, PrismaService]
})
export class PrismaModule {}
