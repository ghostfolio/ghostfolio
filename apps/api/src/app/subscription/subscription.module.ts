import { ConfigurationService } from '@ghostfolio/api/services/configuration.service';
import { PrismaService } from '@ghostfolio/api/services/prisma.service';
import { PropertyModule } from '@ghostfolio/api/services/property/property.module';
import { Module } from '@nestjs/common';

import { SubscriptionController } from './subscription.controller';
import { SubscriptionService } from './subscription.service';

@Module({
  imports: [PropertyModule],
  controllers: [SubscriptionController],
  providers: [ConfigurationService, PrismaService, SubscriptionService],
  exports: [SubscriptionService]
})
export class SubscriptionModule {}
