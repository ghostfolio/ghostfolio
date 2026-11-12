import { ActivitiesModule } from '@ghostfolio/api/services/activities/activities.module';
import { DataProviderModule } from '@ghostfolio/api/services/data-provider/data-provider.module';
import { MarketDataModule } from '@ghostfolio/api/services/market-data/market-data.module';
import { SymbolModule } from '@ghostfolio/api/services/symbol/symbol.module';

import { Module } from '@nestjs/common';

import { ActivityMatchedBenchmarkService } from './activity-matched-benchmark.service';
import { BenchmarkFxMarketDataProvider } from './activity-matched/benchmark-fx-market-data.provider';
import { BenchmarkMarketDataProvider } from './activity-matched/benchmark-market-data.provider';

@Module({
  imports: [
    ActivitiesModule,
    SymbolModule,
    MarketDataModule,
    DataProviderModule
  ],
  providers: [
    ActivityMatchedBenchmarkService,
    BenchmarkMarketDataProvider,
    BenchmarkFxMarketDataProvider
  ],
  exports: [ActivityMatchedBenchmarkService]
})
export class ActivityMatchedBenchmarkModule {}
