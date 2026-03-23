import { ConfigurationModule } from '@ghostfolio/api/services/configuration/configuration.module';
import { PrismaModule } from '@ghostfolio/api/services/prisma/prisma.module';
import { PLAID_SYNC_QUEUE } from '@ghostfolio/common/config';

import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';

import { PlaidSyncProcessor } from './plaid-sync.processor';
import { PlaidSyncService } from './plaid-sync.service';

@Module({
  exports: [PlaidSyncService],
  imports: [
    BullModule.registerQueue({
      name: PLAID_SYNC_QUEUE
    }),
    ConfigurationModule,
    PrismaModule
  ],
  providers: [PlaidSyncProcessor, PlaidSyncService]
})
export class PlaidSyncModule {}
