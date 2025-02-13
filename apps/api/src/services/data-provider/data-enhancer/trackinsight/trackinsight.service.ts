import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';
import { DataEnhancerInterface } from '@ghostfolio/api/services/data-provider/interfaces/data-enhancer.interface';
import { Holding } from '@ghostfolio/common/interfaces';
import { Country } from '@ghostfolio/common/interfaces/country.interface';
import { Sector } from '@ghostfolio/common/interfaces/sector.interface';

import { Injectable } from '@nestjs/common';
import { SymbolProfile } from '@prisma/client';
import { countries } from 'countries-list';

@Injectable()
export class TrackinsightDataEnhancerService implements DataEnhancerInterface {
  private static baseUrl = 'https://www.trackinsight.com/data-api';
  private static countriesMapping = {
    'Russian Federation': 'Russia'
  };
  private static holdingsWeightTreshold = 0.85;
  private static sectorsMapping = {
    'Consumer Discretionary': 'Consumer Cyclical',
    'Consumer Defensive': 'Consumer Staples',
    'Health Care': 'Healthcare',
    'Information Technology': 'Technology'
  };

  public constructor(
    private readonly configurationService: ConfigurationService
  ) {}

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

    const profile = await fetch(
      `${TrackinsightDataEnhancerService.baseUrl}/funds/${trackinsightSymbol}.json`,
      {
        signal: AbortSignal.timeout(requestTimeout)
      }
    )
      .then((res) => res.json())
      .catch(() => {
        return {};
      });

    const isin = profile?.isin?.split(';')?.[0];

    if (isin) {
      response.isin = isin;
    }

    const holdings = await fetch(
      `${TrackinsightDataEnhancerService.baseUrl}/holdings/${trackinsightSymbol}.json`,
      {
        signal: AbortSignal.timeout(
          this.configurationService.get('REQUEST_TIMEOUT')
        )
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
        let countryCode: string;

        for (const [code, country] of Object.entries(countries)) {
          if (
            country.name === name ||
            country.name ===
              TrackinsightDataEnhancerService.countriesMapping[name]
          ) {
            countryCode = code;
            break;
          }
        }

        response.countries.push({
          code: countryCode,
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
          name: TrackinsightDataEnhancerService.sectorsMapping[name] ?? name,
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
    return fetch(
      `https://www.trackinsight.com/search-api/search_v2/${symbol}/_/ticker/default/0/3`,
      {
        signal: AbortSignal.timeout(requestTimeout)
      }
    )
      .then((res) => res.json())
      .then((jsonRes) => {
        if (
          jsonRes['results']?.['count'] === 1 ||
          jsonRes['results']?.['docs']?.[0]?.['ticker'] === symbol
        ) {
          return jsonRes['results']['docs'][0]['ticker'];
        }

        return undefined;
      })
      .catch(() => {
        return undefined;
      });
  }
}
