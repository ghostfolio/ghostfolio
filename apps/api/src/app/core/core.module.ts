import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data.service';
import { Module } from '@nestjs/common';

import { CurrentRateService } from './current-rate.service';
import { MarketDataService } from './market-data.service';
import { DataProviderModule } from '@ghostfolio/api/services/data-provider/data-provider.module';
import { ConfigurationModule } from '@ghostfolio/api/services/configuration.module';
import { PrismaModule } from '@ghostfolio/api/services/prisma.module';

@Module({
  imports: [ConfigurationModule, DataProviderModule, PrismaModule],
  controllers: [],
  providers: [CurrentRateService, ExchangeRateDataService, MarketDataService]
})
export class CoreModule {}
