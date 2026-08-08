import { AssetProfileSplitService } from '@ghostfolio/api/services/asset-profile-split/asset-profile-split.service';
import { DataGatheringService } from '@ghostfolio/api/services/queues/data-gathering/data-gathering.service';

import { NotFoundException } from '@nestjs/common';
import { AssetProfileSplit, DataSource } from '@prisma/client';

import { AssetProfilesService } from './asset-profiles.service';

describe('AssetProfilesService', () => {
  let assetProfilesService: AssetProfilesService;
  let deleteById: jest.Mock;
  let gatherSymbol: jest.Mock;
  let upsert: jest.Mock;

  beforeEach(() => {
    deleteById = jest.fn();
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
  });

  describe('deleteSplit', () => {
    it('throws NotFoundException when the scoped split does not exist', async () => {
      deleteById.mockResolvedValue(false);

      await expect(
        assetProfilesService.deleteSplit({
          id: 'split-id',
          symbolProfileId: 'profile-id'
        })
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('deletes an existing split using its profile scope', async () => {
      deleteById.mockResolvedValue(true);

      await expect(
        assetProfilesService.deleteSplit({
          id: 'split-id',
          symbolProfileId: 'profile-id'
        })
      ).resolves.toBeUndefined();

      expect(deleteById).toHaveBeenCalledWith({
        id: 'split-id',
        symbolProfileId: 'profile-id'
      });
    });
  });
});
