import { RedisCacheService } from '@ghostfolio/api/app/redis-cache/redis-cache.service';
import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';
import { DataProviderInterface } from '@ghostfolio/api/services/data-provider/interfaces/data-provider.interface';
import { MarketDataService } from '@ghostfolio/api/services/market-data/market-data.service';
import { PrismaService } from '@ghostfolio/api/services/prisma/prisma.service';
import { PropertyService } from '@ghostfolio/api/services/property/property.service';
import { SubscriptionType } from '@ghostfolio/common/enums';
import { getAssetProfileIdentifier } from '@ghostfolio/common/helper';
import type { UserWithSettings } from '@ghostfolio/common/types';

import { AssetClass, AssetSubClass, DataSource } from '@prisma/client';

import { DataProviderService } from './data-provider.service';

describe('DataProviderService', () => {
  describe('validateActivities', () => {
    const assetProfileOfUser = {
      assetClass: AssetClass.EQUITY,
      assetSubClass: AssetSubClass.ETF,
      currency: 'USD',
      dataSource: DataSource.EOD_HISTORICAL_DATA,
      isin: 'IE00BK5BQT80',
      name: 'Vanguard FTSE All-World UCITS ETF',
      symbol: 'VWRA.LSE'
    };

    const activityOfAssetProfileOfUser = {
      currency: 'USD',
      dataSource: DataSource.EOD_HISTORICAL_DATA,
      symbol: 'VWRA.LSE',
      type: 'BUY' as const
    };

    const basicSubscription = {
      type: SubscriptionType.Basic
    } as UserWithSettings['subscription'];

    const userId = 'user-id';

    let dataProviderService: DataProviderService;
    let eodHistoricalDataService: DataProviderInterface;
    let findFirstSymbolProfile: jest.Mock;

    beforeEach(() => {
      const configuration = {
        DATA_SOURCES: [DataSource.EOD_HISTORICAL_DATA, DataSource.YAHOO],
        DATA_SOURCES_GHOSTFOLIO_DATA_PROVIDER: [],
        ENABLE_FEATURE_SUBSCRIPTION: true
      };

      eodHistoricalDataService = {
        getAssetProfile: jest.fn().mockResolvedValue(assetProfileOfUser),
        getDataProviderInfo: jest.fn().mockReturnValue({ isPremium: true }),
        getName: jest.fn().mockReturnValue(DataSource.EOD_HISTORICAL_DATA)
      } as unknown as DataProviderInterface;

      findFirstSymbolProfile = jest.fn().mockResolvedValue(assetProfileOfUser);

      dataProviderService = new DataProviderService(
        {
          get: (key: keyof typeof configuration) => {
            return configuration[key];
          }
        } as unknown as ConfigurationService,
        [eodHistoricalDataService],
        {} as MarketDataService,
        {
          symbolProfile: { findFirst: findFirstSymbolProfile }
        } as unknown as PrismaService,
        {
          getByKey: jest.fn().mockResolvedValue(undefined)
        } as unknown as PropertyService,
        {} as RedisCacheService
      );
    });

    it('takes the stored asset profile of a premium data provider without a request to the data provider for the Basic subscription if the user has an activity with it', async () => {
      await expect(
        dataProviderService.validateActivities({
          userId,
          activitiesDto: [activityOfAssetProfileOfUser],
          maxActivitiesToImport: 1,
          subscription: basicSubscription
        })
      ).resolves.toEqual({
        [getAssetProfileIdentifier(assetProfileOfUser)]: assetProfileOfUser
      });

      expect(findFirstSymbolProfile).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            activities: { some: { userId } },
            dataSource: DataSource.EOD_HISTORICAL_DATA,
            symbol: 'VWRA.LSE'
          }
        })
      );

      expect(eodHistoricalDataService.getAssetProfile).not.toHaveBeenCalled();
    });

    it('gets the stored asset profile once for several activities with it', async () => {
      await dataProviderService.validateActivities({
        userId,
        activitiesDto: [
          activityOfAssetProfileOfUser,
          { ...activityOfAssetProfileOfUser, type: 'SELL' }
        ],
        maxActivitiesToImport: 2,
        subscription: basicSubscription
      });

      expect(findFirstSymbolProfile).toHaveBeenCalledTimes(1);
    });

    it('throws an error for a premium data provider for the Basic subscription if the user has no activity with the asset profile', async () => {
      findFirstSymbolProfile.mockResolvedValue(null);

      await expect(
        dataProviderService.validateActivities({
          userId,
          activitiesDto: [activityOfAssetProfileOfUser],
          maxActivitiesToImport: 1,
          subscription: basicSubscription
        })
      ).rejects.toThrow(
        'activity.dataSource ("EOD_HISTORICAL_DATA") requires Ghostfolio Premium'
      );
    });

    it('resolves the asset profile of a premium data provider with the data provider for the Premium subscription', async () => {
      await dataProviderService.validateActivities({
        userId,
        activitiesDto: [activityOfAssetProfileOfUser],
        maxActivitiesToImport: 1,
        subscription: {
          type: SubscriptionType.Premium
        } as UserWithSettings['subscription']
      });

      expect(findFirstSymbolProfile).not.toHaveBeenCalled();

      expect(eodHistoricalDataService.getAssetProfile).toHaveBeenCalledWith({
        symbol: 'VWRA.LSE'
      });
    });
  });
});
