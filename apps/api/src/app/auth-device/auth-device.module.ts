import { AuthDeviceController } from '@ghostfolio/api/app/auth-device/auth-device.controller';
import { AuthDeviceService } from '@ghostfolio/api/app/auth-device/auth-device.service';
import { ConfigurationService } from '@ghostfolio/api/services/configuration.service';
import { PrismaService } from '@ghostfolio/api/services/prisma.service';
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

@Module({
  controllers: [AuthDeviceController],
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET_KEY,
      signOptions: { expiresIn: '180 days' }
    })
  ],
  providers: [AuthDeviceService, ConfigurationService, PrismaService]
})
export class AuthDeviceModule {}
