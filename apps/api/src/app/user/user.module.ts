import { SubscriptionModule } from '@ghostfolio/api/app/subscription/subscription.module';
import { ConfigurationService } from '@ghostfolio/api/services/configuration.service';
import { PrismaService } from '@ghostfolio/api/services/prisma.service';
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { UserController } from './user.controller';
import { UserService } from './user.service';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET_KEY,
      signOptions: { expiresIn: '30 days' }
    }),
    SubscriptionModule
  ],
  controllers: [UserController],
  providers: [ConfigurationService, PrismaService, UserService],
  exports: [UserService]
})
export class UserModule {}
