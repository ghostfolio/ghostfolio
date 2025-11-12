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
    const isEnabled = this.configurationService.get(
      'ENABLE_FEATURE_GATHER_NEW_EXCHANGE_RATES'
    );

    if (isEnabled === false) {
      return;
    }

    if (event.data.currency === DEFAULT_CURRENCY) {
      return;
    }

    Logger.log(
      `Asset profile changed: ${event.data.symbol} (${event.data.currency})`,
      'AssetProfileChangedListener'
    );

    const existingCurrencies = this.exchangeRateDataService.getCurrencies();
    const currencyAlreadyExists = existingCurrencies.includes(
      event.data.currency
    );

    if (currencyAlreadyExists) {
      return;
    }

    Logger.log(
      `New currency detected: ${event.data.currency}`,
      'AssetProfileChangedListener'
    );

    await this.exchangeRateDataService.initialize();

    const { dateOfFirstActivity } =
      await this.orderService.getStatisticsByCurrency(event.data.currency);

    const startDate = dateOfFirstActivity ?? new Date();

    Logger.log(
      `Triggering exchange rate data gathering for ${DEFAULT_CURRENCY}${event.data.currency} from ${startDate.toISOString()}.`,
      'AssetProfileChangedListener'
    );

    await this.dataGatheringService.gatherSymbol({
      dataSource: this.dataProviderService.getDataSourceForExchangeRates(),
      symbol: `${DEFAULT_CURRENCY}${event.data.currency}`,
      date: startDate
    });
  }
}
