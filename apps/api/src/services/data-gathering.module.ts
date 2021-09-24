import { ConfigurationModule } from '@ghostfolio/api/services/configuration.module';
import { DataGatheringService } from '@ghostfolio/api/services/data-gathering.service';
import { DataProviderModule } from '@ghostfolio/api/services/data-provider/data-provider.module';
import { PrismaModule } from '@ghostfolio/api/services/prisma.module';
import { Module } from '@nestjs/common';

import { ExchangeRateDataModule } from './exchange-rate-data.module';

@Module({
  imports: [
    ConfigurationModule,
    DataProviderModule,
    ExchangeRateDataModule,
    PrismaModule
  ],
  providers: [DataGatheringService],
  exports: [DataGatheringService]
})
export class DataGatheringModule {}
