import { AuthDeviceController } from '@ghostfolio/api/app/auth-device/auth-device.controller';
import { AuthDeviceService } from '@ghostfolio/api/app/auth-device/auth-device.service';
import { ConfigurationModule } from '@ghostfolio/api/services/configuration/configuration.module';
import { PrismaModule } from '@ghostfolio/api/services/prisma/prisma.module';

import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

@Module({
  controllers: [AuthDeviceController],
  imports: [
    ConfigurationModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET_KEY,
      signOptions: { expiresIn: '180 days' }
    }),
    PrismaModule
  ],
  providers: [AuthDeviceService]
})
export class AuthDeviceModule {}
