import { DataEnhancerInterface } from '@ghostfolio/api/services/data-provider/interfaces/data-enhancer.interface';
import { Country } from '@ghostfolio/common/interfaces/country.interface';
import { Sector } from '@ghostfolio/common/interfaces/sector.interface';
import { SymbolProfile } from '@prisma/client';
import bent from 'bent';

const getJSON = bent('json');

export class TrackinsightDataEnhancerService implements DataEnhancerInterface {
  private static baseUrl = 'https://data.trackinsight.com/holdings';
  private static countries = require('countries-list/dist/countries.json');
  private static countriesMapping = {
    'Russian Federation': 'Russia'
  };
  private static sectorsMapping = {
    'Consumer Discretionary': 'Consumer Cyclical',
    'Consumer Defensive': 'Consumer Staples',
    'Health Care': 'Healthcare',
    'Information Technology': 'Technology'
  };

  public async enhance({
    response,
    symbol
  }: {
    response: Partial<SymbolProfile>;
    symbol: string;
  }): Promise<Partial<SymbolProfile>> {
    if (
      !(response.assetClass === 'EQUITY' && response.assetSubClass === 'ETF')
    ) {
      return response;
    }

    const result = await getJSON(
      `${TrackinsightDataEnhancerService.baseUrl}/${symbol}.json`
    ).catch(() => {
      return getJSON(
        `${TrackinsightDataEnhancerService.baseUrl}/${
          symbol.split('.')[0]
        }.json`
      );
    });

    if (result.weight < 0.95) {
      // Skip if data is inaccurate
      return response;
    }

    if (
      !response.countries ||
      (response.countries as unknown as Country[]).length === 0
    ) {
      response.countries = [];
      for (const [name, value] of Object.entries<any>(result.countries)) {
        let countryCode: string;

        for (const [key, country] of Object.entries<any>(
          TrackinsightDataEnhancerService.countries
        )) {
          if (
            country.name === name ||
            country.name ===
              TrackinsightDataEnhancerService.countriesMapping[name]
          ) {
            countryCode = key;
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
      !response.sectors ||
      (response.sectors as unknown as Sector[]).length === 0
    ) {
      response.sectors = [];
      for (const [name, value] of Object.entries<any>(result.sectors)) {
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
}
