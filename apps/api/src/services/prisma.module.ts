import { Module } from '@nestjs/common';
import { PrismaService } from '@ghostfolio/api/services/prisma.service';

@Module({
  providers: [PrismaService],
  exports: [PrismaService]
})
export class PrismaModule {}
