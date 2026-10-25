import { AccountService } from '@ghostfolio/api/app/account/account.service';
import { ActivitiesService } from '@ghostfolio/api/app/activities/activities.service';
import { PortfolioService } from '@ghostfolio/api/app/portfolio/portfolio.service';
import { ApiService } from '@ghostfolio/api/services/api/api.service';
import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';
import { DataProviderService } from '@ghostfolio/api/services/data-provider/data-provider.service';
import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.service';
import { MarketDataService } from '@ghostfolio/api/services/market-data/market-data.service';
import { PlatformService } from '@ghostfolio/api/services/platform/platform.service';
import { DataGatheringService } from '@ghostfolio/api/services/queues/data-gathering/data-gathering.service';
import { SymbolProfileService } from '@ghostfolio/api/services/symbol-profile/symbol-profile.service';
import { TagService } from '@ghostfolio/api/services/tag/tag.service';
import { NON_INVESTMENT_ACTIVITY_TYPES } from '@ghostfolio/common/config';
import {
  CreateAccountWithBalancesDto,
  CreateAssetProfileWithMarketDataDto,
  CreateOrderDto
} from '@ghostfolio/common/dtos';
import { getAssetProfileIdentifier } from '@ghostfolio/common/helper';
import {
  Activity,
  AssetProfileIdentifier
} from '@ghostfolio/common/interfaces';
import { UserWithSettings } from '@ghostfolio/common/types';

import { DataSource, SymbolProfile } from '@prisma/client';
import { isUUID } from 'class-validator';
import { parseISO } from 'date-fns';

import { ImportService } from './import.service';

const CUSTOM_ASSET_PROFILE_SYMBOL = '1ad7d4a2-6b2d-4e0f-9b1f-2c0f8d3e5a7b';

