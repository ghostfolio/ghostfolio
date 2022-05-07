import { ConfigurationModule } from '@ghostfolio/api/services/configuration.module';
import { DataGatheringService } from '@ghostfolio/api/services/data-gathering.service';
import { DataEnhancerModule } from '@ghostfolio/api/services/data-provider/data-enhancer/data-enhancer.module';
import { DataProviderModule } from '@ghostfolio/api/services/data-provider/data-provider.module';
import { PrismaModule } from '@ghostfolio/api/services/prisma.module';
import { DATA_GATHERING_QUEUE } from '@ghostfolio/common/config';
import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';

import { DataGatheringProcessor } from './data-gathering.processor';
import { ExchangeRateDataModule } from './exchange-rate-data.module';
import { SymbolProfileModule } from './symbol-profile.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: DATA_GATHERING_QUEUE
    }),
    ConfigurationModule,
    DataEnhancerModule,
    DataProviderModule,
    ExchangeRateDataModule,
    PrismaModule,
    SymbolProfileModule
  ],
  providers: [DataGatheringProcessor, DataGatheringService],
  exports: [BullModule, DataEnhancerModule, DataGatheringService]
})
export class DataGatheringModule {}
