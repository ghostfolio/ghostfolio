import { CreateOrderDto } from '@ghostfolio/common/dtos';

import { DataSource, Type } from '@prisma/client';

import { ImportService } from './import.service';

jest.mock('@ghostfolio/api/app/activities/activities.service', () => {
  return {
    ActivitiesService: jest.fn().mockImplementation(() => {
      return {
        getActivities: () => {
          return Promise.resolve({
            activities: [
              {
                accountId: 'df1c6156-9e17-4434-93c8-6ee4e15c8c1d',
                comment: null,
                currency: 'USD',
                date: new Date('2025-05-09T13:00:28.000Z'),
                fee: 0.35074925,
                quantity: 2,
                type: Type.BUY,
                unitPrice: 102.548,
                assetProfile: {
                  currency: 'USD',
                  dataSource: DataSource.YAHOO,
                  isin: 'US0079031078',
                  symbol: 'US0079031078'
                }
              }
            ]
          });
        }
      };
    })
  };
});

jest.mock(
  '@ghostfolio/api/services/symbol-profile/symbol-profile.service',
  () => {
    return {
      SymbolProfileService: jest.fn().mockImplementation(() => {
        return {
          getSymbolProfiles: (
            assetProfileIdentifiers: {
              dataSource: DataSource;
              symbol: string;
            }[]
          ) => {
            return Promise.resolve(
              assetProfileIdentifiers
                .filter(({ symbol }) => {
                  return symbol === 'AMD';
                })
                .map(({ dataSource, symbol }) => {
                  return { dataSource, symbol, isin: 'US0079031078' };
                })
            );
          }
        };
      })
    };
  }
);

describe('ImportService', () => {
  let importService: ImportService;

  beforeAll(() => {
    importService = new ImportService(
      null,
      new (jest.requireMock(
        '@ghostfolio/api/app/activities/activities.service'
      ).ActivitiesService)(),
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      new (jest.requireMock(
        '@ghostfolio/api/services/symbol-profile/symbol-profile.service'
      ).SymbolProfileService)(),
      null
    );
  });

  function buildActivityDto(
    overrides: Partial<CreateOrderDto> = {}
  ): Partial<CreateOrderDto> {
    return {
      accountId: 'df1c6156-9e17-4434-93c8-6ee4e15c8c1d',
      currency: 'USD',
      dataSource: DataSource.YAHOO,
      date: '2025-05-09T13:00:28.000Z',
      fee: 0.35074925,
      quantity: 2,
      symbol: 'US0079031078',
      type: Type.BUY,
      unitPrice: 102.548,
      ...overrides
    };
  }

  it('flags a duplicate when the comment is omitted instead of null', async () => {
    const [activity] = await (importService as any).extendActivitiesWithErrors({
      activitiesDto: [buildActivityDto()],
      userCurrency: 'USD',
      userId: 'da09d1fa-b8e2-40a1-9e5a-decd1cbb63b1'
    });

    expect(activity.error).toEqual({ code: 'IS_DUPLICATE' });
  });

  it('flags a duplicate when the same holding is imported by ticker symbol instead of ISIN', async () => {
    const [activity] = await (importService as any).extendActivitiesWithErrors({
      activitiesDto: [buildActivityDto({ symbol: 'AMD' })],
      userCurrency: 'USD',
      userId: 'da09d1fa-b8e2-40a1-9e5a-decd1cbb63b1'
    });

    expect(activity.error).toEqual({ code: 'IS_DUPLICATE' });
  });

  it('does not flag a different holding as a duplicate', async () => {
    const [activity] = await (importService as any).extendActivitiesWithErrors({
      activitiesDto: [buildActivityDto({ symbol: 'MSFT' })],
      userCurrency: 'USD',
      userId: 'da09d1fa-b8e2-40a1-9e5a-decd1cbb63b1'
    });

    expect(activity.error).toBeUndefined();
  });
});
