import { DataProviderService } from '@ghostfolio/api/services/data-provider/data-provider.service';
import { MarketDataService } from '@ghostfolio/api/services/market-data/market-data.service';
import { PropertyService } from '@ghostfolio/api/services/property/property.service';
import { UniqueAsset } from '@ghostfolio/common/interfaces';

import { DataSource, MarketData } from '@prisma/client';

import { CurrentRateService } from './current-rate.service';
import { GetValuesObject } from './interfaces/get-values-object.interface';

jest.mock('@ghostfolio/api/services/market-data/market-data.service', () => {
  return {
    MarketDataService: jest.fn().mockImplementation(() => {
      return {
        get: (date: Date, symbol: string) => {
          return Promise.resolve<MarketData>({
            date,
            symbol,
            createdAt: date,
            dataSource: DataSource.YAHOO,
            id: 'aefcbe3a-ee10-4c4f-9f2d-8ffad7b05584',
            marketPrice: 1847.839966,
            state: 'CLOSE'
          });
        },
        getRange: ({
          dateRangeEnd,
          dateRangeStart,
          uniqueAssets
        }: {
          dateRangeEnd: Date;
          dateRangeStart: Date;
          uniqueAssets: UniqueAsset[];
        }) => {
          return Promise.resolve<MarketData[]>([
            {
              createdAt: dateRangeStart,
              dataSource: uniqueAssets[0].dataSource,
              date: dateRangeStart,
              id: '8fa48fde-f397-4b0d-adbc-fb940e830e6d',
              marketPrice: 1841.823902,
              state: 'CLOSE',
              symbol: uniqueAssets[0].symbol
            },
            {
              createdAt: dateRangeEnd,
              dataSource: uniqueAssets[0].dataSource,
              date: dateRangeEnd,
              id: '082d6893-df27-4c91-8a5d-092e84315b56',
              marketPrice: 1847.839966,
              state: 'CLOSE',
              symbol: uniqueAssets[0].symbol
            }
          ]);
        }
      };
    })
  };
});

jest.mock(
  '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.service',
  () => {
    return {
      ExchangeRateDataService: jest.fn().mockImplementation(() => {
        return {
          initialize: () => Promise.resolve(),
          toCurrency: (value: number) => {
            return 1 * value;
          },
          getExchangeRates: () => Promise.resolve()
        };
      })
    };
  }
);

jest.mock('@ghostfolio/api/services/property/property.service', () => {
  return {
    PropertyService: jest.fn().mockImplementation(() => {
      return {
        getByKey: (key: string) => Promise.resolve({})
      };
    })
  };
});

describe('CurrentRateService', () => {
  let currentRateService: CurrentRateService;
  let dataProviderService: DataProviderService;
  let marketDataService: MarketDataService;
  let propertyService: PropertyService;

  beforeAll(async () => {
    propertyService = new PropertyService(null);

    dataProviderService = new DataProviderService(
      null,
      [],
      null,
      null,
      propertyService,
      null
    );

    marketDataService = new MarketDataService(null);

    currentRateService = new CurrentRateService(
      dataProviderService,
      marketDataService,
      null,
      null
    );
  });

  it('getValues', async () => {
    expect(
      await currentRateService.getValues({
        dataGatheringItems: [{ dataSource: DataSource.YAHOO, symbol: 'AMZN' }],
        dateQuery: {
          lt: new Date(Date.UTC(2020, 0, 2, 0, 0, 0)),
          gte: new Date(Date.UTC(2020, 0, 1, 0, 0, 0))
        }
      })
    ).toMatchObject<GetValuesObject>({
      dataProviderInfos: [],
      errors: [],
      values: [
        {
          dataSource: 'YAHOO',
          date: undefined,
          marketPrice: 1841.823902,
          symbol: 'AMZN'
        }
      ]
    });
  });
});
