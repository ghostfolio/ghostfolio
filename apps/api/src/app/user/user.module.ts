import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { ConfigurationService } from '../../services/configuration.service';
import { PrismaService } from '../../services/prisma.service';
import { UserController } from './user.controller';
import { UserService } from './user.service';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET_KEY,
      signOptions: { expiresIn: '30 days' }
    })
  ],
  controllers: [UserController],
  providers: [ConfigurationService, PrismaService, UserService]
})
export class UserModule {}
