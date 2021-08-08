import { Module } from '@nestjs/common';

import { CurrentRateService } from './current-rate.service';
import { MarketDataService } from './market-data.service';
import { DataProviderModule } from '@ghostfolio/api/services/data-provider/data-provider.module';
import { ConfigurationModule } from '@ghostfolio/api/services/configuration.module';
import { PrismaModule } from '@ghostfolio/api/services/prisma.module';
import { ExchangeRateDataModule } from '@ghostfolio/api/services/exchange-rate-data.module';

@Module({
  imports: [
    ConfigurationModule,
    DataProviderModule,
    ExchangeRateDataModule,
    PrismaModule
  ],
  controllers: [],
  providers: [CurrentRateService, MarketDataService]
})
export class CoreModule {}
