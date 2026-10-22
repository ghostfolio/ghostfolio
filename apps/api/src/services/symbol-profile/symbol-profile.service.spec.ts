import { PrismaService } from '@ghostfolio/api/services/prisma/prisma.service';

import { DataSource } from '@prisma/client';

import { SymbolProfileService } from './symbol-profile.service';

describe('SymbolProfileService', () => {
  let findMany: jest.Mock;
  let symbolProfileService: SymbolProfileService;

  beforeEach(() => {
    findMany = jest.fn().mockResolvedValue([]);

    symbolProfileService = new SymbolProfileService({
      symbolProfile: {
        findMany
      }
    } as unknown as PrismaService);
  });

  describe('getCustomSymbolProfilesByNames', () => {
    it('includes the manual asset profiles of the user and global profiles', async () => {
      await symbolProfileService.getCustomSymbolProfilesByNames({
        names: ['Global X Copper Miners ETF'],
        userId: 'user-id'
      });

      expect(findMany).toHaveBeenCalledWith({
        select: { name: true, symbol: true, userId: true },
        where: {
          dataSource: DataSource.MANUAL,
          name: { in: ['Global X Copper Miners ETF'] },
          OR: [{ userId: 'user-id' }, { userId: null }]
        }
      });
    });

    it('returns an empty list without names', async () => {
      await expect(
        symbolProfileService.getCustomSymbolProfilesByNames({
          names: [],
          userId: 'user-id'
        })
      ).resolves.toEqual([]);

      expect(findMany).not.toHaveBeenCalled();
    });
  });
});
