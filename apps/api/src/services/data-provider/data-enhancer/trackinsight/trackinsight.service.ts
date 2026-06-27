import { getCountryCodeByName } from '@ghostfolio/api/helper/country.helper';
import { getSectorName } from '@ghostfolio/api/helper/sector.helper';
import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';
import { DataEnhancerInterface } from '@ghostfolio/api/services/data-provider/interfaces/data-enhancer.interface';
import { FetchService } from '@ghostfolio/api/services/fetch/fetch.service';
import { Holding } from '@ghostfolio/common/interfaces';
import { Country } from '@ghostfolio/common/interfaces/country.interface';
import { Sector } from '@ghostfolio/common/interfaces/sector.interface';
import { SectorName } from '@ghostfolio/common/types';

import { Injectable, Logger } from '@nestjs/common';
import { SymbolProfile } from '@prisma/client';

@Injectable()
export class TrackinsightDataEnhancerService implements DataEnhancerInterface {
  private static countriesMapping = {
    'Republic of Korea': 'KR',
    'Russian Federation': 'RU',
    Turkey: 'TR',
    USA: 'US',
    'Virgin Islands, British': 'VG'
  };
  private static holdingsWeightTreshold = 0.85;
  private static sectorsMapping: Record<string, SectorName> = {
    'Consumer Discretionary': 'Consumer Cyclical',
    'Consumer Staples': 'Consumer Defensive',
    Financials: 'Financial Services',
    'Health Care': 'Healthcare',
    'Information Technology': 'Technology',
    Materials: 'Basic Materials'
  };

  private readonly logger = new Logger(TrackinsightDataEnhancerService.name);

  public constructor(
    private readonly configurationService: ConfigurationService,
    private readonly fetchService: FetchService
  ) {}

  private get baseUrl() {
    return this.configurationService.get('TRACKINSIGHT_BASE_URL');
  }

  public async enhance({
    requestTimeout = this.configurationService.get('REQUEST_TIMEOUT'),
    response,
    symbol
  }: {
    requestTimeout?: number;
    response: Partial<SymbolProfile>;
    symbol: string;
  }): Promise<Partial<SymbolProfile>> {
    if (
      !(
        response.assetClass === 'EQUITY' &&
        ['ETF', 'MUTUALFUND'].includes(response.assetSubClass)
      )
    ) {
      return response;
    }

    let trackinsightSymbol = await this.searchTrackinsightSymbol({
      requestTimeout,
      symbol
    });

    if (!trackinsightSymbol) {
      trackinsightSymbol = await this.searchTrackinsightSymbol({
        requestTimeout,
        symbol: symbol.split('.')?.[0]
      });
    }

    if (!trackinsightSymbol) {
      return response;
    }

    const profile = await this.fetchService
      .fetch(
        `${this.baseUrl}/data-api/funds/${trackinsightSymbol}.json`,
        {
          signal: AbortSignal.timeout(requestTimeout)
        }
      )
      .then((res) => res.json())
      .catch(() => {
        return {};
      });

    const cusip = profile?.cusip;

    if (cusip) {
      response.cusip = cusip;
    }

    const isin = profile?.isins?.[0];

    if (isin) {
      response.isin = isin;
    }

    const holdings = await this.fetchService
      .fetch(
        `${this.baseUrl}/data-api/holdings/${trackinsightSymbol}.json`,
        {
          signal: AbortSignal.timeout(requestTimeout)
        }
      )
      .then((res) => res.json())
      .catch(() => {
        return {};
      });

    if (
      holdings?.weight < TrackinsightDataEnhancerService.holdingsWeightTreshold
    ) {
      // Skip if data is inaccurate
      return response;
    }

    if (
      !response.countries ||
      (response.countries as unknown as Country[]).length === 0
    ) {
      response.countries = [];

      for (const [name, value] of Object.entries<any>(
        holdings?.countries ?? {}
      )) {
        response.countries.push({
          code: getCountryCodeByName({
            name,
            aliases: TrackinsightDataEnhancerService.countriesMapping
          }),
          weight: value.weight
        });
      }
    }

    if (
      !response.holdings ||
      (response.holdings as unknown as Holding[]).length === 0
    ) {
      response.holdings = [];

      for (const { label, weight } of holdings?.topHoldings ?? []) {
        if (label?.toLowerCase() === 'other') {
          continue;
        }

        response.holdings.push({
          weight,
          name: label
        });
      }
    }

    if (
      !response.sectors ||
      (response.sectors as unknown as Sector[]).length === 0
    ) {
      response.sectors = [];

      for (const [name, value] of Object.entries<any>(
        holdings?.sectors ?? {}
      )) {
        response.sectors.push({
          name: getSectorName({
            name,
            aliases: TrackinsightDataEnhancerService.sectorsMapping
          }),
          weight: value.weight
        });
      }
    }

    return Promise.resolve(response);
  }

  public getName() {
    return 'TRACKINSIGHT';
  }

  public getTestSymbol() {
    return 'QQQ';
  }

  private async searchTrackinsightSymbol({
    requestTimeout,
    symbol
  }: {
    requestTimeout: number;
    symbol: string;
  }) {
    return this.fetchService
      .fetch(
        `${this.baseUrl}/search-api/search_v2/${symbol}/_/ticker/default/0/3`,
        {
          signal: AbortSignal.timeout(requestTimeout)
        }
      )
      .then((res) => res.json())
      .then((jsonRes) => {
        if (
          jsonRes['results']?.['count'] === 1 ||
          // Allow exact match
          jsonRes['results']?.['docs']?.[0]?.['ticker'] === symbol ||
          // Allow EXCHANGE:SYMBOL
          jsonRes['results']?.['docs']?.[0]?.['ticker']?.endsWith(`:${symbol}`)
        ) {
          return jsonRes['results']['docs'][0]['ticker'];
        }

        return undefined;
      })
      .catch(({ message }) => {
        this.logger.error(
          `Failed to search Trackinsight symbol for ${symbol} (${message})`
        );

        return undefined;
      });
  }
}
