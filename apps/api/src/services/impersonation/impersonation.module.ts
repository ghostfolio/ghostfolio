import { AccessModule } from '@ghostfolio/api/app/access/access.module';
import { SubscriptionModule } from '@ghostfolio/api/app/subscription/subscription.module';
import { ConfigurationModule } from '@ghostfolio/api/services/configuration/configuration.module';
import { ImpersonationService } from '@ghostfolio/api/services/impersonation/impersonation.service';
import { PrismaModule } from '@ghostfolio/api/services/prisma/prisma.module';

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
