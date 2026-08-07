import { ActivitiesModule } from '@ghostfolio/api/app/activities/activities.module';
import { RedisCacheModule } from '@ghostfolio/api/app/redis-cache/redis-cache.module';
import { UserModule } from '@ghostfolio/api/app/user/user.module';
import { ApiModule } from '@ghostfolio/api/services/api/api.module';
import { ConfigurationModule } from '@ghostfolio/api/services/configuration/configuration.module';
import { DataProviderModule } from '@ghostfolio/api/services/data-provider/data-provider.module';
import { ExchangeRateDataModule } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.module';
import { DataGatheringQueueModule } from '@ghostfolio/api/services/queues/data-gathering/data-gathering.module';
import { PortfolioSnapshotQueueModule } from '@ghostfolio/api/services/queues/portfolio-snapshot/portfolio-snapshot.module';

import { Module } from '@nestjs/common';

import { AssetProfileChangedListener } from './asset-profile-changed.listener';
import { PortfolioChangedListener } from './portfolio-changed.listener';

@Module({
  imports: [
    ActivitiesModule,
    ApiModule,
    ConfigurationModule,
    DataGatheringQueueModule,
    DataProviderModule,
    ExchangeRateDataModule,
    PortfolioSnapshotQueueModule,
    RedisCacheModule,
    UserModule
  ],
  providers: [AssetProfileChangedListener, PortfolioChangedListener]
})
export class EventsModule {}
