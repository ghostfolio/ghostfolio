import { Module } from '@nestjs/common';

import { PrismaService } from '../../services/prisma.service';
import { AccessController } from './access.controller';
import { AccessService } from './access.service';

@Module({
  imports: [],
  controllers: [AccessController],
  providers: [AccessService, PrismaService]
})
export class AccessModule {}
