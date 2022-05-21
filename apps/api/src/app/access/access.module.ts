import { PrismaModule } from '@ghostfolio/api/services/prisma.module';
import { Module } from '@nestjs/common';

import { AccessController } from './access.controller';
import { AccessService } from './access.service';

@Module({
  controllers: [AccessController],
  exports: [AccessService],
  imports: [PrismaModule],
  providers: [AccessService]
})
export class AccessModule {}
