import { PrismaModule } from '@ghostfolio/api/services/prisma/prisma.module';

import { Module } from '@nestjs/common';

import { AuthDeviceService } from './auth-device.service';

@Module({
  exports: [AuthDeviceService],
  imports: [PrismaModule],
  providers: [AuthDeviceService]
})
export class AuthDeviceModule {}
