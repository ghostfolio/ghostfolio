import { PrismaModule } from '@ghostfolio/api/services/prisma/prisma.module';

import { Module } from '@nestjs/common';

import { ApiKeyService } from './api-key.service';

@Module({
  exports: [ApiKeyService],
  imports: [PrismaModule],
  providers: [ApiKeyService]
})
export class ApiKeyModule {}
