import { CashManagementModule } from '@ghostfolio/api/app/account-balance/cash-management.module';
import { AccountModule } from '@ghostfolio/api/app/account/account.module';
import { ActivitiesModule } from '@ghostfolio/api/app/activities/activities.module';
import { PortfolioModule } from '@ghostfolio/api/app/portfolio/portfolio.module';
import { ApiModule } from '@ghostfolio/api/services/api/api.module';
import { ConfigurationModule } from '@ghostfolio/api/services/configuration/configuration.module';
import { DataProviderModule } from '@ghostfolio/api/services/data-provider/data-provider.module';
import { ExchangeRateDataModule } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.module';
import { MarketDataModule } from '@ghostfolio/api/services/market-data/market-data.module';
import { PlatformModule } from '@ghostfolio/api/services/platform/platform.module';
import { PrismaModule } from '@ghostfolio/api/services/prisma/prisma.module';
import { DataGatheringQueueModule } from '@ghostfolio/api/services/queues/data-gathering/data-gathering.module';
import { SymbolProfileModule } from '@ghostfolio/api/services/symbol-profile/symbol-profile.module';
import { TagModule } from '@ghostfolio/api/services/tag/tag.module';

import { Module } from '@nestjs/common';

import { ImportService } from './import.service';
import { PortfolioRestoreService } from './portfolio-restore.service';

@Module({
  exports: [ImportService, PortfolioRestoreService],
  imports: [
    CashManagementModule,
    AccountModule,
    ActivitiesModule,
    ApiModule,
    ConfigurationModule,
    DataGatheringQueueModule,
    DataProviderModule,
    ExchangeRateDataModule,
    MarketDataModule,
    PlatformModule,
    PortfolioModule,
    PrismaModule,
    SymbolProfileModule,
    TagModule
  ],
  providers: [ImportService, PortfolioRestoreService]
})
export class ImportModule {}
