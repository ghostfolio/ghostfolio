import { DataProviderService } from '@ghostfolio/api/services/data-provider/data-provider.service';
import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.service';

import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { MarketDataUpdatedEvent } from './market-data-updated.event';

@Injectable()
export class MarketDataUpdatedListener {
  public constructor(
    private readonly dataProviderService: DataProviderService,
    private readonly exchangeRateDataService: ExchangeRateDataService
  ) {}

  @OnEvent(MarketDataUpdatedEvent.getName())
  public handleMarketDataUpdated(event: MarketDataUpdatedEvent) {
    if (
      event.data.dataSource ===
      this.dataProviderService.getDataSourceForExchangeRates()
    ) {
      this.exchangeRateDataService.invalidateCache(event.data.symbol);
    }
  }
}
