import { PrismaModule } from '@ghostfolio/api/services/prisma/prisma.module';

import { Module } from '@nestjs/common';

import { AccessService } from './access.service';

@Module({
  exports: [AccessService],
  imports: [PrismaModule],
  providers: [AccessService]
})
export class AccessModule {}
