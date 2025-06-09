import { OrderModule } from '@ghostfolio/api/app/order/order.module';
import { SubscriptionModule } from '@ghostfolio/api/app/subscription/subscription.module';
import { ConfigurationModule } from '@ghostfolio/api/services/configuration/configuration.module';
import { I18nModule } from '@ghostfolio/api/services/i18n/i18n.module';
import { PrismaModule } from '@ghostfolio/api/services/prisma/prisma.module';
import { PropertyModule } from '@ghostfolio/api/services/property/property.module';
import { TagModule } from '@ghostfolio/api/services/tag/tag.module';

import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { UserController } from './user.controller';
import { UserService } from './user.service';

@Module({
  controllers: [UserController],
  exports: [UserService],
  imports: [
    ConfigurationModule,
    I18nModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET_KEY,
      signOptions: { expiresIn: '30 days' }
    }),
    OrderModule,
    PrismaModule,
    PropertyModule,
    SubscriptionModule,
    TagModule
  ],
  providers: [UserService]
})
export class UserModule {}
