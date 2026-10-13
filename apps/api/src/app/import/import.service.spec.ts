import { AccountService } from '@ghostfolio/api/app/account/account.service';
import { ActivitiesService } from '@ghostfolio/api/app/activities/activities.service';
import { ExportService } from '@ghostfolio/api/app/export/export.service';
import { PlatformService } from '@ghostfolio/api/app/platform/platform.service';
import { PortfolioService } from '@ghostfolio/api/app/portfolio/portfolio.service';
import { ApiService } from '@ghostfolio/api/services/api/api.service';
import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';
import { DataProviderService } from '@ghostfolio/api/services/data-provider/data-provider.service';
import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.service';
import { MarketDataService } from '@ghostfolio/api/services/market-data/market-data.service';
import { DataGatheringService } from '@ghostfolio/api/services/queues/data-gathering/data-gathering.service';
import { SymbolProfileService } from '@ghostfolio/api/services/symbol-profile/symbol-profile.service';
import { TagService } from '@ghostfolio/api/services/tag/tag.service';
import {
  CASH_FLOW_ACTIVITY_TYPES,
  NON_INVESTMENT_ACTIVITY_TYPES
} from '@ghostfolio/common/config';
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

import {
  DataSource,
  SymbolProfile,
  Type as ActivityType
} from '@prisma/client';
import { isUUID } from 'class-validator';
import { parseISO } from 'date-fns';

import { ImportService } from './import.service';

const CUSTOM_ASSET_PROFILE_SYMBOL = '1ad7d4a2-6b2d-4e0f-9b1f-2c0f8d3e5a7b';
const BANK_ACCOUNT_ID = 'bank-account';

