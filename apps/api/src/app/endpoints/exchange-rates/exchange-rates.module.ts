import { ExchangeRateDataModule } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.module';

import { Module } from '@nestjs/common';

import { ExchangeRatesController } from './exchange-rates.controller';
import { ExchangeRatesService } from './exchange-rates.service';

@Module({
  controllers: [ExchangeRatesController],
  imports: [ExchangeRateDataModule],
  providers: [ExchangeRatesService]
})
export class ExchangeRatesModule {}
