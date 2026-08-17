import { PrismaService } from '@ghostfolio/api/services/prisma/prisma.service';

import { AssetProfileSplit, DataSource } from '@prisma/client';

import { AssetProfileSplitService } from './asset-profile-split.service';

describe('AssetProfileSplitService', () => {
  let assetProfileSplitService: AssetProfileSplitService;
  let deleteMany: jest.Mock;
  let findMany: jest.Mock;
  let upsert: jest.Mock;

  beforeEach(() => {
    deleteMany = jest.fn();
    findMany = jest.fn();
    upsert = jest.fn();

    assetProfileSplitService = new AssetProfileSplitService({
      assetProfileSplit: { deleteMany, findMany, upsert }
    } as unknown as PrismaService);
  });

  describe('deleteById', () => {
    it('scopes deletion by split and asset profile identifiers', async () => {
      deleteMany.mockResolvedValue({ count: 1 });

      const result = await assetProfileSplitService.deleteById({
        id: 'split-id',
        symbolProfileId: 'profile-id'
      });

      expect(result).toBe(true);
      expect(deleteMany).toHaveBeenCalledWith({
        where: {
          id: 'split-id',
          symbolProfileId: 'profile-id'
        }
      });
    });

    it('returns false when the split belongs to another asset profile', async () => {
      deleteMany.mockResolvedValue({ count: 0 });

      const result = await assetProfileSplitService.deleteById({
        id: 'split-id',
        symbolProfileId: 'other-profile-id'
      });

      expect(result).toBe(false);
      expect(deleteMany).toHaveBeenCalledWith({
        where: {
          id: 'split-id',
          symbolProfileId: 'other-profile-id'
        }
      });
    });
  });

  describe('getSplitsByUserId', () => {
    it('fetches the splits of the asset profiles held by the user with one ordered query', async () => {
      const splits = [
        createStoredSplit('2020-08-31'),
        createStoredSplit('2021-09-16')
      ];

      findMany.mockResolvedValue(splits);

      const result = await assetProfileSplitService.getSplitsByUserId({
        userId: 'user-id'
      });

      expect(result).toBe(splits);
      expect(findMany).toHaveBeenCalledTimes(1);
      expect(findMany).toHaveBeenCalledWith({
        orderBy: [{ date: 'asc' }],
        where: {
          symbolProfile: {
            activities: {
              some: {
                userId: 'user-id'
              }
            }
          }
        }
      });
    });
  });

  describe('upsert', () => {
    it('normalizes the split date before persisting it', async () => {
      const date = new Date('2024-06-15T18:30:00.000Z');
      const normalizedDate = new Date('2024-06-15T00:00:00.000Z');

      await assetProfileSplitService.upsert({
        date,
        denominator: 1,
        numerator: 2,
        symbolProfileId: 'profile-id'
      });

      expect(upsert).toHaveBeenCalledWith({
        create: {
          date: normalizedDate,
          denominator: 1,
          numerator: 2,
          symbolProfileId: 'profile-id'
        },
        update: {
          denominator: 1,
          numerator: 2
        },
        where: {
          symbolProfileId_date: {
            date: normalizedDate,
            symbolProfileId: 'profile-id'
          }
        }
      });
    });
  });

  describe('getSplits', () => {
    it('filters by asset profile and orders splits by date ascending', async () => {
      const splits = [
        createStoredSplit('2020-01-01'),
        createStoredSplit('2021-01-01')
      ];
      findMany.mockResolvedValue(splits);

      const result = await assetProfileSplitService.getSplits({
        dataSource: DataSource.YAHOO,
        symbol: 'AAPL'
      });

      expect(result).toBe(splits);
      expect(findMany).toHaveBeenCalledWith({
        orderBy: [{ date: 'asc' }],
        where: {
          symbolProfile: {
            dataSource: DataSource.YAHOO,
            symbol: 'AAPL'
          }
        }
      });
    });
  });
});

function createStoredSplit(date: string): AssetProfileSplit {
  const splitDate = new Date(date);

  return {
    createdAt: splitDate,
    date: splitDate,
    denominator: 1,
    id: `${date}-split`,
    numerator: 2,
    symbolProfileId: 'aapl-profile',
    updatedAt: splitDate
  };
}
