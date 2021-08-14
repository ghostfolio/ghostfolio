import { AuthDeviceService } from '@ghostfolio/api/app/auth-device/auth-device.service';
import { WebAuthService } from '@ghostfolio/api/app/auth/web-auth.service';
import { UserService } from '@ghostfolio/api/app/user/user.service';
import { ConfigurationService } from '@ghostfolio/api/services/configuration.service';
import { PrismaService } from '@ghostfolio/api/services/prisma.service';
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { GoogleStrategy } from './google.strategy';
import { JwtStrategy } from './jwt.strategy';

@Module({
  controllers: [AuthController],
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET_KEY,
      signOptions: { expiresIn: '180 days' }
    })
  ],
  providers: [
    AuthDeviceService,
    AuthService,
    ConfigurationService,
    GoogleStrategy,
    JwtStrategy,
    PrismaService,
    UserService,
    WebAuthService
  ]
})
export class AuthModule {}
