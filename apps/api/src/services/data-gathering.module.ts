import { ConfigurationModule } from '@ghostfolio/api/services/configuration.module';
import { DataGatheringService } from '@ghostfolio/api/services/data-gathering.service';
import { TrackinsightDataEnhancerService } from '@ghostfolio/api/services/data-provider/data-enhancer/trackinsight/trackinsight.service';
import { DataProviderModule } from '@ghostfolio/api/services/data-provider/data-provider.module';
import { PrismaModule } from '@ghostfolio/api/services/prisma.module';
import { Module } from '@nestjs/common';

import { DataEnhancerModule } from './data-provider/data-enhancer/data-enhancer.module';
import { ExchangeRateDataModule } from './exchange-rate-data.module';

@Module({
  imports: [
    ConfigurationModule,
    DataEnhancerModule,
    DataProviderModule,
    ExchangeRateDataModule,
    PrismaModule
  ],
  providers: [
    {
      inject: [TrackinsightDataEnhancerService],
      provide: 'DataEnhancers',
      useFactory: (trackinsight) => [trackinsight]
    },
    DataGatheringService
  ],
  exports: ['DataEnhancers', DataGatheringService]
})
export class DataGatheringModule {}
