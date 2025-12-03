import { OrderService } from '@ghostfolio/api/app/order/order.service';
import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';
import { DataProviderService } from '@ghostfolio/api/services/data-provider/data-provider.service';
import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.service';
import { DataGatheringService } from '@ghostfolio/api/services/queues/data-gathering/data-gathering.service';
import { DEFAULT_CURRENCY } from '@ghostfolio/common/config';

import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { AssetProfileChangedEvent } from './asset-profile-changed.event';

@Injectable()
export class AssetProfileChangedListener {
  public constructor(
    private readonly configurationService: ConfigurationService,
    private readonly dataGatheringService: DataGatheringService,
    private readonly dataProviderService: DataProviderService,
    private readonly exchangeRateDataService: ExchangeRateDataService,
    private readonly orderService: OrderService
  ) {}

  @OnEvent(AssetProfileChangedEvent.getName())
  public async handleAssetProfileChanged(event: AssetProfileChangedEvent) {
    Logger.log(
      `Asset profile of ${event.data.symbol} (${event.data.dataSource}) has changed`,
      'AssetProfileChangedListener'
    );

    if (
      this.configurationService.get(
        'ENABLE_FEATURE_GATHER_NEW_EXCHANGE_RATES'
      ) === false ||
      event.data.currency === DEFAULT_CURRENCY
    ) {
      return;
    }

    const existingCurrencies = this.exchangeRateDataService.getCurrencies();

    if (!existingCurrencies.includes(event.data.currency)) {
      Logger.log(
        `New currency ${event.data.currency} has been detected`,
        'AssetProfileChangedListener'
      );

      await this.exchangeRateDataService.initialize();
    }

    const { dateOfFirstActivity } =
      await this.orderService.getStatisticsByCurrency(event.data.currency);

    if (dateOfFirstActivity) {
      await this.dataGatheringService.gatherSymbol({
        dataSource: this.dataProviderService.getDataSourceForExchangeRates(),
        date: dateOfFirstActivity,
        symbol: `${DEFAULT_CURRENCY}${event.data.currency}`
      });
    }
  }
}
