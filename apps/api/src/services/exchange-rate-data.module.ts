import { Module } from '@nestjs/common';
import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data.service';
import { DataProviderModule } from '@ghostfolio/api/services/data-provider/data-provider.module';

@Module({
  imports: [DataProviderModule],
  providers: [ExchangeRateDataService],
  exports: [ExchangeRateDataService]
})
export class ExchangeRateDataModule {}
