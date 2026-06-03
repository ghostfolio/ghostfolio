import { ActivitiesModule } from '@ghostfolio/api/app/activities/activities.module';
import { RedisCacheModule } from '@ghostfolio/api/app/redis-cache/redis-cache.module';
import { ConfigurationModule } from '@ghostfolio/api/services/configuration/configuration.module';
import { DataProviderModule } from '@ghostfolio/api/services/data-provider/data-provider.module';
import { ExchangeRateDataModule } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.module';
import { DataGatheringQueueModule } from '@ghostfolio/api/services/queues/data-gathering/data-gathering.module';

import { Module } from '@nestjs/common';

import { AssetProfileChangedListener } from './asset-profile-changed.listener';
import { MarketDataUpdatedListener } from './market-data-updated.listener';
import { PortfolioChangedListener } from './portfolio-changed.listener';

@Module({
  imports: [
    ActivitiesModule,
    ConfigurationModule,
    DataGatheringQueueModule,
    DataProviderModule,
    ExchangeRateDataModule,
    RedisCacheModule
  ],
  providers: [
    AssetProfileChangedListener,
    MarketDataUpdatedListener,
    PortfolioChangedListener
  ]
})
export class EventsModule {}
