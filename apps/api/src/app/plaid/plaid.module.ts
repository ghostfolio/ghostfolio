import { PlaidSyncModule } from '@ghostfolio/api/app/plaid-sync/plaid-sync.module';
import { ConfigurationModule } from '@ghostfolio/api/services/configuration/configuration.module';
import { PrismaModule } from '@ghostfolio/api/services/prisma/prisma.module';

import { Module } from '@nestjs/common';

import { PlaidController } from './plaid.controller';
import { PlaidService } from './plaid.service';

@Module({
  controllers: [PlaidController],
  exports: [PlaidService],
  imports: [ConfigurationModule, PlaidSyncModule, PrismaModule],
  providers: [PlaidService]
})
export class PlaidModule {}
