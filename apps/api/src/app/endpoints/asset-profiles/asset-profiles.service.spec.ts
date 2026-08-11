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
  let findMany: jest.Mock;
  let gatherSymbol: jest.Mock;
  let upsert: jest.Mock;

  beforeEach(() => {
    deleteById = jest.fn();
    emit = jest.fn();
    findMany = jest.fn().mockResolvedValue([]);
    gatherSymbol = jest.fn();
    upsert = jest.fn();

    assetProfilesService = new AssetProfilesService(
      null,
      {
        deleteById,
        upsert
      } as unknown as AssetProfileSplitService,
      null,
      { gatherSymbol } as unknown as DataGatheringService,
      null,
      null,
      { emit } as unknown as EventEmitter2,
      null,
      { order: { findMany } } as never,
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
      const split = {} as AssetProfileSplit;
      upsert.mockResolvedValue(split);
      findMany.mockResolvedValue([{ userId: 'user-1' }, { userId: 'user-2' }]);

      assetProfilesService = new AssetProfilesService(
        null,
        {
          deleteById,
          upsert
        } as unknown as AssetProfileSplitService,
        null,
        { gatherSymbol } as unknown as DataGatheringService,
        null,
        null,
        { emit } as unknown as EventEmitter2,
        null,
        { order: { findMany } } as never,
        null
      );

      await assetProfilesService.createSplit({
        dataSource: DataSource.YAHOO,
        date: new Date('2024-06-15T18:30:00.000Z'),
        denominator: 1,
        numerator: 2,
        symbol: 'AAPL',
        symbolProfileId: 'profile-id'
      });

      expect(findMany).toHaveBeenCalledWith({
        distinct: ['userId'],
        select: { userId: true },
        where: { symbolProfileId: 'profile-id' }
      });
      expect(emit.mock.calls.map(([, event]) => event.getUserId())).toEqual([
        'user-1',
        'user-2'
      ]);
      expect(emit.mock.calls[0][0]).toBe(PortfolioChangedEvent.getName());
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

      expect(emit).not.toHaveBeenCalled();
    });

    it('deletes an existing split using its profile scope', async () => {
      deleteById.mockResolvedValue(true);
      findMany.mockResolvedValue([{ userId: 'user-1' }]);

      await expect(
        assetProfilesService.deleteSplit({
          dataSource: DataSource.YAHOO,
          id: 'split-id',
          symbol: 'AAPL',
          symbolProfileId: 'profile-id'
        })
      ).resolves.toBeUndefined();

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
