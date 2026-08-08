import { PrismaService } from '@ghostfolio/api/services/prisma/prisma.service';
import { getAssetProfileIdentifier } from '@ghostfolio/common/helper';
import { AssetProfileIdentifier } from '@ghostfolio/common/interfaces';

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

  describe('getSplitsByAssetProfiles', () => {
    it('fetches and groups all splits with one ordered query', async () => {
      const assetProfiles: AssetProfileIdentifier[] = [
        { dataSource: DataSource.YAHOO, symbol: 'AAPL' },
        { dataSource: DataSource.YAHOO, symbol: 'MSFT' }
      ];
      const aaplSplit = createSplit({
        date: new Date('2020-08-31'),
        symbolProfile: assetProfiles[0]
      });
      const msftSplit = createSplit({
        date: new Date('2021-09-16'),
        symbolProfile: assetProfiles[1]
      });

      findMany.mockResolvedValue([
        { ...aaplSplit, symbolProfile: assetProfiles[0] },
        { ...msftSplit, symbolProfile: assetProfiles[1] }
      ]);

      const splits =
        await assetProfileSplitService.getSplitsByAssetProfiles(assetProfiles);

      expect(findMany).toHaveBeenCalledTimes(1);
      expect(findMany).toHaveBeenCalledWith({
        include: {
          symbolProfile: {
            select: {
              dataSource: true,
              symbol: true
            }
          }
        },
        orderBy: [{ date: 'asc' }],
        where: {
          symbolProfile: {
            OR: assetProfiles
          }
        }
      });
      expect(splits).toEqual(
        new Map([
          [getAssetProfileIdentifier(assetProfiles[0]), [aaplSplit]],
          [getAssetProfileIdentifier(assetProfiles[1]), [msftSplit]]
        ])
      );
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

function createSplit({
  date,
  symbolProfile
}: {
  date: Date;
  symbolProfile: AssetProfileIdentifier;
}): AssetProfileSplit {
  return {
    createdAt: date,
    date,
    denominator: 1,
    id: `${symbolProfile.symbol}-split`,
    numerator: 2,
    symbolProfileId: `${symbolProfile.symbol}-profile`,
    updatedAt: date
  };
}

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
