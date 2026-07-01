import { AccountService } from '@ghostfolio/api/app/account/account.service';
import { ActivitiesService } from '@ghostfolio/api/app/activities/activities.service';
import { DataProviderService } from '@ghostfolio/api/services/data-provider/data-provider.service';
import { MarketDataService } from '@ghostfolio/api/services/market-data/market-data.service';
import { DataGatheringService } from '@ghostfolio/api/services/queues/data-gathering/data-gathering.service';
import { SymbolProfileService } from '@ghostfolio/api/services/symbol-profile/symbol-profile.service';
import { TagService } from '@ghostfolio/api/services/tag/tag.service';
import { UserWithSettings } from '@ghostfolio/common/types';

import { DataSource } from '@prisma/client';

import { ImportService } from './import.service';

describe('ImportService', () => {
  let importService: ImportService;
  let accountService: Partial<AccountService>;
  let activitiesService: Partial<ActivitiesService>;
  let dataGatheringService: Partial<DataGatheringService>;
  let dataProviderService: Partial<DataProviderService>;
  let symbolProfileService: Partial<SymbolProfileService>;
  let marketDataService: Partial<MarketDataService>;
  let tagService: Partial<TagService>;

  const userId = 'test-user-id';

  const user = {
    id: userId,
    permissions: [],
    settings: { settings: { baseCurrency: 'USD' } }
  } as unknown as UserWithSettings;

  beforeEach(() => {
    symbolProfileService = {
      getSymbolProfiles: jest.fn(),
      add: jest.fn()
    };

    marketDataService = {
      updateMany: jest.fn()
    };

    dataProviderService = {
      validateActivities: jest.fn().mockResolvedValue([])
    };

    dataGatheringService = {
      gatherSymbols: jest.fn()
    };

    activitiesService = {
      getActivities: jest.fn().mockResolvedValue({ activities: [] })
    };

    accountService = {
      getAccounts: jest.fn().mockResolvedValue([])
    };

    tagService = {
      getTagsForUser: jest.fn().mockResolvedValue([])
    };

    importService = new ImportService(
      accountService as unknown as AccountService,
      activitiesService as unknown as ActivitiesService,
      null, // apiService
      dataGatheringService as unknown as DataGatheringService,
      dataProviderService as unknown as DataProviderService,
      null, // exchangeRateDataService
      marketDataService as MarketDataService,
      null, // platformService
      null, // portfolioService
      symbolProfileService as SymbolProfileService,
      tagService as unknown as TagService
    );
  });

  describe('import', () => {
    it('should reuse existing global asset profile (userId is null) instead of creating a duplicate', async () => {
      const existingGlobalProfile = {
        dataSource: DataSource.YAHOO,
        symbol: 'VOO',
        userId: null
      };

      (symbolProfileService.getSymbolProfiles as jest.Mock).mockResolvedValue([
        existingGlobalProfile
      ]);
      (marketDataService.updateMany as jest.Mock).mockResolvedValue(undefined);

      await importService.import({
        accountsWithBalancesDto: [],
        activitiesDto: [],
        assetProfilesWithMarketDataDto: [
          {
            currency: 'USD',
            dataSource: DataSource.YAHOO,
            symbol: 'VOO',
            marketData: []
          }
        ],
        isDryRun: false,
        maxActivitiesToImport: 100,
        tagsDto: [],
        user
      });

      expect(symbolProfileService.add).not.toHaveBeenCalled();
    });

    it('should create a new profile with remapped symbol when asset profile belongs to a different user', async () => {
      const otherUsersProfile = {
        dataSource: DataSource.MANUAL,
        symbol: 'MY_ASSET',
        userId: 'other-user-id'
      };

      (symbolProfileService.getSymbolProfiles as jest.Mock).mockResolvedValue([
        otherUsersProfile
      ]);
      (marketDataService.updateMany as jest.Mock).mockResolvedValue(undefined);

      await importService.import({
        accountsWithBalancesDto: [],
        activitiesDto: [],
        assetProfilesWithMarketDataDto: [
          {
            currency: 'USD',
            dataSource: DataSource.MANUAL,
            symbol: 'MY_ASSET',
            marketData: []
          }
        ],
        isDryRun: false,
        maxActivitiesToImport: 100,
        tagsDto: [],
        user
      });

      expect(symbolProfileService.add).toHaveBeenCalledTimes(1);

      const addedProfile = (symbolProfileService.add as jest.Mock).mock
        .calls[0][0];

      // Symbol should have been remapped to a UUID (not original)
      expect(addedProfile.symbol).not.toBe('MY_ASSET');
    });

    it('should reuse existing profile when it belongs to the importing user', async () => {
      const usersOwnProfile = {
        dataSource: DataSource.MANUAL,
        symbol: 'MY_ASSET',
        userId
      };

      (symbolProfileService.getSymbolProfiles as jest.Mock).mockResolvedValue([
        usersOwnProfile
      ]);
      (marketDataService.updateMany as jest.Mock).mockResolvedValue(undefined);

      await importService.import({
        accountsWithBalancesDto: [],
        activitiesDto: [],
        assetProfilesWithMarketDataDto: [
          {
            currency: 'USD',
            dataSource: DataSource.MANUAL,
            symbol: 'MY_ASSET',
            marketData: []
          }
        ],
        isDryRun: false,
        maxActivitiesToImport: 100,
        tagsDto: [],
        user
      });

      expect(symbolProfileService.add).not.toHaveBeenCalled();
    });

    it('should create a new profile when no existing profile exists', async () => {
      (symbolProfileService.getSymbolProfiles as jest.Mock).mockResolvedValue(
        []
      );
      (marketDataService.updateMany as jest.Mock).mockResolvedValue(undefined);

      await importService.import({
        accountsWithBalancesDto: [],
        activitiesDto: [],
        assetProfilesWithMarketDataDto: [
          {
            currency: 'USD',
            dataSource: DataSource.YAHOO,
            symbol: 'AAPL',
            marketData: []
          }
        ],
        isDryRun: false,
        maxActivitiesToImport: 100,
        tagsDto: [],
        user
      });

      expect(symbolProfileService.add).toHaveBeenCalledTimes(1);

      const addedProfile = (symbolProfileService.add as jest.Mock).mock
        .calls[0][0];

      expect(addedProfile.symbol).toBe('AAPL');
      expect(addedProfile.user).toEqual({ connect: { id: userId } });
    });

    it('should skip profile creation when isDryRun is true', async () => {
      await importService.import({
        accountsWithBalancesDto: [],
        activitiesDto: [],
        assetProfilesWithMarketDataDto: [
          {
            currency: 'USD',
            dataSource: DataSource.YAHOO,
            symbol: 'AAPL',
            marketData: []
          }
        ],
        isDryRun: true,
        maxActivitiesToImport: 100,
        tagsDto: [],
        user
      });

      expect(symbolProfileService.getSymbolProfiles).not.toHaveBeenCalled();
      expect(symbolProfileService.add).not.toHaveBeenCalled();
      expect(marketDataService.updateMany).not.toHaveBeenCalled();
    });

    it('should call marketDataService.updateMany when reusing a global profile', async () => {
      const existingGlobalProfile = {
        dataSource: DataSource.YAHOO,
        symbol: 'VOO',
        userId: null
      };

      (symbolProfileService.getSymbolProfiles as jest.Mock).mockResolvedValue([
        existingGlobalProfile
      ]);
      (marketDataService.updateMany as jest.Mock).mockResolvedValue(undefined);

      await importService.import({
        accountsWithBalancesDto: [],
        activitiesDto: [],
        assetProfilesWithMarketDataDto: [
          {
            currency: 'USD',
            dataSource: DataSource.YAHOO,
            symbol: 'VOO',
            marketData: []
          }
        ],
        isDryRun: false,
        maxActivitiesToImport: 100,
        tagsDto: [],
        user
      });

      expect(symbolProfileService.add).not.toHaveBeenCalled();
      expect(marketDataService.updateMany).toHaveBeenCalledWith({ data: [] });
    });
  });
});
