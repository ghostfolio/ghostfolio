import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';
import { DataProviderService } from '@ghostfolio/api/services/data-provider/data-provider.service';
import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.service';
import { PrismaService } from '@ghostfolio/api/services/prisma/prisma.service';
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
    private readonly prismaService: PrismaService
  ) {}

  @OnEvent(AssetProfileChangedEvent.getName())
  public async handleAssetProfileChanged(event: AssetProfileChangedEvent) {
    const isEnabled = this.configurationService.get(
      'ENABLE_FEATURE_GATHER_NEW_EXCHANGE_RATES'
    );

    if (isEnabled === false) {
      return;
    }

    if (event.currency === DEFAULT_CURRENCY) {
      return;
    }

    Logger.log(
      `Asset profile changed: ${event.symbol} (${event.currency}). Checking if exchange rate gathering is needed.`,
      'AssetProfileChangedListener'
    );

    const existingCurrencies = this.exchangeRateDataService.getCurrencies();
    const currencyAlreadyExists = existingCurrencies.includes(event.currency);

    if (currencyAlreadyExists) {
      return;
    }

    Logger.log(
      `New currency detected: ${event.currency}. Initializing exchange rate data service.`,
      'AssetProfileChangedListener'
    );

    await this.exchangeRateDataService.initialize();

    if (
      !this.exchangeRateDataService.hasCurrencyPair(
        DEFAULT_CURRENCY,
        event.currency
      )
    ) {
      Logger.warn(
        `Currency pair ${DEFAULT_CURRENCY}${event.currency} was not added after initialization.`,
        'AssetProfileChangedListener'
      );
      return;
    }

    const firstOrderWithCurrency = await this.prismaService.order.findFirst({
      orderBy: [{ date: 'asc' }],
      select: { date: true },
      where: {
        SymbolProfile: {
          currency: event.currency
        }
      }
    });

    const startDate = firstOrderWithCurrency.date ?? new Date();

    Logger.log(
      `Triggering exchange rate data gathering for ${DEFAULT_CURRENCY}${event.currency} from ${startDate.toISOString()}.`,
      'AssetProfileChangedListener'
    );

    await this.dataGatheringService.gatherSymbol({
      dataSource: this.dataProviderService.getDataSourceForExchangeRates(),
      symbol: `${DEFAULT_CURRENCY}${event.currency}`,
      date: startDate
    });
  }
}
