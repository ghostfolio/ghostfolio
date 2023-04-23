import { PrismaModule } from '@ghostfolio/api/services/prisma/prisma.module';
import { Module } from '@nestjs/common';

import { PlatformService } from './platform.service';

@Module({
  exports: [PlatformService],
  imports: [PrismaModule],
  providers: [PlatformService]
})
export class PlatformModule {}
