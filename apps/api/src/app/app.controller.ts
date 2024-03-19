import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.service';

import { Controller } from '@nestjs/common';

@Controller()
export class AppController {
  public constructor(
    private readonly exchangeRateDataService: ExchangeRateDataService
  ) {
    this.initialize();
  }

  private async initialize() {
    try {
      await this.exchangeRateDataService.initialize();
    } catch {}
  }
}
