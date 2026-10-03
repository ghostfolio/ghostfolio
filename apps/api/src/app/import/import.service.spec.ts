import { getAssetProfileIdentifier } from '@ghostfolio/common/helper';
import { UserWithSettings } from '@ghostfolio/common/types';

import { DataSource, Prisma } from '@prisma/client';

import { ImportService } from './import.service';

describe('ImportService', () => {
  const accountService = {
    getAccounts: jest.fn()
  };
  const activitiesService = {
    createActivity: jest.fn(),
    getActivities: jest.fn()
  };
  const apiService = {};
  const dataGatheringService = {
    gatherSymbols: jest.fn()
  };
  const dataProviderService = {
    validateActivities: jest.fn()
  };
  const exchangeRateDataService = {
    toCurrencyAtDate: jest.fn()
  };
  const marketDataService = {};
  const platformService = {};
  const portfolioService = {};
  const symbolProfileService = {
    add: jest.fn(),
    getSymbolProfiles: jest.fn()
  };
  const tagService = {
    getTagsForUser: jest.fn()
  };
  const user = {
    id: 'user-1',
    permissions: [],
    settings: {
      settings: {
        baseCurrency: 'USD'
      }
    }
  } as unknown as UserWithSettings;

  let importService: ImportService;

  beforeEach(() => {
    jest.resetAllMocks();

    accountService.getAccounts.mockResolvedValue([]);
    activitiesService.getActivities.mockResolvedValue({ activities: [] });
    activitiesService.createActivity.mockImplementation(async (data) => {
      const assetProfile = data.SymbolProfile.connectOrCreate.create;

      return {
        SymbolProfile: assetProfile,
        date: data.date,
        id: `activity-${data.date.toISOString()}`,
        userId: user.id
      };
    });
    exchangeRateDataService.toCurrencyAtDate.mockResolvedValue(1);
    tagService.getTagsForUser.mockResolvedValue([]);

    importService = new ImportService(
      accountService as never,
      activitiesService as never,
      apiService as never,
      dataGatheringService as never,
      dataProviderService as never,
      exchangeRateDataService as never,
      marketDataService as never,
      platformService as never,
      portfolioService as never,
      symbolProfileService as never,
      tagService as never
    );
  });

  it('creates a new symbol profile once for duplicate activities', async () => {
    const symbolProfile = createSymbolProfile();
    symbolProfileService.getSymbolProfiles.mockResolvedValue([]);
    symbolProfileService.add.mockResolvedValue(symbolProfile);

    const activities = await importDuplicateActivities(symbolProfile);

    expect(symbolProfileService.add).toHaveBeenCalledTimes(1);
    expect(activitiesService.createActivity).toHaveBeenCalledTimes(2);
    expect(activities).toHaveLength(2);
  });

  it('reuses an existing symbol profile without creating it', async () => {
    const symbolProfile = createSymbolProfile();
    symbolProfileService.getSymbolProfiles.mockResolvedValue([symbolProfile]);

    const activities = await importDuplicateActivities(symbolProfile);

    expect(symbolProfileService.add).not.toHaveBeenCalled();
    expect(activitiesService.createActivity).toHaveBeenCalledTimes(2);
    expect(activities).toHaveLength(2);
  });

  it('refetches the canonical profile after a matching P2002 conflict', async () => {
    const symbolProfile = createSymbolProfile();
    const conflict = new Prisma.PrismaClientKnownRequestError(
      'Unique constraint failed',
      {
        clientVersion: 'test',
        code: 'P2002',
        meta: {
          driverAdapterError: {
            cause: {
              constraint: {
                fields: ['"dataSource"', 'symbol']
              }
            }
          }
        }
      }
    );
    symbolProfileService.getSymbolProfiles
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([symbolProfile]);
    symbolProfileService.add.mockRejectedValue(conflict);

    const activities = await importDuplicateActivities(symbolProfile);

    expect(symbolProfileService.getSymbolProfiles).toHaveBeenCalledTimes(2);
    expect(activitiesService.createActivity).toHaveBeenCalledTimes(2);
    expect(activities).toHaveLength(2);
  });

  it('rethrows an unrelated P2002 conflict', async () => {
    const symbolProfile = createSymbolProfile();
    const conflict = new Prisma.PrismaClientKnownRequestError(
      'Unique constraint failed',
      {
        clientVersion: 'test',
        code: 'P2002',
        meta: {
          target: ['id']
        }
      }
    );
    symbolProfileService.getSymbolProfiles.mockResolvedValue([]);
    symbolProfileService.add.mockRejectedValue(conflict);

    await expect(importDuplicateActivities(symbolProfile)).rejects.toBe(
      conflict
    );
    expect(activitiesService.createActivity).not.toHaveBeenCalled();
  });

  function createSymbolProfile() {
    return {
      currency: 'USD',
      dataSource: DataSource.MANUAL,
      name: 'Repeated fee',
      symbol: 'GF_REPEATED_FEE'
    };
  }

  async function importDuplicateActivities(
    symbolProfile: ReturnType<typeof createSymbolProfile>
  ) {
    const activitiesDto = [
      {
        currency: symbolProfile.currency,
        dataSource: symbolProfile.dataSource,
        date: '2026-01-01T00:00:00.000Z',
        fee: 0,
        quantity: 1,
        symbol: symbolProfile.symbol,
        tags: [],
        type: 'FEE' as const,
        unitPrice: 1
      },
      {
        currency: symbolProfile.currency,
        dataSource: symbolProfile.dataSource,
        date: '2026-01-02T00:00:00.000Z',
        fee: 0,
        quantity: 1,
        symbol: symbolProfile.symbol,
        tags: [],
        type: 'FEE' as const,
        unitPrice: 1
      }
    ];
    const assetProfileIdentifier = getAssetProfileIdentifier(symbolProfile);
    dataProviderService.validateActivities.mockResolvedValue({
      [assetProfileIdentifier]: symbolProfile
    });

    return importService.import({
      activitiesDto,
      maxActivitiesToImport: 10,
      user,
      accountsWithBalancesDto: [],
      assetProfilesWithMarketDataDto: [],
      platformsDto: [],
      tagsDto: []
    });
  }
});
