import { AccountService } from '@ghostfolio/api/app/account/account.service';
import { ActivitiesService } from '@ghostfolio/api/app/activities/activities.service';
import { DataProviderService } from '@ghostfolio/api/services/data-provider/data-provider.service';
import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.service';
import { MarketDataService } from '@ghostfolio/api/services/market-data/market-data.service';
import { DataGatheringService } from '@ghostfolio/api/services/queues/data-gathering/data-gathering.service';
import { SymbolProfileService } from '@ghostfolio/api/services/symbol-profile/symbol-profile.service';
import { TagService } from '@ghostfolio/api/services/tag/tag.service';
import { UserWithSettings } from '@ghostfolio/common/types';

import { DataSource, SymbolProfile } from '@prisma/client';

import { ImportService } from './import.service';

let mockExistingAssetProfiles: Partial<SymbolProfile>[] = [];

jest.mock('@ghostfolio/api/app/account/account.service', () => {
  return {
    AccountService: jest.fn().mockImplementation(() => {
      return {
        getAccounts: () => Promise.resolve([])
      };
    })
  };
});

jest.mock('@ghostfolio/api/app/activities/activities.service', () => {
  return {
    ActivitiesService: jest.fn().mockImplementation(() => {
      return {
        getActivities: () => Promise.resolve({ activities: [] }),
        createActivity: jest.fn().mockImplementation((data) => {
          return Promise.resolve({
            id: 'ee3949fa-9df5-4b4e-9856-14dd1cfe9c86',
            SymbolProfile: {
              symbol: data.SymbolProfile.connectOrCreate.create.symbol
            }
          });
        })
      };
    })
  };
});

jest.mock(
  '@ghostfolio/api/services/data-provider/data-provider.service',
  () => {
    return {
      DataProviderService: jest.fn().mockImplementation(() => {
        return {
          getDataSourceForImport: () => DataSource.MANUAL,
          validateActivities: () => Promise.resolve({})
        };
      })
    };
  }
);

jest.mock(
  '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.service',
  () => {
    return {
      ExchangeRateDataService: jest.fn().mockImplementation(() => {
        return {
          toCurrencyAtDate: () => Promise.resolve(0)
        };
      })
    };
  }
);

jest.mock('@ghostfolio/api/services/market-data/market-data.service', () => {
  return {
    MarketDataService: jest.fn().mockImplementation(() => {
      return {
        updateMany: () => Promise.resolve()
      };
    })
  };
});

jest.mock(
  '@ghostfolio/api/services/queues/data-gathering/data-gathering.service',
  () => {
    return {
      DataGatheringService: jest.fn().mockImplementation(() => {
        return {
          gatherSymbols: () => undefined
        };
      })
    };
  }
);

jest.mock(
  '@ghostfolio/api/services/symbol-profile/symbol-profile.service',
  () => {
    return {
      SymbolProfileService: jest.fn().mockImplementation(() => {
        return {
          add: jest.fn().mockResolvedValue(undefined),
          getSymbolProfiles: () => Promise.resolve(mockExistingAssetProfiles)
        };
      })
    };
  }
);

jest.mock('@ghostfolio/api/services/tag/tag.service', () => {
  return {
    TagService: jest.fn().mockImplementation(() => {
      return {
        getTagsForUser: () => Promise.resolve([])
      };
    })
  };
});

