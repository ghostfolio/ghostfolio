import { ActivitiesService } from '@ghostfolio/api/app/activities/activities.service';
import { PortfolioChangedEvent } from '@ghostfolio/api/events/portfolio-changed.event';
import { AssetProfileSplitService } from '@ghostfolio/api/services/asset-profile-split/asset-profile-split.service';
import { DataGatheringService } from '@ghostfolio/api/services/queues/data-gathering/data-gathering.service';

import { NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AssetProfileSplit, DataSource } from '@prisma/client';

import { AssetProfilesService } from './asset-profiles.service';

describe('AssetProfilesService', () => {
  let assetProfilesService: AssetProfilesService;
  let deleteById: jest.Mock;
  let emit: jest.Mock;
  let finished: jest.Mock;
  let gatherSymbol: jest.Mock;
  let getUserIdsByAssetProfile: jest.Mock;
  let upsert: jest.Mock;

  beforeEach(() => {
    deleteById = jest.fn();
    emit = jest.fn();
    finished = jest.fn().mockResolvedValue(undefined);
    gatherSymbol = jest.fn().mockResolvedValue([{ finished }]);
    getUserIdsByAssetProfile = jest.fn().mockResolvedValue([]);
    upsert = jest.fn();

    assetProfilesService = new AssetProfilesService(
      { getUserIdsByAssetProfile } as unknown as ActivitiesService,
      {
        deleteById,
        upsert
      } as unknown as AssetProfileSplitService,
      null,
      { gatherSymbol } as unknown as DataGatheringService,
      null,
      { emit } as unknown as EventEmitter2,
      null,
      null,
      null,
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
        symbol: data.symbol
      });
      expect(result).toBe(split);
    });

    it('invalidates portfolio snapshots for users holding the asset', async () => {
      upsert.mockResolvedValue({} as AssetProfileSplit);
      getUserIdsByAssetProfile.mockResolvedValue(['user-1', 'user-2']);

      await assetProfilesService.createSplit({
        dataSource: DataSource.YAHOO,
        date: new Date('2024-06-15T18:30:00.000Z'),
        denominator: 1,
        numerator: 2,
        symbol: 'AAPL',
        symbolProfileId: 'profile-id'
      });
      await flushPendingPromises();

      expect(getUserIdsByAssetProfile).toHaveBeenCalledWith({
        dataSource: DataSource.YAHOO,
        symbol: 'AAPL'
      });
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
      getUserIdsByAssetProfile.mockResolvedValue(['user-1']);

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
      getUserIdsByAssetProfile.mockResolvedValue(['user-1']);

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
        symbol: 'AAPL'
      });
    });
  });
});

function flushPendingPromises() {
  return new Promise((resolve) => {
    setImmediate(resolve);
  });
}
