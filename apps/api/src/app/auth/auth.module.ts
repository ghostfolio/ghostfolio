import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { PrismaService } from '../../services/prisma.service';
import { UserService } from '../user/user.service';
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
    AuthService,
    GoogleStrategy,
    JwtStrategy,
    PrismaService,
    UserService
  ]
})
export class AuthModule {}
