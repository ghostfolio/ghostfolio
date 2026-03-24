import { ActivitiesService } from '@ghostfolio/api/app/activities/activities.service';
import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';
import { DataProviderService } from '@ghostfolio/api/services/data-provider/data-provider.service';
import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.service';
import { DataGatheringService } from '@ghostfolio/api/services/queues/data-gathering/data-gathering.service';
import { DEFAULT_CURRENCY } from '@ghostfolio/common/config';
import { getAssetProfileIdentifier } from '@ghostfolio/common/helper';

import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { DataSource } from '@prisma/client';
import ms from 'ms';

import { AssetProfileChangedEvent } from './asset-profile-changed.event';

@Injectable()
export class AssetProfileChangedListener {
  private static readonly DEBOUNCE_DELAY = ms('5 seconds');

  private debounceTimers = new Map<string, NodeJS.Timeout>();

  public constructor(
    private readonly activitiesService: ActivitiesService,
    private readonly configurationService: ConfigurationService,
    private readonly dataGatheringService: DataGatheringService,
    private readonly dataProviderService: DataProviderService,
    private readonly exchangeRateDataService: ExchangeRateDataService
  ) {}

  @OnEvent(AssetProfileChangedEvent.getName())
  public handleAssetProfileChanged(event: AssetProfileChangedEvent) {
    const currency = event.getCurrency();
    const dataSource = event.getDataSource();
    const symbol = event.getSymbol();

    const key = getAssetProfileIdentifier({
      dataSource,
      symbol
    });

    const existingTimer = this.debounceTimers.get(key);

    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    this.debounceTimers.set(
      key,
      setTimeout(() => {
        this.debounceTimers.delete(key);

        void this.processAssetProfileChanged({
          currency,
          dataSource,
          symbol
        });
      }, AssetProfileChangedListener.DEBOUNCE_DELAY)
    );
  }

  private async processAssetProfileChanged({
    currency,
    dataSource,
    symbol
  }: {
    currency: string;
    dataSource: DataSource;
    symbol: string;
  }) {
    Logger.log(
      `Asset profile of ${symbol} (${dataSource}) has changed`,
      'AssetProfileChangedListener'
    );

    if (
      this.configurationService.get(
        'ENABLE_FEATURE_GATHER_NEW_EXCHANGE_RATES'
      ) === false ||
      currency === DEFAULT_CURRENCY
    ) {
      return;
    }

    const existingCurrencies = this.exchangeRateDataService.getCurrencies();

    if (!existingCurrencies.includes(currency)) {
      Logger.log(
        `New currency ${currency} has been detected`,
        'AssetProfileChangedListener'
      );

      await this.exchangeRateDataService.initialize();
    }

    const { dateOfFirstActivity } =
      await this.activitiesService.getStatisticsByCurrency(currency);

    if (dateOfFirstActivity) {
      await this.dataGatheringService.gatherSymbol({
        dataSource: this.dataProviderService.getDataSourceForExchangeRates(),
        date: dateOfFirstActivity,
        symbol: `${DEFAULT_CURRENCY}${currency}`
      });
    }
  }
}
