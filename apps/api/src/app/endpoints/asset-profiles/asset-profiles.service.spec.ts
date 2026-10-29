import { PortfolioChangedEvent } from '@ghostfolio/api/events/portfolio-changed.event';
import { ActivitiesService } from '@ghostfolio/api/services/activities/activities.service';
import { AssetProfileSplitService } from '@ghostfolio/api/services/asset-profile-split/asset-profile-split.service';
import { DataProviderService } from '@ghostfolio/api/services/data-provider/data-provider.service';
import { MarketDataService } from '@ghostfolio/api/services/market-data/market-data.service';
import { PrismaService } from '@ghostfolio/api/services/prisma/prisma.service';
import { DataGatheringService } from '@ghostfolio/api/services/queues/data-gathering/data-gathering.service';

import { NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AssetProfileSplit, DataSource } from '@prisma/client';

import { AssetProfilesService } from './asset-profiles.service';

describe('AssetProfilesService', () => {
  let assetProfilesService: AssetProfilesService;
  let deleteById: jest.Mock;
  let emit: jest.Mock;
  let findMany: jest.Mock;
  let finished: jest.Mock;
  let gatherSymbol: jest.Mock;
  let getUserIdsBySymbolProfileId: jest.Mock;
  let upsert: jest.Mock;

  beforeEach(() => {
    deleteById = jest.fn();
    emit = jest.fn();
    findMany = jest.fn();
    finished = jest.fn().mockResolvedValue(undefined);
    gatherSymbol = jest.fn().mockResolvedValue([{ finished }]);
    getUserIdsBySymbolProfileId = jest.fn().mockResolvedValue([]);
    upsert = jest.fn();

    assetProfilesService = new AssetProfilesService(
      { getUserIdsBySymbolProfileId } as unknown as ActivitiesService,
      {
        deleteById,
        upsert
      } as unknown as AssetProfileSplitService,
      null,
      { gatherSymbol } as unknown as DataGatheringService,
      {
        getDataProvider: jest.fn().mockReturnValue({
          getDataProviderInfo: jest.fn()
        })
      } as unknown as DataProviderService,
      { emit } as unknown as EventEmitter2,
      null,
      {
        getLatest: jest.fn().mockResolvedValue(undefined)
      } as unknown as MarketDataService,
      {
        marketData: {
          count: jest.fn().mockResolvedValue(0)
        },
        symbolProfile: {
          findMany,
          count: jest.fn().mockResolvedValue(0)
        }
      } as unknown as PrismaService,
      null
    );
  });

  describe('createSplit', () => {
    it('upserts the split and refreshes the asset profile data', async () => {
      const split = {} as AssetProfileSplit;
      const data = {
        dataSource: DataSource.YAHOO,
        date: new Date('2024-06-15T18:30:00.000Z'),
        denominator: 1,
        numerator: 2,
        symbol: 'AAPL',
        symbolProfileId: 'profile-id'
      };
      upsert.mockResolvedValue(split);

      const result = await assetProfilesService.createSplit(data);

      expect(upsert).toHaveBeenCalledWith({
        date: data.date,
        denominator: data.denominator,
        numerator: data.numerator,
        symbolProfileId: data.symbolProfileId
      });
      expect(gatherSymbol).toHaveBeenCalledWith({
        dataSource: data.dataSource,
        force: true,
        symbol: data.symbol
      });
      expect(result).toBe(split);
    });

    it('invalidates portfolio snapshots for users holding the asset', async () => {
      upsert.mockResolvedValue({} as AssetProfileSplit);
      getUserIdsBySymbolProfileId.mockResolvedValue(['user-1', 'user-2']);

      await assetProfilesService.createSplit({
        dataSource: DataSource.YAHOO,
        date: new Date('2024-06-15T18:30:00.000Z'),
        denominator: 1,
        numerator: 2,
        symbol: 'AAPL',
        symbolProfileId: 'profile-id'
      });
      await flushPendingPromises();

      expect(getUserIdsBySymbolProfileId).toHaveBeenCalledWith('profile-id');
      expect(emit.mock.calls.map(([, event]) => event.getUserId())).toEqual([
        'user-1',
        'user-2'
      ]);
      expect(emit.mock.calls[0][0]).toBe(PortfolioChangedEvent.getName());
    });

    it('emits the events only once the market data has been gathered', async () => {
      let completeJob: () => void;

      finished.mockReturnValue(
        new Promise<void>((resolve) => {
          completeJob = resolve;
        })
      );
      upsert.mockResolvedValue({} as AssetProfileSplit);
      getUserIdsBySymbolProfileId.mockResolvedValue(['user-1']);

      await assetProfilesService.createSplit({
        dataSource: DataSource.YAHOO,
        date: new Date('2024-06-15T18:30:00.000Z'),
        denominator: 1,
        numerator: 2,
        symbol: 'AAPL',
        symbolProfileId: 'profile-id'
      });
      await flushPendingPromises();

      expect(emit).not.toHaveBeenCalled();

      completeJob();
      await flushPendingPromises();

      expect(emit.mock.calls.map(([, event]) => event.getUserId())).toEqual([
        'user-1'
      ]);
    });
  });

  describe('getAssetProfiles', () => {
    it('flags the asset profiles used by users with a subscription', async () => {
      findMany
        .mockResolvedValueOnce([
          createSymbolProfile({ activitiesCount: 2, id: 'profile-id-1' }),
          createSymbolProfile({ activitiesCount: 1, id: 'profile-id-2' }),
          createSymbolProfile({ activitiesCount: 0, id: 'profile-id-3' })
        ])
        .mockResolvedValueOnce([{ id: 'profile-id-1' }]);

      const { assetProfiles } = await assetProfilesService.getAssetProfiles({});

      expect(findMany).toHaveBeenLastCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: { in: ['profile-id-1', 'profile-id-2'] }
          })
        })
      );
      expect(
        assetProfiles.map(({ id, isUsedByUsersWithSubscription }) => {
          return { id, isUsedByUsersWithSubscription };
        })
      ).toEqual([
        { id: 'profile-id-1', isUsedByUsersWithSubscription: true },
        { id: 'profile-id-2', isUsedByUsersWithSubscription: false },
        { id: 'profile-id-3', isUsedByUsersWithSubscription: false }
      ]);
    });

    it('skips the subscription query when no asset profile has activities', async () => {
      findMany.mockResolvedValueOnce([
        createSymbolProfile({ activitiesCount: 0, id: 'profile-id-1' })
      ]);

      const { assetProfiles } = await assetProfilesService.getAssetProfiles({});

      expect(findMany).toHaveBeenCalledTimes(1);
      expect(assetProfiles[0].isUsedByUsersWithSubscription).toBe(false);
    });
  });

  describe('deleteSplit', () => {
    it('throws NotFoundException when the scoped split does not exist', async () => {
      deleteById.mockResolvedValue(false);

      await expect(
        assetProfilesService.deleteSplit({
          dataSource: DataSource.YAHOO,
          id: 'split-id',
          symbol: 'AAPL',
          symbolProfileId: 'profile-id'
        })
      ).rejects.toBeInstanceOf(NotFoundException);
      await flushPendingPromises();

      expect(gatherSymbol).not.toHaveBeenCalled();
      expect(emit).not.toHaveBeenCalled();
    });

    it('deletes an existing split using its profile scope', async () => {
      deleteById.mockResolvedValue(true);
      getUserIdsBySymbolProfileId.mockResolvedValue(['user-1']);

      await expect(
        assetProfilesService.deleteSplit({
          dataSource: DataSource.YAHOO,
          id: 'split-id',
          symbol: 'AAPL',
          symbolProfileId: 'profile-id'
        })
      ).resolves.toBeUndefined();
      await flushPendingPromises();

      expect(deleteById).toHaveBeenCalledWith({
        id: 'split-id',
        symbolProfileId: 'profile-id'
      });
      expect(emit.mock.calls.map(([, event]) => event.getUserId())).toEqual([
        'user-1'
      ]);
      expect(gatherSymbol).toHaveBeenCalledWith({
        dataSource: DataSource.YAHOO,
        force: true,
        symbol: 'AAPL'
      });
    });
  });
});

function createSymbolProfile({
  activitiesCount,
  id
}: {
  activitiesCount: number;
  id: string;
}) {
  return {
    id,
    _count: { activities: activitiesCount, watchedBy: 0 },
    activities: [],
    assetProfileOverrides: null,
    dataSource: DataSource.YAHOO,
    symbol: 'AAPL'
  };
}

function flushPendingPromises() {
  return new Promise((resolve) => {
    setImmediate(resolve);
  });
}