describe('ImportService', () => {
  let addSymbolProfile: jest.Mock;
  let createActivity: jest.Mock;
  let gatherSymbols: jest.Mock;
  let getActivities: jest.Mock;
  let getAccounts: jest.Mock;
  let importService: ImportService;
  let updateManyMarketData: jest.Mock;

  beforeEach(() => {
    const configuration = {
      DATA_SOURCES_GHOSTFOLIO_DATA_PROVIDER: [],
      ENABLE_FEATURE_SUBSCRIPTION: false,
      MAX_ACTIVITIES_TO_IMPORT: Number.MAX_SAFE_INTEGER
    };

    addSymbolProfile = jest.fn();
    createActivity = jest.fn();
    gatherSymbols = jest.fn();
    getActivities = jest.fn().mockResolvedValue({ activities: [], count: 0 });
    getAccounts = jest
      .fn()
      .mockResolvedValue([{ id: BANK_ACCOUNT_ID, name: 'Bank' }]);
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
        accounts: jest
          .fn()
          .mockResolvedValue([
            { currency: 'USD', id: BANK_ACCOUNT_ID, name: 'Bank' }
          ]),
        getAccounts
      } as unknown as AccountService,
      {
        createActivity,
        getActivities
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
    it('Tracks the trades, income and fees of a full statement alongside its funding movements', async () => {
      const activitiesDto = [
        createBankActivity(ActivityType.BUY, { fee: 1, unitPrice: 201.89 }),
        createBankActivity(ActivityType.DEPOSIT, { unitPrice: 1900 }),
        createBankActivity(ActivityType.BUY, { fee: 1, unitPrice: 2890.4 }),
        createBankActivity(ActivityType.INTEREST, { unitPrice: 5 }),
        createBankActivity(ActivityType.SELL, { fee: 1, unitPrice: 100 }),
        createBankActivity(ActivityType.DIVIDEND, { unitPrice: 10 }),
        createBankActivity(ActivityType.FEE, {
          fee: 2,
          quantity: 0,
          unitPrice: 0
        }),
        createBankActivity(ActivityType.WITHDRAWAL, { unitPrice: 20 }),
        createBankActivity(ActivityType.BUY, {
          dataSource: DataSource.MANUAL,
          symbol: CUSTOM_ASSET_PROFILE_SYMBOL,
          unitPrice: 50
        }),
        createBankActivity(ActivityType.LIABILITY)
      ];

      mockCreatedAssetProfiles(
        activitiesDto.map(({ dataSource, symbol, type }) => {
          return NON_INVESTMENT_ACTIVITY_TYPES.includes(type) ||
            dataSource === DataSource.MANUAL
            ? {
                dataSource: DataSource.MANUAL,
                symbol: CUSTOM_ASSET_PROFILE_SYMBOL
              }
            : { dataSource, symbol };
        })
      );

      await importActivities({ activitiesDto });

      expect(
        createActivity.mock.calls.map(([activity]) => {
          return {
            type: activity.type,
            updateAccountBalance: activity.updateAccountBalance
          };
        })
      ).toEqual(
        activitiesDto.map(({ type }) => {
          return {
            type,
            updateAccountBalance: type !== ActivityType.LIABILITY
          };
        })
      );
      expect(createActivity.mock.calls[0][0]).toMatchObject({
        accountId: BANK_ACCOUNT_ID,
        fee: 1,
        quantity: 1,
        unitPrice: 201.89
      });
      expect(createActivity.mock.calls[2][0]).toMatchObject({
        accountId: BANK_ACCOUNT_ID,
        fee: 1,
        quantity: 1,
        unitPrice: 2890.4
      });
    });

    it.each([ActivityType.BUY, ActivityType.INTEREST, ActivityType.FEE])(
      'Continues tracking %s in later imports when its account already has tracked funding',
      async (type) => {
        getActivities.mockResolvedValue({
          activities: [
            {
              ...createBankActivity(ActivityType.DEPOSIT),
              date: parseISO('2024-01-01'),
              assetProfile: {
                currency: 'USD',
                dataSource: DataSource.MANUAL,
                name: 'Description of DEPOSIT',
                symbol: CUSTOM_ASSET_PROFILE_SYMBOL
              },
              updateAccountBalance: true
            }
          ]
        });

        const activities = await importActivities({
          activitiesDto: [createBankActivity(type)],
          isDryRun: true
        });

        expect(activities[0].updateAccountBalance).toBe(true);
        expect(getActivities).toHaveBeenCalledTimes(1);
      }
    );

    it.each([
      { name: 'an untracked funding movement', tracked: false },
      { name: 'a tracked funding movement in another account', tracked: true }
    ])(
      'Keeps legacy trade imports untracked when history only has $name',
      async ({ tracked }) => {
        getActivities.mockResolvedValue({
          activities: [
            {
              ...createBankActivity(ActivityType.DEPOSIT),
              date: parseISO('2024-01-01'),
              assetProfile: {
                currency: 'USD',
                dataSource: DataSource.MANUAL,
                name: 'Description of DEPOSIT',
                symbol: CUSTOM_ASSET_PROFILE_SYMBOL
              },
              updateAccountBalance: tracked,
              accountId: tracked ? 'another-account' : BANK_ACCOUNT_ID
            }
          ]
        });

        const activities = await importActivities({
          activitiesDto: [createBankActivity(ActivityType.BUY)],
          isDryRun: true
        });

        expect(activities[0].updateAccountBalance).toBe(false);
      }
    );

    it.each([undefined, true, false])(
      'Honors preference %s in a plain investment import without automatically changing legacy balances',
      async (updateAccountBalance) => {
        mockCreatedAssetProfiles([
          { dataSource: DataSource.YAHOO, symbol: 'AAPL' }
        ]);

        await importActivities({
          activitiesDto: [
            createBankActivity(ActivityType.BUY, { updateAccountBalance })
          ]
        });

        expect(createActivity.mock.calls[0][0].updateAccountBalance).toBe(
          updateAccountBalance ?? false
        );
      }
    );

    it('Scopes statement tracking to its funding account and preserves explicit opt-outs', async () => {
      getAccounts.mockResolvedValue([
        { id: BANK_ACCOUNT_ID, name: 'Bank' },
        { id: 'another-account', name: 'Other bank' }
      ]);

      const activities = await importActivities({
        activitiesDto: [
          createBankActivity(ActivityType.DEPOSIT),
          createBankActivity(ActivityType.BUY, {
            accountId: 'another-account'
          }),
          createBankActivity(ActivityType.INTEREST, {
            updateAccountBalance: false
          })
        ],
        isDryRun: true
      });

      expect(
        activities.map(({ updateAccountBalance }) => updateAccountBalance)
      ).toEqual([true, false, false]);
    });

    it('Preserves full statement snapshots for deposits, purchases and interest on the same day', async () => {
      const activities = await importActivities({
        accountsWithBalancesDto: [
          {
            id: BANK_ACCOUNT_ID,
            name: 'Bank',
            currency: 'USD',
            platformId: null,
            balances: [{ date: '2024-01-01', value: 3100 }]
          }
        ],
        activitiesDto: [
          createBankActivity(ActivityType.DEPOSIT),
          createBankActivity(ActivityType.BUY),
          createBankActivity(ActivityType.INTEREST),
          createBankActivity(ActivityType.INTEREST, {
            date: '2024-01-02',
            unitPrice: 6
          })
        ],
        isDryRun: true
      });

      expect(
        activities.map(({ updateAccountBalance }) => updateAccountBalance)
      ).toEqual([false, false, false, true]);
    });

    it('Rejects any activity that explicitly updates the balance without an account before creating anything', async () => {
      await expect(
        importActivities({
          activitiesDto: [
            createBankActivity(ActivityType.DEPOSIT),
            createBankActivity(ActivityType.BUY, {
              accountId: undefined,
              updateAccountBalance: true
            })
          ]
        })
      ).rejects.toThrow(
        'activities.1.accountId is required to update the cash balance'
      );

      expect(createActivity).not.toHaveBeenCalled();
      expect(addSymbolProfile).not.toHaveBeenCalled();
    });

    it.each(CASH_FLOW_ACTIVITY_TYPES)(
      'Skips a repeated free-text %s import after its description became a manual profile',
      async (type) => {
        createActivity.mockImplementation((activity) => {
          return {
            ...activity,
            tags: [],
            SymbolProfile: {
              currency: 'USD',
              dataSource: DataSource.MANUAL,
              name: 'Bank transfer',
              symbol: CUSTOM_ASSET_PROFILE_SYMBOL
            }
          };
        });

        const getActivitiesDto = () => {
          return [
            createActivityDto({
              type,
              dataSource: undefined,
              date: '2024-01-01',
              symbol: 'Bank transfer'
            })
          ];
        };

        const firstImport = await importActivities({
          activitiesDto: getActivitiesDto()
        });

        getActivities.mockResolvedValue({ activities: firstImport, count: 1 });

        const repeatedImport = await importActivities({
          activitiesDto: getActivitiesDto()
        });

        expect(repeatedImport).toEqual([]);
        expect(createActivity).toHaveBeenCalledTimes(1);
      }
    );

    it('Keeps a cash movement in a different currency from the existing order even when their profiles have the same currency', async () => {
      getActivities.mockResolvedValue({
        activities: [
          {
            ...createActivityDto({
              dataSource: DataSource.MANUAL,
              date: '2024-01-01',
              symbol: CUSTOM_ASSET_PROFILE_SYMBOL,
              type: ActivityType.DEPOSIT
            }),
            currency: 'EUR',
            date: parseISO('2024-01-01'),
            assetProfile: {
              currency: 'USD',
              dataSource: DataSource.MANUAL,
              name: 'Bank transfer',
              symbol: CUSTOM_ASSET_PROFILE_SYMBOL
            }
          }
        ]
      });

      const activities = await importActivities({
        isDryRun: true,
        activitiesDto: [
          createActivityDto({
            dataSource: undefined,
            date: '2024-01-01',
            symbol: 'Bank transfer',
            type: ActivityType.DEPOSIT
          })
        ]
      });

      expect(activities[0].error).toBeUndefined();
    });

    it.each(
      CASH_FLOW_ACTIVITY_TYPES.flatMap((type) => {
        return [
          { type, symbol: 'Bank transfer' },
          { type, symbol: CUSTOM_ASSET_PROFILE_SYMBOL }
        ];
      })
    )(
      'Keeps an otherwise identical $type with symbol $symbol from a different account',
      async ({ symbol, type }) => {
        const activityDto = createActivityDto({
          symbol,
          type,
          dataSource: isUUID(symbol) ? DataSource.MANUAL : undefined,
          date: '2024-01-01'
        });

        getActivities.mockResolvedValue({
          activities: [
            {
              ...activityDto,
              accountId: 'another-bank-account',
              date: parseISO(activityDto.date),
              assetProfile: {
                currency: 'USD',
                dataSource: DataSource.MANUAL,
                name: 'Bank transfer',
                symbol: CUSTOM_ASSET_PROFILE_SYMBOL
              }
            }
          ]
        });

        const activities = await importActivities({
          activitiesDto: [activityDto],
          isDryRun: true
        });

        expect(activities[0].error).toBeUndefined();
      }
    );

    it.each(CASH_FLOW_ACTIVITY_TYPES)(
      'Updates the selected cash account by default for %s',
      async (type) => {
        mockCreatedAssetProfiles([
          { dataSource: DataSource.MANUAL, symbol: CUSTOM_ASSET_PROFILE_SYMBOL }
        ]);

        await importActivities({
          activitiesDto: [
            createActivityDto({
              type,
              dataSource: undefined,
              date: '2024-01-01',
              symbol: 'Bank transfer'
            })
          ]
        });

        expect(createActivity).toHaveBeenCalledWith(
          expect.objectContaining({
            type,
            accountId: BANK_ACCOUNT_ID,
            updateAccountBalance: true
          })
        );
      }
    );

    it.each(CASH_FLOW_ACTIVITY_TYPES)(
      'Keeps the balance unchanged when a %s opts out',
      async (type) => {
        mockCreatedAssetProfiles([
          { dataSource: DataSource.MANUAL, symbol: CUSTOM_ASSET_PROFILE_SYMBOL }
        ]);

        await importActivities({
          activitiesDto: [
            {
              ...createActivityDto({
                type,
                dataSource: undefined,
                date: '2024-01-01',
                symbol: 'Bank transfer'
              }),
              updateAccountBalance: false
            }
          ]
        });

        expect(createActivity).toHaveBeenCalledWith(
          expect.objectContaining({ type, updateAccountBalance: false })
        );
      }
    );

    it.each(CASH_FLOW_ACTIVITY_TYPES)(
      'Exports and imports %s without replaying it into its account balance snapshot',
      async (type) => {
        const exportService = new ExportService(
          {
            accounts: jest.fn().mockResolvedValue([
              {
                currency: 'USD',
                id: BANK_ACCOUNT_ID,
                name: 'Bank',
                platformId: null,
                tags: [],
                balances: [{ date: parseISO('2024-01-01'), value: 100 }]
              }
            ])
          } as unknown as AccountService,
          {
            getActivities: jest.fn().mockResolvedValue({
              activities: [
                {
                  ...createActivityDto({
                    type,
                    dataSource: DataSource.MANUAL,
                    date: '2024-01-01',
                    symbol: CUSTOM_ASSET_PROFILE_SYMBOL
                  }),
                  date: parseISO('2024-01-01T15:00:00.000Z'),
                  tags: [],
                  updateAccountBalance: true,
                  accountBalanceChange:
                    type === ActivityType.DEPOSIT ? 100 : -100,
                  assetProfile: {
                    currency: 'USD',
                    dataSource: DataSource.MANUAL,
                    symbol: CUSTOM_ASSET_PROFILE_SYMBOL
                  }
                }
              ]
            })
          } as unknown as ActivitiesService,
          {} as MarketDataService,
          {
            getTagsForUser: jest.fn().mockResolvedValue([])
          } as unknown as TagService
        );

        const exportedData = await exportService.export({
          userId: 'user-id',
          userSettings: { baseCurrency: 'USD' }
        });

        expect(exportedData.activities[0]).toMatchObject({ type });
        expect(exportedData.activities[0]).not.toHaveProperty(
          'updateAccountBalance'
        );
        expect(exportedData.activities[0]).not.toHaveProperty(
          'accountBalanceChange'
        );

        mockCreatedAssetProfiles([
          { dataSource: DataSource.MANUAL, symbol: CUSTOM_ASSET_PROFILE_SYMBOL }
        ]);

        await importActivities({
          accountsWithBalancesDto: exportedData.accounts,
          activitiesDto: exportedData.activities
        });

        expect(createActivity).toHaveBeenCalledWith(
          expect.objectContaining({ type, updateAccountBalance: false })
        );
      }
    );

    it.each([undefined, false])(
      'Carries the cash balance preference %s through an assigned-account preview without saving',
      async (updateAccountBalance) => {
        const activities = await importActivities({
          isDryRun: true,
          activitiesDto: [
            {
              ...createActivityDto({
                dataSource: undefined,
                date: '2024-01-01',
                symbol: 'Bank transfer',
                type: ActivityType.DEPOSIT
              }),
              updateAccountBalance
            }
          ]
        });

        expect(activities[0]).toMatchObject({
          accountId: BANK_ACCOUNT_ID,
          updateAccountBalance: updateAccountBalance ?? true
        });
        expect(createActivity).not.toHaveBeenCalled();
      }
    );

    it.each([
      {
        name: 'account metadata only',
        account: {},
        expectedUpdate: true
      },
      {
        name: 'empty account balance history',
        account: { balances: [] },
        expectedUpdate: true
      },
      {
        name: 'a snapshot before the movement',
        account: { balances: [{ date: '2023-12-31', value: 100 }] },
        expectedUpdate: true
      },
      {
        name: 'a snapshot of another account',
        account: {
          balances: [{ date: '2024-01-01', value: 100 }],
          id: 'other-bank-account',
          name: 'Other bank'
        },
        expectedUpdate: true
      },
      {
        name: 'a legacy numeric balance including zero',
        account: { balance: 0 },
        expectedUpdate: false
      },
      {
        name: 'a legacy numeric balance covering a later activity today',
        account: { balance: 0 },
        activityDate: `${new Date().toISOString().slice(0, 10)}T23:59:00.000Z`,
        expectedUpdate: false
      },
      {
        name: 'a snapshot with an explicit balance update',
        account: { balances: [{ date: '2024-01-01', value: 100 }] },
        expectedUpdate: true,
        updateAccountBalance: true
      },
      {
        name: 'empty snapshots with an explicit opt-out',
        account: { balances: [] },
        expectedUpdate: false,
        updateAccountBalance: false
      },
      {
        name: 'a snapshot of an account remapped during import',
        account: {
          balances: [{ date: '2024-01-01', value: 100 }],
          id: 'exported-bank-account'
        },
        activityAccountId: 'exported-bank-account',
        expectedUpdate: false
      }
    ])(
      'Uses the correct cash balance preference for $name',
      async ({
        account,
        activityAccountId = BANK_ACCOUNT_ID,
        activityDate = '2024-01-01',
        expectedUpdate,
        updateAccountBalance
      }) => {
        const activities = await importActivities({
          accountsWithBalancesDto: [
            {
              currency: 'USD',
              id: BANK_ACCOUNT_ID,
              name: 'Bank',
              platformId: null,
              ...account
            }
          ],
          activitiesDto: [
            {
              ...createActivityDto({
                dataSource: undefined,
                date: activityDate,
                symbol: 'Bank transfer',
                type: ActivityType.DEPOSIT
              }),
              updateAccountBalance,
              accountId: activityAccountId
            }
          ],
          isDryRun: true
        });

        expect(activities[0]).toMatchObject({
          accountId: BANK_ACCOUNT_ID,
          updateAccountBalance: expectedUpdate
        });
        expect(createActivity).not.toHaveBeenCalled();
      }
    );

    it('Allows a cash movement without an account in a dry run without saving anything', async () => {
      const activities = await importActivities({
        isDryRun: true,
        activitiesDto: [
          {
            ...createActivityDto({
              dataSource: undefined,
              date: '2024-01-01',
              symbol: 'Bank transfer',
              type: ActivityType.DEPOSIT
            }),
            accountId: undefined
          }
        ]
      });

      expect(activities[0]).toMatchObject({
        type: ActivityType.DEPOSIT,
        updateAccountBalance: false
      });
      expect(createActivity).not.toHaveBeenCalled();
      expect(addSymbolProfile).not.toHaveBeenCalled();
    });

    it('Requires an account before saving a cash movement with balance updates enabled', async () => {
      await expect(
        importActivities({
          activitiesDto: [
            {
              ...createActivityDto({
                dataSource: undefined,
                date: '2024-01-01',
                symbol: 'Bank transfer',
                type: ActivityType.WITHDRAWAL
              }),
              accountId: undefined,
              updateAccountBalance: true
            }
          ]
        })
      ).rejects.toThrow(
        'activities.0.accountId is required to update the cash balance'
      );

      expect(createActivity).not.toHaveBeenCalled();
      expect(addSymbolProfile).not.toHaveBeenCalled();
      expect(updateManyMarketData).not.toHaveBeenCalled();
    });

    it('Allows a cash movement without an account when balance updates are disabled', async () => {
      mockCreatedAssetProfiles([
        { dataSource: DataSource.MANUAL, symbol: CUSTOM_ASSET_PROFILE_SYMBOL }
      ]);

      await importActivities({
        activitiesDto: [
          {
            ...createActivityDto({
              dataSource: undefined,
              date: '2024-01-01',
              symbol: 'Bank transfer',
              type: ActivityType.DEPOSIT
            }),
            accountId: undefined,
            updateAccountBalance: false
          }
        ]
      });

      expect(createActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          accountId: undefined,
          updateAccountBalance: false
        })
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
      activitiesDto,
      assetProfilesWithMarketDataDto,
      isDryRun,
      accountsWithBalancesDto,
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
    accountId: CASH_FLOW_ACTIVITY_TYPES.includes(type)
      ? BANK_ACCOUNT_ID
      : undefined,
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

function createBankActivity(
  type: ActivityType,
  overrides: Partial<CreateOrderDto> = {}
) {
  const isNonInvestment = NON_INVESTMENT_ACTIVITY_TYPES.includes(type);

  return {
    ...createActivityDto({
      type,
      dataSource: isNonInvestment ? undefined : DataSource.YAHOO,
      date: '2024-01-01T15:00:00.000Z',
      symbol: isNonInvestment ? `Description of ${type}` : 'AAPL'
    }),
    accountId: BANK_ACCOUNT_ID,
    ...overrides
  };
}
