import { ExchangeRateDataModule } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.module';

import { Module } from '@nestjs/common';

import { ExchangeRateController } from './exchange-rate.controller';
import { ExchangeRateService } from './exchange-rate.service';

@Module({
  controllers: [ExchangeRateController],
  exports: [ExchangeRateService],
  imports: [ExchangeRateDataModule],
  providers: [ExchangeRateService]
})
export class ExchangeRateModule {}
