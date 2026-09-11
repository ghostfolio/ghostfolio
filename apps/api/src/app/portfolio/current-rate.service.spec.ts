import { ActivitiesService } from '@ghostfolio/api/app/activities/activities.service';
import { DataProviderService } from '@ghostfolio/api/services/data-provider/data-provider.service';
import { MarketDataService } from '@ghostfolio/api/services/market-data/market-data.service';
import { PropertyService } from '@ghostfolio/api/services/property/property.service';
import { AssetProfileIdentifier } from '@ghostfolio/common/interfaces';

import { DataSource, MarketData } from '@prisma/client';

import { CurrentRateService } from './current-rate.service';
import { DateQuery } from './interfaces/date-query.interface';
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
            isCarriedForward: false,
            marketPrice: 1847.839966,
            state: 'CLOSE'
          });
        },
        getRange: ({
          assetProfileIdentifiers,
          dateQuery
        }: {
          assetProfileIdentifiers: AssetProfileIdentifier[];
          dateQuery: DateQuery;
          skip?: number;
          take?: number;
        }) => {
          return Promise.resolve<MarketData[]>([
            {
              createdAt: dateQuery.gte,
              dataSource: assetProfileIdentifiers[0].dataSource,
              date: dateQuery.gte,
              id: '8fa48fde-f397-4b0d-adbc-fb940e830e6d',
              isCarriedForward: false,
              marketPrice: 1841.823902,
              state: 'CLOSE',
              symbol: assetProfileIdentifiers[0].symbol
            },
            {
              createdAt: dateQuery.lt,
              dataSource: assetProfileIdentifiers[0].dataSource,
              date: dateQuery.lt,
              id: '082d6893-df27-4c91-8a5d-092e84315b56',
              isCarriedForward: false,
              marketPrice: 1847.839966,
              state: 'CLOSE',
              symbol: assetProfileIdentifiers[0].symbol
            }
          ]);
        },
        getRangeCount: ({}: {
          assetProfileIdentifiers: AssetProfileIdentifier[];
          dateRangeEnd: Date;
          dateRangeStart: Date;
        }) => {
          return Promise.resolve<number>(2);
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
        getByKey: () => Promise.resolve({})
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
      null,
      dataProviderService,
      marketDataService,
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
          date: new Date('2020-01-01T00:00:00.000Z'),
          marketPrice: 1841.823902,
          symbol: 'AMZN'
        },
        {
          dataSource: 'YAHOO',
          date: new Date('2020-01-02T00:00:00.000Z'),
          marketPrice: 1847.839966,
          symbol: 'AMZN'
        }
      ]
    });
  });

  it('uses the latest market price when the current quote is unavailable', async () => {
    const historicalDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const activitiesService = {
      getLatestActivity: jest.fn().mockResolvedValue({ unitPrice: 100 })
    };
    const dataProviderService = {
      getQuotes: jest.fn().mockResolvedValue({})
    };
    const marketDataService = {
      getRange: jest.fn().mockResolvedValue([
        {
          createdAt: historicalDate,
          dataSource: DataSource.YAHOO,
          date: historicalDate,
          id: '40520fdf-4e31-47ab-8bd0-ca61c70d4684',
          isCarriedForward: false,
          marketPrice: 200,
          state: 'CLOSE',
          symbol: 'AMZN'
        }
      ]),
      getRangeCount: jest.fn().mockResolvedValue(1)
    };
    const service = new CurrentRateService(
      activitiesService as unknown as ActivitiesService,
      dataProviderService as unknown as DataProviderService,
      marketDataService as unknown as MarketDataService,
      null
    );

    const response = await service.getValues({
      dataGatheringItems: [{ dataSource: DataSource.YAHOO, symbol: 'AMZN' }],
      dateQuery: {
        gte: historicalDate,
        lt: new Date(Date.now() + 24 * 60 * 60 * 1000)
      }
    });
    const latestValue = response.values
      .filter(({ dataSource, symbol }) => {
        return dataSource === DataSource.YAHOO && symbol === 'AMZN';
      })
      .sort((a, b) => b.date.getTime() - a.date.getTime())[0];

    expect(latestValue.marketPrice).toBe(200);
    expect(activitiesService.getLatestActivity).not.toHaveBeenCalled();
  });
});
