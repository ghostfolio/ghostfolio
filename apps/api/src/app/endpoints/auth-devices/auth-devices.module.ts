import { AuthDeviceModule } from '@ghostfolio/api/services/auth-device/auth-device.module';

import { Module } from '@nestjs/common';

import { AuthDevicesController } from './auth-devices.controller';

@Module({
  controllers: [AuthDevicesController],
  imports: [AuthDeviceModule]
})
export class AuthDevicesModule {}
