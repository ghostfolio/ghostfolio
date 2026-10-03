import { AccountService } from '@ghostfolio/api/app/account/account.service';
import { ActivitiesService } from '@ghostfolio/api/app/activities/activities.service';
import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';
import { DataProviderService } from '@ghostfolio/api/services/data-provider/data-provider.service';
import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.service';
import { DataGatheringService } from '@ghostfolio/api/services/queues/data-gathering/data-gathering.service';
import { TagService } from '@ghostfolio/api/services/tag/tag.service';
import { NON_INVESTMENT_ACTIVITY_TYPES } from '@ghostfolio/common/config';
import { CreateOrderDto } from '@ghostfolio/common/dtos';
import {
  getAssetProfileIdentifier,
  isValidCustomAssetProfileSymbol
} from '@ghostfolio/common/helper';
import { UserWithSettings } from '@ghostfolio/common/types';

import { DataSource, SymbolProfile } from '@prisma/client';

import { ImportService } from './import.service';

// The symbol which createActivity() assigns to a new custom asset profile
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

    createActivity = jest.fn(
      ({
        SymbolProfile: { connectOrCreate },
        type
      }: Parameters<ActivitiesService['createActivity']>[0]) => {
        let { dataSource, symbol } = connectOrCreate.create;

        // Like createActivity(), refer a non-investment activity to a custom
        // asset profile
        if (NON_INVESTMENT_ACTIVITY_TYPES.includes(type)) {
          dataSource = DataSource.MANUAL;

          if (!isValidCustomAssetProfileSymbol(symbol)) {
            symbol = CUSTOM_ASSET_PROFILE_SYMBOL;
          }
        }

        return { type, SymbolProfile: { dataSource, symbol } };
      }
    );

    gatherSymbols = jest.fn();

    // Like validateActivities(), share one asset profile between the
    // activities with the same asset profile identifier
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
      { validateActivities } as unknown as DataProviderService,
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
    it('keeps the asset profile of the next activities if createActivity() replaces the data source', async () => {
      const activities = await importActivities([
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
      ]);

      expect(
        createActivity.mock.calls[1][0].SymbolProfile.connectOrCreate.create
      ).toMatchObject({ dataSource: DataSource.YAHOO, symbol: 'AAPL' });

      expect(
        activities.map(({ assetProfile: { dataSource, symbol } }) => {
          return { dataSource, symbol };
        })
      ).toEqual([
        { dataSource: DataSource.MANUAL, symbol: CUSTOM_ASSET_PROFILE_SYMBOL },
        { dataSource: DataSource.YAHOO, symbol: 'AAPL' }
      ]);

      expect(gatherSymbols.mock.calls[0][0].dataGatheringItems).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            dataSource: DataSource.YAHOO,
            symbol: 'AAPL'
          })
        ])
      );
    });

    it('refers the next activities to the custom asset profile which createActivity() has created', async () => {
      await importActivities([
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
      ]);

      expect(
        createActivity.mock.calls[1][0].SymbolProfile.connectOrCreate.create
      ).toMatchObject({
        dataSource: DataSource.MANUAL,
        symbol: CUSTOM_ASSET_PROFILE_SYMBOL
      });
    });
  });

  function importActivities(activitiesDto: CreateOrderDto[]) {
    return importService.import({
      activitiesDto,
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
