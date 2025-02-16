import { CurrencyService } from '@ghostfolio/api/services/currency/currency.service';
import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.service';

import { Controller } from '@nestjs/common';

@Controller()
export class AppController {
  public constructor(
    private readonly currencyService: CurrencyService,
    private readonly exchangeRateDataService: ExchangeRateDataService
  ) {
    this.initialize();
  }

  private async initialize() {
    try {
      await this.currencyService.initialize();
      await this.exchangeRateDataService.initialize();
    } catch {}
  }
}
