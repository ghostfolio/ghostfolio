import { DataEnhancerInterface } from '@ghostfolio/api/services/data-provider/interfaces/data-enhancer.interface';
import { IDataProviderResponse } from '@ghostfolio/api/services/interfaces/interfaces';
import bent from 'bent';

const countries = require('countries-list/dist/countries.json');
const getJSON = bent('json');

export class TrackinsightEnhancerService implements DataEnhancerInterface {
  public async enhance(
    symbol: string,
    response: IDataProviderResponse
  ): Promise<IDataProviderResponse> {
    if (
      !(response.assetClass === 'EQUITY' && response.assetSubClass === 'ETF')
    ) {
      return response;
    }

    const holdings = await getJSON(
      `https://data.trackinsight.com/holdings/${symbol}.json`
    );

    if (!response.countries || response.countries.length === 0) {
      response.countries = [];
      for (const [name, value] of Object.entries<any>(holdings.countries)) {
        let countryCode: string;

        for (const [key, country] of Object.entries<any>(countries)) {
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

    return Promise.resolve(response);
  }
}
