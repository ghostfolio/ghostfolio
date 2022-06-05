import { ConfigurationModule } from '@ghostfolio/api/services/configuration.module';
import { DataProviderModule } from '@ghostfolio/api/services/data-provider/data-provider.module';
import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data.service';
import { PropertyModule } from '@ghostfolio/api/services/property/property.module';
import { Module } from '@nestjs/common';

import { PrismaModule } from './prisma.module';

@Module({
  imports: [
    ConfigurationModule,
    DataProviderModule,
    PrismaModule,
    PropertyModule
  ],
  providers: [ExchangeRateDataService],
  exports: [ExchangeRateDataService]
})
export class ExchangeRateDataModule {}
