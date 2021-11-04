import { DataEnhancerInterface } from '@ghostfolio/api/services/data-provider/interfaces/data-enhancer.interface';
import { IDataProviderResponse } from '@ghostfolio/api/services/interfaces/interfaces';
import bent from 'bent';

const getJSON = bent('json');

export class TrackinsightDataEnhancerService implements DataEnhancerInterface {
  private static baseUrl = 'https://data.trackinsight.com/holdings';
  private static countries = require('countries-list/dist/countries.json');
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
    response: IDataProviderResponse;
    symbol: string;
  }): Promise<IDataProviderResponse> {
    if (
      !(response.assetClass === 'EQUITY' && response.assetSubClass === 'ETF')
    ) {
      return response;
    }

    const holdings = await getJSON(
      `${TrackinsightDataEnhancerService.baseUrl}/${symbol}.json`
    ).catch(() => {
      return getJSON(
        `${TrackinsightDataEnhancerService.baseUrl}/${
          symbol.split('.')[0]
        }.json`
      );
    });

    if (!response.countries || response.countries.length === 0) {
      response.countries = [];
      for (const [name, value] of Object.entries<any>(holdings.countries)) {
        let countryCode: string;

        for (const [key, country] of Object.entries<any>(
          TrackinsightDataEnhancerService.countries
        )) {
          if (country.name === name) {
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

    if (!response.sectors || response.sectors.length === 0) {
      response.sectors = [];
      for (const [name, value] of Object.entries<any>(holdings.sectors)) {
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
