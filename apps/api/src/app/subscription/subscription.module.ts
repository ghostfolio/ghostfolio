import { ConfigurationService } from '@ghostfolio/api/services/configuration.service';
import { PrismaService } from '@ghostfolio/api/services/prisma.service';
import { Module } from '@nestjs/common';

import { SubscriptionController } from './subscription.controller';
import { SubscriptionService } from './subscription.service';

@Module({
  imports: [],
  controllers: [SubscriptionController],
  providers: [ConfigurationService, PrismaService, SubscriptionService]
})
export class SubscriptionModule {}
