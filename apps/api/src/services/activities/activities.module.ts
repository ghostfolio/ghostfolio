import { AccountBalanceModule } from '@ghostfolio/api/services/account-balance/account-balance.module';
import { AccountModule } from '@ghostfolio/api/services/account/account.module';
import { AssetProfileSplitModule } from '@ghostfolio/api/services/asset-profile-split/asset-profile-split.module';
import { BenchmarkModule } from '@ghostfolio/api/services/benchmark/benchmark.module';
import { DataProviderModule } from '@ghostfolio/api/services/data-provider/data-provider.module';
import { ExchangeRateDataModule } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.module';
import { MarketDataModule } from '@ghostfolio/api/services/market-data/market-data.module';
import { PrismaModule } from '@ghostfolio/api/services/prisma/prisma.module';
import { DataGatheringQueueModule } from '@ghostfolio/api/services/queues/data-gathering/data-gathering.module';
import { SymbolProfileModule } from '@ghostfolio/api/services/symbol-profile/symbol-profile.module';
import { TagModule } from '@ghostfolio/api/services/tag/tag.module';

import { Module } from '@nestjs/common';

import { ActivitiesService } from './activities.service';

@Module({
  exports: [ActivitiesService],
  imports: [
    AccountBalanceModule,
    AccountModule,
    AssetProfileSplitModule,
    BenchmarkModule,
    DataGatheringQueueModule,
    DataProviderModule,
    ExchangeRateDataModule,
    MarketDataModule,
    PrismaModule,
    SymbolProfileModule,
    TagModule
  ],
  providers: [ActivitiesService]
})
export class ActivitiesModule {}
