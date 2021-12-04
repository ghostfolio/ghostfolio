import { DataProviderModule } from '@ghostfolio/api/services/data-provider/data-provider.module';
import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data.service';
import { Module } from '@nestjs/common';

import { PrismaModule } from './prisma.module';
import { PropertyModule } from './property/property.module';

@Module({
  imports: [DataProviderModule, PrismaModule, PropertyModule],
  providers: [ExchangeRateDataService],
  exports: [ExchangeRateDataService]
})
export class ExchangeRateDataModule {}
