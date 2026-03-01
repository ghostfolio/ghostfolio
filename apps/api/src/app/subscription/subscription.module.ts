import { ConfigurationModule } from '@ghostfolio/api/services/configuration/configuration.module';
import { PrismaModule } from '@ghostfolio/api/services/prisma/prisma.module';
import { PropertyModule } from '@ghostfolio/api/services/property/property.module';

import { Module } from '@nestjs/common';

import { PayTheFlyModule } from './paythefly/paythefly.module';
import { SubscriptionController } from './subscription.controller';
import { SubscriptionService } from './subscription.service';

@Module({
  controllers: [SubscriptionController],
  exports: [SubscriptionService],
  imports: [ConfigurationModule, PayTheFlyModule, PrismaModule, PropertyModule],
  providers: [SubscriptionService]
})
export class SubscriptionModule {}
