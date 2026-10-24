import { ConfigurationModule } from '@ghostfolio/api/services/configuration/configuration.module';
import { PropertyModule } from '@ghostfolio/api/services/property/property.module';
import { SubscriptionModule as SubscriptionServiceModule } from '@ghostfolio/api/services/subscription/subscription.module';

import { Module } from '@nestjs/common';

import { SubscriptionController } from './subscription.controller';

@Module({
  controllers: [SubscriptionController],
  imports: [ConfigurationModule, PropertyModule, SubscriptionServiceModule]
})
export class SubscriptionModule {}
