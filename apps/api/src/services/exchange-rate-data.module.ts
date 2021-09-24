import { DataProviderModule } from '@ghostfolio/api/services/data-provider/data-provider.module';
import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data.service';
import { Module } from '@nestjs/common';

import { PrismaModule } from './prisma.module';

@Module({
  imports: [DataProviderModule, PrismaModule],
  providers: [ExchangeRateDataService],
  exports: [ExchangeRateDataService]
})
export class ExchangeRateDataModule {}
