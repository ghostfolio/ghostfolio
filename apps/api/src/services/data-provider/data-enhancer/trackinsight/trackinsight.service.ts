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
import { Prisma, SymbolProfile } from '@prisma/client';

@Injectable()
export class TrackinsightDataEnhancerService implements DataEnhancerInterface {
  private static baseUrl = 'https://www.trackinsight.com';

  private static countriesMapping = {
    'Czech Republic': 'CZ',
    Macau: 'MO',
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

  // Allows for floating point noise in the sums of Trackinsight
  private static weightTolerance = 0.001;

  private readonly logger = new Logger(TrackinsightDataEnhancerService.name);

  public constructor(
    private readonly configurationService: ConfigurationService,
    private readonly fetchService: FetchService
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
    if (!(
      response.assetClass === 'EQUITY' &&
      ['ETF', 'MUTUALFUND'].includes(response.assetSubClass)
    )) {
      return response;
    }

    let trackinsightSymbol = await this.searchTrackinsightSymbol({
      requestTimeout,
      symbol
    });

    if (!trackinsightSymbol && symbol.includes('.')) {
      trackinsightSymbol = await this.searchTrackinsightSymbol({
        requestTimeout,
        symbol: symbol.split('.')[0]
      });
    }

    if (!trackinsightSymbol) {
      return response;
    }

    const profile = await this.fetchJson({
      requestTimeout,
      url: `${TrackinsightDataEnhancerService.baseUrl}/data-api/funds/${trackinsightSymbol}.json`
    });

    const cusip = profile?.cusip;

    if (cusip && typeof cusip === 'string') {
      response.cusip = cusip;
    }

    const isin = Array.isArray(profile?.isins) ? profile.isins[0] : undefined;

    if (isin && typeof isin === 'string') {
      response.isin = isin;
    }

    const holdings = await this.fetchJson({
      requestTimeout,
      url: `${TrackinsightDataEnhancerService.baseUrl}/data-api/holdings/${trackinsightSymbol}.json`
    });

    if (!this.isValidHoldings(holdings)) {
      this.logger.warn(
        `Could not use the Trackinsight holdings of "${trackinsightSymbol}": Invalid response`
      );

      return response;
    }

    if (
      holdings.weight < TrackinsightDataEnhancerService.holdingsWeightTreshold
    ) {
      // Skip if data is inaccurate
      return response;
    }

    if (
      !response.countries ||
      (response.countries as unknown as Country[]).length === 0
    ) {
      const countries: Prisma.JsonArray = [];

      for (const [name, value] of Object.entries<any>(
        holdings.countries ?? {}
      )) {
        const code = getCountryCodeByName({
          name,
          aliases: TrackinsightDataEnhancerService.countriesMapping,
          dataSource: this.getName()
        });

        if (code) {
          countries.push({ code, weight: value.weight });
        }
      }

      if (countries.length > 0) {
        response.countries = countries;
      }
    }

    if (
      !response.holdings ||
      (response.holdings as unknown as Holding[]).length === 0
    ) {
      const topHoldings: Prisma.JsonArray = [];

      for (const { label, weight } of holdings.topHoldings ?? []) {
        if (label.toLowerCase() === 'other') {
          continue;
        }

        topHoldings.push({
          weight,
          name: label
        });
      }

      if (topHoldings.length > 0) {
        response.holdings = topHoldings;
      }
    }

    if (
      !response.sectors ||
      (response.sectors as unknown as Sector[]).length === 0
    ) {
      const sectors: Prisma.JsonArray = [];

      for (const [name, value] of Object.entries<any>(holdings.sectors ?? {})) {
        sectors.push({
          name: getSectorName({
            name,
            aliases: TrackinsightDataEnhancerService.sectorsMapping
          }),
          weight: value.weight
        });
      }

      if (sectors.length > 0) {
        response.sectors = sectors;
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

  private async fetchJson({
    requestTimeout,
    url
  }: {
    requestTimeout: number;
    url: string;
  }) {
    return this.fetchService
      .fetch(url, {
        signal: AbortSignal.timeout(requestTimeout)
      })
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP status ${res.status}`);
        }

        return res.json();
      })
      .catch(({ message }) => {
        this.logger.warn(`Could not fetch ${url}: ${message}`);

        return undefined;
      });
  }

  private isValidHoldings(holdings: any) {
    if (!this.isValidWeight(holdings?.weight)) {
      return false;
    }

    const { countries, sectors, topHoldings } = holdings;

    if (topHoldings !== undefined && !Array.isArray(topHoldings)) {
      return false;
    }

    return (
      Object.values<any>(countries ?? {}).every((country) => {
        return this.isValidWeight(country?.weight);
      }) &&
      Object.values<any>(sectors ?? {}).every((sector) => {
        return this.isValidWeight(sector?.weight);
      }) &&
      (topHoldings ?? []).every((topHolding) => {
        return (
          typeof topHolding?.label === 'string' &&
          this.isValidWeight(topHolding?.weight)
        );
      })
    );
  }

  private isValidWeight(weight: unknown) {
    return (
      typeof weight === 'number' &&
      weight >= 0 &&
      weight <= 1 + TrackinsightDataEnhancerService.weightTolerance
    );
  }

  private async searchTrackinsightSymbol({
    requestTimeout,
    symbol
  }: {
    requestTimeout: number;
    symbol: string;
  }) {
    const jsonRes = await this.fetchJson({
      requestTimeout,
      url: `${TrackinsightDataEnhancerService.baseUrl}/search-api/search_v2/${encodeURIComponent(symbol)}/_/ticker/default/0/3`
    });

    if (!jsonRes) {
      return undefined;
    }

    if (!Array.isArray(jsonRes.results?.docs)) {
      this.logger.warn(
        `Could not search Trackinsight symbol for "${symbol}": Invalid response`
      );

      return undefined;
    }

    const ticker = jsonRes.results.docs[0]?.ticker;

    if (
      typeof ticker === 'string' &&
      (jsonRes.results.count === 1 ||
        // Allow exact match
        ticker === symbol ||
        // Allow EXCHANGE:SYMBOL
        ticker.endsWith(`:${symbol}`))
    ) {
      return ticker;
    }

    this.logger.debug(
      `Could not match a Trackinsight symbol for "${symbol}": ${JSON.stringify(
        jsonRes
      )}`
    );

    return undefined;
  }
}
