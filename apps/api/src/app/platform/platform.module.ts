import { PrismaModule } from '@ghostfolio/api/services/prisma/prisma.module';

import { Module } from '@nestjs/common';

import { PlatformController } from './platform.controller';
import { PlatformService } from './platform.service';

@Module({
  controllers: [PlatformController],
  exports: [PlatformService],
  imports: [PrismaModule],
  providers: [PlatformService]
})
export class PlatformModule {}
