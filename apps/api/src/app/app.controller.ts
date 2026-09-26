import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.service';

import { Controller, Logger } from '@nestjs/common';

@Controller()
export class AppController {
  private readonly logger = new Logger(AppController.name);

  public constructor(
    private readonly exchangeRateDataService: ExchangeRateDataService
  ) {
    this.initialize();
  }

  private async initialize() {
    try {
      await this.exchangeRateDataService.initialize();
    } catch (error) {
      this.logger.error(error);
    }
  }
}
