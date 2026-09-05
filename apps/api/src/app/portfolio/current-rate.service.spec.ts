import type { ActivitiesService } from '@ghostfolio/api/app/activities/activities.service';
import { DataProviderService } from '@ghostfolio/api/services/data-provider/data-provider.service';
import { MarketDataService } from '@ghostfolio/api/services/market-data/market-data.service';
import { PropertyService } from '@ghostfolio/api/services/property/property.service';
import { resetHours } from '@ghostfolio/common/helper';
import { AssetProfileIdentifier } from '@ghostfolio/common/interfaces';

import { utc } from '@date-fns/utc';
import {
  DataSource,
  MarketData,
  Order,
  Type as ActivityType
} from '@prisma/client';
import { endOfDay, subDays } from 'date-fns';

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
  let activitiesService: ActivitiesService;
  let currentRateService: CurrentRateService;
  let dataProviderService: DataProviderService;
  let marketDataService: MarketDataService;
  let propertyService: PropertyService;

  beforeAll(async () => {
    activitiesService = {
      getLatestActivity: jest.fn()
    } as unknown as ActivitiesService;

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
      activitiesService,
      dataProviderService,
      marketDataService,
      null
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
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

  it('getValues with a missing quote falls back to the latest market price', async () => {
    const today = resetHours(new Date());
    const yesterday = subDays(today, 1, { in: utc });

    jest.spyOn(dataProviderService, 'getQuotes').mockResolvedValue({});

    jest.spyOn(marketDataService, 'getRangeCount').mockResolvedValue(1);

    jest.spyOn(marketDataService, 'getRange').mockResolvedValue([
      {
        createdAt: yesterday,
        dataSource: DataSource.YAHOO,
        date: yesterday,
        id: '3b1a3f4c-3d2b-4a19-9f5a-5c0f5b4a2e11',
        isCarriedForward: false,
        marketPrice: 1841.823902,
        state: 'CLOSE',
        symbol: 'AMZN'
      }
    ]);

    const getLatestActivitySpy = jest.spyOn(
      activitiesService,
      'getLatestActivity'
    );

    const { errors, values } = await currentRateService.getValues({
      dataGatheringItems: [{ dataSource: DataSource.YAHOO, symbol: 'AMZN' }],
      dateQuery: { gte: yesterday, lt: endOfDay(new Date()) }
    });

    expect(errors).toEqual([{ dataSource: DataSource.YAHOO, symbol: 'AMZN' }]);

    expect(values).toContainEqual({
      dataSource: DataSource.YAHOO,
      date: today,
      marketPrice: 1841.823902,
      symbol: 'AMZN'
    });

    expect(getLatestActivitySpy).not.toHaveBeenCalled();
  });

  it('getValues with a missing quote and without market data falls back to the latest buy or sell activity', async () => {
    const today = resetHours(new Date());

    jest.spyOn(dataProviderService, 'getQuotes').mockResolvedValue({});

    jest.spyOn(marketDataService, 'getRangeCount').mockResolvedValue(0);

    const getLatestActivitySpy = jest
      .spyOn(activitiesService, 'getLatestActivity')
      .mockResolvedValue({ unitPrice: 1847.839966 } as Order);

    const { values } = await currentRateService.getValues({
      dataGatheringItems: [{ dataSource: DataSource.YAHOO, symbol: 'AMZN' }],
      dateQuery: {
        gte: subDays(today, 1, { in: utc }),
        lt: endOfDay(new Date())
      }
    });

    expect(getLatestActivitySpy).toHaveBeenCalledWith({
      dataSource: DataSource.YAHOO,
      symbol: 'AMZN',
      types: [ActivityType.BUY, ActivityType.SELL]
    });

    expect(values).toEqual([
      {
        dataSource: DataSource.YAHOO,
        date: today,
        marketPrice: 1847.839966,
        symbol: 'AMZN'
      }
    ]);
  });
});
