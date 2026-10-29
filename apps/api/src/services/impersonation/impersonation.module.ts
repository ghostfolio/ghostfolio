import { AccessModule } from '@ghostfolio/api/services/access/access.module';
import { ConfigurationModule } from '@ghostfolio/api/services/configuration/configuration.module';
import { ImpersonationService } from '@ghostfolio/api/services/impersonation/impersonation.service';
import { PrismaModule } from '@ghostfolio/api/services/prisma/prisma.module';
import { SubscriptionModule } from '@ghostfolio/api/services/subscription/subscription.module';

import { Module } from '@nestjs/common';

@Module({
  imports: [
    AccessModule,
    ConfigurationModule,
    PrismaModule,
    SubscriptionModule
  ],
  providers: [ImpersonationService],
  exports: [ImpersonationService]
})
export class ImpersonationModule {}
