import { ConfigurationModule } from '@ghostfolio/api/services/configuration.module';
import { DataProviderModule } from '@ghostfolio/api/services/data-provider/data-provider.module';
import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data.service';
import { PropertyModule } from '@ghostfolio/api/services/property/property.module';
import { Module } from '@nestjs/common';

import { MarketDataModule } from './market-data.module';
import { PrismaModule } from './prisma.module';

@Module({
  exports: [ExchangeRateDataService],
  imports: [
    ConfigurationModule,
    DataProviderModule,
    MarketDataModule,
    PrismaModule,
    PropertyModule
  ],
  providers: [ExchangeRateDataService]
})
export class ExchangeRateDataModule {}
