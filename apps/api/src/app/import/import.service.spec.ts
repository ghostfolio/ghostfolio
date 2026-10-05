import type { AccountService } from '@ghostfolio/api/app/account/account.service';
import type { ActivitiesService } from '@ghostfolio/api/app/activities/activities.service';
import type { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';
import type { DataProviderService } from '@ghostfolio/api/services/data-provider/data-provider.service';
import type { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.service';
import type { DataGatheringService } from '@ghostfolio/api/services/queues/data-gathering/data-gathering.service';
import type { TagService } from '@ghostfolio/api/services/tag/tag.service';
import { NON_INVESTMENT_ACTIVITY_TYPES } from '@ghostfolio/common/config';
import type { CreateOrderDto } from '@ghostfolio/common/dtos';
import { getAssetProfileIdentifier } from '@ghostfolio/common/helper';
import type {
  Activity,
  AssetProfileIdentifier
} from '@ghostfolio/common/interfaces';
import type { UserWithSettings } from '@ghostfolio/common/types';

import type { SymbolProfile } from '@prisma/client';
import { DataSource } from '@prisma/client';
import { parseISO } from 'date-fns';

import { ImportService } from './import.service';

const CUSTOM_ASSET_PROFILE_SYMBOL = '1ad7d4a2-6b2d-4e0f-9b1f-2c0f8d3e5a7b';

describe('ImportService', () => {
  let createActivity: jest.Mock;
  let gatherSymbols: jest.Mock;
  let importService: ImportService;

  beforeEach(() => {
    const configuration = {
      DATA_SOURCES_GHOSTFOLIO_DATA_PROVIDER: [],
      ENABLE_FEATURE_SUBSCRIPTION: false,
      MAX_ACTIVITIES_TO_IMPORT: Number.MAX_SAFE_INTEGER
    };

    createActivity = jest.fn();
    gatherSymbols = jest.fn();

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
        getAccounts: jest.fn().mockResolvedValue([])
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
      null,
      null,
      null,
      null,
      {
        getTagsForUser: jest.fn().mockResolvedValue([])
      } as unknown as TagService
    );
  });

  describe('import', () => {
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
    activitiesDto,
    isDryRun
  }: {
    activitiesDto: CreateOrderDto[];
    isDryRun?: boolean;
  }) {
    return importService.import({
      activitiesDto,
      isDryRun,
      accountsWithBalancesDto: [],
      assetProfilesWithMarketDataDto: [],
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
