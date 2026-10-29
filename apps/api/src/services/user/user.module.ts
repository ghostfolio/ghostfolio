import { ActivitiesModule } from '@ghostfolio/api/services/activities/activities.module';
import { ConfigurationModule } from '@ghostfolio/api/services/configuration/configuration.module';
import { I18nModule } from '@ghostfolio/api/services/i18n/i18n.module';
import { PrismaModule } from '@ghostfolio/api/services/prisma/prisma.module';
import { PropertyModule } from '@ghostfolio/api/services/property/property.module';
import { SubscriptionModule } from '@ghostfolio/api/services/subscription/subscription.module';
import { TagModule } from '@ghostfolio/api/services/tag/tag.module';

import { Module } from '@nestjs/common';

import { UserService } from './user.service';

@Module({
  exports: [UserService],
  imports: [
    ActivitiesModule,
    ConfigurationModule,
    I18nModule,
    PrismaModule,
    PropertyModule,
    SubscriptionModule,
    TagModule
  ],
  providers: [UserService]
})
export class UserModule {}
