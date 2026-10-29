import { ConfigurationModule } from '@ghostfolio/api/services/configuration/configuration.module';
import { PrismaModule } from '@ghostfolio/api/services/prisma/prisma.module';
import { PropertyModule } from '@ghostfolio/api/services/property/property.module';

import { Module } from '@nestjs/common';

import { SubscriptionService } from './subscription.service';

@Module({
  exports: [SubscriptionService],
  imports: [ConfigurationModule, PrismaModule, PropertyModule],
  providers: [SubscriptionService]
})
export class SubscriptionModule {}