describe('ImportService', () => {
  let accountService: AccountService;
  let activitiesService: ActivitiesService;
  let dataGatheringService: DataGatheringService;
  let dataProviderService: DataProviderService;
  let exchangeRateDataService: ExchangeRateDataService;
  let importService: ImportService;
  let marketDataService: MarketDataService;
  let symbolProfileService: SymbolProfileService;
  let tagService: TagService;

  beforeEach(() => {
    mockExistingAssetProfiles = [];

    accountService = new AccountService(null, null, null, null, null);
    activitiesService = new ActivitiesService(
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null
    );
    dataGatheringService = new DataGatheringService(
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null
    );
    dataProviderService = new DataProviderService(
      null,
      [],
      null,
      null,
      null,
      null
    );
    exchangeRateDataService = new ExchangeRateDataService(
      null,
      null,
      null,
      null
    );
    marketDataService = new MarketDataService(null);
    symbolProfileService = new SymbolProfileService(null);
    tagService = new TagService(null);

    importService = new ImportService(
      accountService,
      activitiesService,
      null,
      dataGatheringService,
      dataProviderService,
      exchangeRateDataService,
      marketDataService,
      null,
      null,
      symbolProfileService,
      tagService
    );
  });

  it('creates only one asset profile when the import payload contains duplicate new manual asset profiles', async () => {
    const user = {
      id: 'da8a5786-1223-4a51-9a86-2b60433c9f3f',
      permissions: [],
      settings: { settings: { baseCurrency: 'USD' } }
    } as unknown as UserWithSettings;

    const assetProfile = {
      currency: 'USD',
      dataSource: DataSource.MANUAL,
      isActive: true,
      marketData: [],
      name: 'Repeated Fee',
      symbol: 'Repeated Fee'
    };

    await importService.import({
      accountsWithBalancesDto: [],
      activitiesDto: [
        {
          currency: 'USD',
          dataSource: DataSource.MANUAL,
          date: '2024-01-01T00:00:00.000Z',
          fee: 1,
          quantity: 0,
          symbol: 'Repeated Fee',
          type: 'FEE',
          unitPrice: 0
        },
        {
          currency: 'USD',
          dataSource: DataSource.MANUAL,
          date: '2024-01-02T00:00:00.000Z',
          fee: 1,
          quantity: 0,
          symbol: 'Repeated Fee',
          type: 'FEE',
          unitPrice: 0
        }
      ],
      assetProfilesWithMarketDataDto: [assetProfile, assetProfile],
      maxActivitiesToImport: 10,
      platformsDto: [],
      tagsDto: [],
      user
    });

    expect(symbolProfileService.add).toHaveBeenCalledTimes(1);
  });

  it('reuses an existing manual asset profile without a user', async () => {
    mockExistingAssetProfiles = [
      {
        currency: 'USD',
        dataSource: DataSource.MANUAL,
        name: 'Manual Asset Profile',
        symbol: 'GF_MANUAL',
        userId: null
      }
    ];

    await importActivitiesWithExistingAssetProfile();

    expect(symbolProfileService.add).not.toHaveBeenCalled();

    for (const [{ SymbolProfile }] of (
      activitiesService.createActivity as jest.Mock
    ).mock.calls) {
      expect(SymbolProfile.connectOrCreate.create.symbol).toEqual('GF_MANUAL');
    }
  });

  it('creates a new asset profile when the existing manual asset profile belongs to a different user', async () => {
    mockExistingAssetProfiles = [
      {
        currency: 'USD',
        dataSource: DataSource.MANUAL,
        name: 'Manual Asset Profile',
        symbol: 'GF_MANUAL',
        userId: '5b7a1b3a-1f1c-4c7a-9a1a-3a1b5b7a1b3a'
      }
    ];

    await importActivitiesWithExistingAssetProfile();

    expect(symbolProfileService.add).toHaveBeenCalledTimes(1);

    const [[{ symbol }]] = (symbolProfileService.add as jest.Mock).mock.calls;

    expect(symbol).not.toEqual('GF_MANUAL');

    for (const [{ SymbolProfile }] of (
      activitiesService.createActivity as jest.Mock
    ).mock.calls) {
      expect(SymbolProfile.connectOrCreate.create.symbol).toEqual(symbol);
    }
  });

  function importActivitiesWithExistingAssetProfile() {
    const user = {
      id: 'da8a5786-1223-4a51-9a86-2b60433c9f3f',
      permissions: [],
      settings: { settings: { baseCurrency: 'USD' } }
    } as unknown as UserWithSettings;

    // The client creates a synthetic asset profile per activity
    const assetProfile = {
      currency: 'USD',
      dataSource: DataSource.MANUAL,
      isActive: true,
      marketData: [],
      name: 'GF_MANUAL',
      symbol: 'GF_MANUAL'
    };

    return importService.import({
      accountsWithBalancesDto: [],
      activitiesDto: [
        {
          currency: 'USD',
          dataSource: DataSource.MANUAL,
          date: '2024-01-01T00:00:00.000Z',
          fee: 0,
          quantity: 1,
          symbol: 'GF_MANUAL',
          type: 'BUY',
          unitPrice: 1
        },
        {
          currency: 'USD',
          dataSource: DataSource.MANUAL,
          date: '2024-01-02T00:00:00.000Z',
          fee: 0,
          quantity: 2,
          symbol: 'GF_MANUAL',
          type: 'BUY',
          unitPrice: 1
        }
      ],
      assetProfilesWithMarketDataDto: [assetProfile, assetProfile],
      maxActivitiesToImport: 10,
      platformsDto: [],
      tagsDto: [],
      user
    });
  }
});