describe('ImportService', () => {
  let addSymbolProfile: jest.Mock;
  let createAccount: jest.Mock;
  let accounts: jest.Mock;
  let createActivity: jest.Mock;
  let gatherSymbols: jest.Mock;
  let importService: ImportService;
  let updateManyMarketData: jest.Mock;

  beforeEach(() => {
    const configuration = {
      DATA_SOURCES_GHOSTFOLIO_DATA_PROVIDER: [],
      ENABLE_FEATURE_SUBSCRIPTION: false,
      MAX_ACTIVITIES_TO_IMPORT: Number.MAX_SAFE_INTEGER
    };

    addSymbolProfile = jest.fn();
    createAccount = jest.fn().mockResolvedValue({ id: 'account-id' });
    accounts = jest.fn().mockResolvedValue([]);
    createActivity = jest.fn();
    gatherSymbols = jest.fn();
    updateManyMarketData = jest.fn();

    const validateActivities = jest.fn(
      ({ activitiesDto }: { activitiesDto: CreateOrderDto[] }) => {
        const assetProfiles: {
          [assetProfileIdentifier: string]: Partial<SymbolProfile>;
        } = {};

        for (const { currency, dataSource, symbol } of activitiesDto) {
          assetProfiles[getAssetProfileIdentifier({ dataSource, symbol })] ??= {
            currency,
            dataSource,
            symbol,
            name: symbol
          };
        }

        return assetProfiles;
      }
    );

    importService = new ImportService(
      {
        createAccount,
        accounts
      } as unknown as AccountService,
      {
        createActivity,
        getActivities: jest.fn().mockResolvedValue({ activities: [], count: 0 })
      } as unknown as ActivitiesService,
      null,
      {
        get: (key: keyof typeof configuration) => {
          return configuration[key];
        }
      } as unknown as ConfigurationService,
      { gatherSymbols } as unknown as DataGatheringService,
      {
        validateActivities,
        getDataSourceForImport: jest.fn().mockReturnValue(DataSource.MANUAL)
      } as unknown as DataProviderService,
      {
        toCurrencyAtDate: jest.fn().mockResolvedValue(0)
      } as unknown as ExchangeRateDataService,
      { updateMany: updateManyMarketData } as unknown as MarketDataService,
      {
        getPlatforms: jest.fn().mockResolvedValue([])
      } as unknown as PlatformService,
      null,
      {
        add: addSymbolProfile,
        getCustomSymbolProfilesByNames: jest.fn().mockResolvedValue([]),
        getSymbolProfiles: jest.fn().mockResolvedValue([])
      } as unknown as SymbolProfileService,
      {
        getTagsForUser: jest.fn().mockResolvedValue([])
      } as unknown as TagService
    );
  });

  describe('getDividends', () => {
    it('returns no dividends if another request fails while the dividends are loading', async () => {
      const service = new ImportService(
        null,
        {
          getActivities: jest.fn().mockRejectedValue(new Error())
        } as unknown as ActivitiesService,
        {
          buildFiltersFromQueryParams: jest.fn().mockReturnValue([])
        } as unknown as ApiService,
        null,
        null,
        {
          getDividends: jest.fn(() => {
            return new Promise((resolve) => {
              setTimeout(() => {
                resolve({});
              }, 10);
            });
          })
        } as unknown as DataProviderService,
        null,
        null,
        null,
        {
          getAccountsWithAggregations: jest
            .fn()
            .mockResolvedValue({ accounts: [] }),
          getHolding: jest.fn().mockResolvedValue({
            dateOfFirstActivity: '2024-01-01',
            historicalData: []
          })
        } as unknown as PortfolioService,
        {
          getSymbolProfiles: jest.fn().mockResolvedValue([])
        } as unknown as SymbolProfileService,
        null
      );

      await expect(
        service.getDividends({
          dataSource: DataSource.YAHOO,
          symbol: 'AAPL',
          userCurrency: 'USD',
          userId: 'user-id'
        })
      ).resolves.toEqual([]);
    });
  });

  describe('import', () => {
    it.each([false, true])(
      'rejects any cash backup before writes (dry run: %s)',
      async (isDryRun) => {
        await expect(
          importActivities({
            isDryRun,
            activitiesDto: [],
            accountsWithBalancesDto: [
              {
                id: 'account-id',
                name: 'Account',
                currency: 'USD',
                platformId: null,
                cashManagement: {
                  version: 1,
                  currency: 'USD',
                  defaultUpdateCash: false,
                  openingBalance: {
                    date: '2024-01-01',
                    sequence: 0,
                    balance: '0'
                  },
                  events: []
                }
              }
            ]
          })
        ).rejects.toThrow('POST /api/v1/import/restore');
        expect(createAccount).not.toHaveBeenCalled();
        expect(createActivity).not.toHaveBeenCalled();
        expect(addSymbolProfile).not.toHaveBeenCalled();
        expect(updateManyMarketData).not.toHaveBeenCalled();
        expect(gatherSymbols).not.toHaveBeenCalled();
      }
    );

    it('rejects a partial cash restore before creating an account or an activity', async () => {
      await expect(
        importActivities({
          accountsWithBalancesDto: [
            {
              id: 'account-id',
              currency: 'USD',
              name: 'Account',
              platformId: null,
              cashManagement: {
                version: 1,
                currency: 'USD',
                defaultUpdateCash: false,
                openingBalance: {
                  date: '2024-01-01',
                  sequence: 0,
                  balance: '0'
                },
                events: [
                  {
                    id: 'event',
                    orderId: 'missing-order',
                    sequence: 1,
                    type: 'MOVEMENT',
                    date: '2024-01-02',
                    amount: '-100'
                  }
                ]
              }
            }
          ],
          activitiesDto: []
        })
      ).rejects.toThrow('POST /api/v1/import/restore');
      expect(createAccount).not.toHaveBeenCalled();
      expect(createActivity).not.toHaveBeenCalled();
    });

    it('imports balances without accepting projection flags', async () => {
      const balances = [
        {
          date: '2024-01-01T00:00:00.000Z',
          isCashManagementProjection: true,
          value: 1234.56
        },
        { date: '2024-02-01T00:00:00.000Z', value: 0 }
      ];

      await importActivities({
        accountsWithBalancesDto: [
          {
            balances,
            currency: 'USD',
            id: 'account-id',
            name: 'Imported account',
            platformId: null
          }
        ],
        activitiesDto: []
      });

      expect(createAccount).toHaveBeenCalledTimes(1);
      expect(createAccount.mock.calls[0][0].data.balances.create).toStrictEqual(
        [
          { date: '2024-01-01T00:00:00.000Z', value: 1234.56 },
          { date: '2024-02-01T00:00:00.000Z', value: 0 }
        ]
      );
    });

    it('keeps the asset profile of an investment activity after a non-investment activity', async () => {
      mockCreatedAssetProfiles([
        { dataSource: DataSource.MANUAL, symbol: CUSTOM_ASSET_PROFILE_SYMBOL },
        { dataSource: DataSource.YAHOO, symbol: 'AAPL' }
      ]);

      const activities = await importActivities({
        activitiesDto: [
          createActivityDto({
            dataSource: DataSource.YAHOO,
            date: '2024-01-01T00:00:00.000Z',
            symbol: 'AAPL',
            type: 'FEE'
          }),
          createActivityDto({
            dataSource: DataSource.YAHOO,
            date: '2024-01-02T00:00:00.000Z',
            symbol: 'AAPL',
            type: 'BUY'
          })
        ]
      });

      expect(
        createActivity.mock.calls[1][0].SymbolProfile.connectOrCreate.create
      ).toMatchObject({ dataSource: DataSource.YAHOO, symbol: 'AAPL' });

      expect(getAssetProfileIdentifiers(activities)).toEqual([
        { dataSource: DataSource.MANUAL, symbol: CUSTOM_ASSET_PROFILE_SYMBOL },
        { dataSource: DataSource.YAHOO, symbol: 'AAPL' }
      ]);

      expect(gatherSymbols.mock.calls[0][0].dataGatheringItems).toEqual([
        {
          dataSource: DataSource.MANUAL,
          date: parseISO('2024-01-01T00:00:00.000Z'),
          symbol: CUSTOM_ASSET_PROFILE_SYMBOL
        },
        {
          dataSource: DataSource.YAHOO,
          date: parseISO('2024-01-02T00:00:00.000Z'),
          symbol: 'AAPL'
        }
      ]);
    });

    it('shows the custom asset profile of a non-investment activity after an investment activity', async () => {
      mockCreatedAssetProfiles([
        { dataSource: DataSource.YAHOO, symbol: 'AAPL' },
        { dataSource: DataSource.MANUAL, symbol: CUSTOM_ASSET_PROFILE_SYMBOL }
      ]);

      const activities = await importActivities({
        activitiesDto: [
          createActivityDto({
            dataSource: DataSource.YAHOO,
            date: '2024-01-01T00:00:00.000Z',
            symbol: 'AAPL',
            type: 'BUY'
          }),
          createActivityDto({
            dataSource: DataSource.YAHOO,
            date: '2024-01-02T00:00:00.000Z',
            symbol: 'AAPL',
            type: 'FEE'
          })
        ]
      });

      expect(
        createActivity.mock.calls[1][0].SymbolProfile.connectOrCreate.create
      ).toMatchObject({ dataSource: DataSource.YAHOO, symbol: 'AAPL' });

      expect(getAssetProfileIdentifiers(activities)).toEqual([
        { dataSource: DataSource.YAHOO, symbol: 'AAPL' },
        { dataSource: DataSource.MANUAL, symbol: CUSTOM_ASSET_PROFILE_SYMBOL }
      ]);
    });

    it.each(NON_INVESTMENT_ACTIVITY_TYPES)(
      'refers the next %s activities of a data provider to the custom asset profile which createActivity() has created',
      async (type) => {
        mockCreatedAssetProfiles([
          {
            dataSource: DataSource.MANUAL,
            symbol: CUSTOM_ASSET_PROFILE_SYMBOL
          },
          { dataSource: DataSource.MANUAL, symbol: CUSTOM_ASSET_PROFILE_SYMBOL }
        ]);

        await importActivities({
          activitiesDto: [
            createActivityDto({
              type,
              dataSource: DataSource.YAHOO,
              date: '2024-01-01T00:00:00.000Z',
              symbol: 'AAPL'
            }),
            createActivityDto({
              type,
              dataSource: DataSource.YAHOO,
              date: '2024-01-02T00:00:00.000Z',
              symbol: 'AAPL'
            })
          ]
        });

        expect(
          createActivity.mock.calls[1][0].SymbolProfile.connectOrCreate.create
        ).toMatchObject({ symbol: CUSTOM_ASSET_PROFILE_SYMBOL });
      }
    );

    it('refers the next activities without a data source to the custom asset profile which createActivity() has created', async () => {
      mockCreatedAssetProfiles([
        { dataSource: DataSource.MANUAL, symbol: CUSTOM_ASSET_PROFILE_SYMBOL },
        { dataSource: DataSource.MANUAL, symbol: CUSTOM_ASSET_PROFILE_SYMBOL }
      ]);

      await importActivities({
        activitiesDto: [
          createActivityDto({
            date: '2024-01-01T00:00:00.000Z',
            symbol: 'Broker fee',
            type: 'FEE'
          }),
          createActivityDto({
            date: '2024-01-02T00:00:00.000Z',
            symbol: 'Broker fee',
            type: 'FEE'
          })
        ]
      });

      expect(
        createActivity.mock.calls[1][0].SymbolProfile.connectOrCreate.create
      ).toMatchObject({
        dataSource: DataSource.MANUAL,
        symbol: CUSTOM_ASSET_PROFILE_SYMBOL
      });
    });

    it('refers the next investment activities without a data source to the custom asset profile which createActivity() has created', async () => {
      mockCreatedAssetProfiles([
        { dataSource: DataSource.MANUAL, symbol: CUSTOM_ASSET_PROFILE_SYMBOL },
        { dataSource: DataSource.MANUAL, symbol: CUSTOM_ASSET_PROFILE_SYMBOL },
        { dataSource: DataSource.MANUAL, symbol: CUSTOM_ASSET_PROFILE_SYMBOL }
      ]);

      await importActivities({
        activitiesDto: [
          createActivityDto({
            date: '2024-01-01T00:00:00.000Z',
            symbol: 'Gold',
            type: 'BUY'
          }),
          createActivityDto({
            date: '2024-01-02T00:00:00.000Z',
            symbol: 'Gold',
            type: 'BUY'
          }),
          createActivityDto({
            date: '2024-01-03T00:00:00.000Z',
            symbol: 'Gold',
            type: 'SELL'
          })
        ]
      });

      expect(
        createActivity.mock.calls.slice(1).map(([activity]) => {
          return activity.SymbolProfile.connectOrCreate.create;
        })
      ).toMatchObject([
        { dataSource: DataSource.MANUAL, symbol: CUSTOM_ASSET_PROFILE_SYMBOL },
        { dataSource: DataSource.MANUAL, symbol: CUSTOM_ASSET_PROFILE_SYMBOL }
      ]);

      expect(gatherSymbols.mock.calls[0][0].dataGatheringItems).toEqual([
        {
          dataSource: DataSource.MANUAL,
          date: parseISO('2024-01-01T00:00:00.000Z'),
          symbol: CUSTOM_ASSET_PROFILE_SYMBOL
        }
      ]);
    });

    it('creates a custom asset profile with a UUID instead of a symbol with the prefix', async () => {
      mockCreatedAssetProfiles([
        { dataSource: DataSource.MANUAL, symbol: CUSTOM_ASSET_PROFILE_SYMBOL }
      ]);

      await importActivities({
        activitiesDto: [
          createActivityDto({
            dataSource: DataSource.MANUAL,
            date: '2024-01-01T00:00:00.000Z',
            symbol: 'GF_COPX',
            type: 'BUY'
          })
        ],
        assetProfilesWithMarketDataDto: [
          {
            currency: 'USD',
            dataSource: DataSource.MANUAL,
            marketData: [],
            name: 'Global X Copper Miners ETF',
            symbol: 'GF_COPX'
          }
        ]
      });

      const { symbol } = addSymbolProfile.mock.calls[0][0];

      expect(isUUID(symbol)).toBe(true);

      expect(
        createActivity.mock.calls[0][0].SymbolProfile.connectOrCreate.create
      ).toMatchObject({ symbol, dataSource: DataSource.MANUAL });
    });

    it('keeps the symbol with the prefix as the name of a custom asset profile without a name', async () => {
      mockCreatedAssetProfiles([
        { dataSource: DataSource.MANUAL, symbol: CUSTOM_ASSET_PROFILE_SYMBOL }
      ]);

      await importActivities({
        activitiesDto: [
          createActivityDto({
            dataSource: DataSource.MANUAL,
            date: '2024-01-01T00:00:00.000Z',
            symbol: 'GF_COPX',
            type: 'BUY'
          })
        ],
        assetProfilesWithMarketDataDto: [
          {
            currency: 'USD',
            dataSource: DataSource.MANUAL,
            marketData: [],
            symbol: 'GF_COPX'
          }
        ]
      });

      expect(addSymbolProfile.mock.calls[0][0].name).toBe('GF_COPX');
    });

    it('merges the market data of asset profiles with the same symbol with the prefix', async () => {
      mockCreatedAssetProfiles([
        { dataSource: DataSource.MANUAL, symbol: CUSTOM_ASSET_PROFILE_SYMBOL }
      ]);

      await importActivities({
        activitiesDto: [
          createActivityDto({
            dataSource: DataSource.MANUAL,
            date: '2024-01-01T00:00:00.000Z',
            symbol: 'GF_COPX',
            type: 'BUY'
          })
        ],
        assetProfilesWithMarketDataDto: [
          {
            currency: 'USD',
            dataSource: DataSource.MANUAL,
            marketData: [{ date: '2024-01-01', marketPrice: 100 }],
            name: 'Global X Copper Miners ETF',
            symbol: 'GF_COPX'
          },
          {
            currency: 'USD',
            dataSource: DataSource.MANUAL,
            marketData: [{ date: '2024-01-02', marketPrice: 101 }],
            name: 'Global X Copper Miners ETF',
            symbol: 'GF_COPX'
          }
        ]
      });

      const { symbol } = addSymbolProfile.mock.calls[0][0];

      expect(addSymbolProfile).toHaveBeenCalledTimes(1);

      expect(updateManyMarketData.mock.calls[0][0].data).toMatchObject([
        { symbol, date: '2024-01-01', marketPrice: 100 },
        { symbol, date: '2024-01-02', marketPrice: 101 }
      ]);

      expect(
        createActivity.mock.calls[0][0].SymbolProfile.connectOrCreate.create
      ).toMatchObject({ symbol, dataSource: DataSource.MANUAL });
    });

    it('refers the next activities with a symbol with the prefix to the custom asset profile which createActivity() has created', async () => {
      mockCreatedAssetProfiles([
        { dataSource: DataSource.MANUAL, symbol: CUSTOM_ASSET_PROFILE_SYMBOL },
        { dataSource: DataSource.MANUAL, symbol: CUSTOM_ASSET_PROFILE_SYMBOL }
      ]);

      await importActivities({
        activitiesDto: [
          createActivityDto({
            dataSource: DataSource.MANUAL,
            date: '2024-01-01T00:00:00.000Z',
            symbol: 'GF_COPX',
            type: 'BUY'
          }),
          createActivityDto({
            dataSource: DataSource.MANUAL,
            date: '2024-01-02T00:00:00.000Z',
            symbol: 'GF_COPX',
            type: 'BUY'
          })
        ]
      });

      expect(
        createActivity.mock.calls.map(([activity]) => {
          return activity.SymbolProfile.connectOrCreate.create;
        })
      ).toMatchObject([
        { dataSource: DataSource.MANUAL, symbol: 'GF_COPX' },
        { dataSource: DataSource.MANUAL, symbol: CUSTOM_ASSET_PROFILE_SYMBOL }
      ]);
    });

    it('keeps the asset profiles of the activities in a dry run', async () => {
      const activities = await importActivities({
        activitiesDto: [
          createActivityDto({
            dataSource: DataSource.YAHOO,
            date: '2024-01-01T00:00:00.000Z',
            symbol: 'AAPL',
            type: 'FEE'
          }),
          createActivityDto({
            dataSource: DataSource.YAHOO,
            date: '2024-01-02T00:00:00.000Z',
            symbol: 'AAPL',
            type: 'BUY'
          })
        ],
        isDryRun: true
      });

      expect(createActivity).not.toHaveBeenCalled();
      expect(gatherSymbols).not.toHaveBeenCalled();

      expect(getAssetProfileIdentifiers(activities)).toEqual([
        { dataSource: DataSource.YAHOO, symbol: 'AAPL' },
        { dataSource: DataSource.YAHOO, symbol: 'AAPL' }
      ]);
    });
  });

  function importActivities({
    accountsWithBalancesDto = [],
    activitiesDto,
    assetProfilesWithMarketDataDto = [],
    isDryRun
  }: {
    accountsWithBalancesDto?: CreateAccountWithBalancesDto[];
    activitiesDto: CreateOrderDto[];
    assetProfilesWithMarketDataDto?: CreateAssetProfileWithMarketDataDto[];
    isDryRun?: boolean;
  }) {
    return importService.import({
      accountsWithBalancesDto,
      activitiesDto,
      assetProfilesWithMarketDataDto,
      isDryRun,
      platformsDto: [],
      tagsDto: [],
      user: {
        id: 'user-id',
        permissions: [],
        settings: { settings: { baseCurrency: 'USD' } }
      } as unknown as UserWithSettings
    });
  }

  function mockCreatedAssetProfiles(assetProfiles: AssetProfileIdentifier[]) {
    for (const assetProfile of assetProfiles) {
      createActivity.mockImplementationOnce(
        ({
          date,
          type
        }: Parameters<ActivitiesService['createActivity']>[0]) => {
          return { date, type, SymbolProfile: assetProfile };
        }
      );
    }
  }
});

function createActivityDto({
  dataSource,
  date,
  symbol,
  type
}: Pick<CreateOrderDto, 'dataSource' | 'date' | 'symbol' | 'type'>) {
  return {
    dataSource,
    date,
    symbol,
    type,
    currency: 'USD',
    fee: 0,
    quantity: 1,
    unitPrice: 100
  } as CreateOrderDto;
}

function getAssetProfileIdentifiers(activities: Activity[]) {
  return activities.map(({ assetProfile: { dataSource, symbol } }) => {
    return { dataSource, symbol };
  });
}
