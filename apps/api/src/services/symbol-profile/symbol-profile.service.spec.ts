import { PrismaService } from '@ghostfolio/api/services/prisma/prisma.service';
import { INVESTMENT_ACTIVITY_TYPES } from '@ghostfolio/common/config';

import { DataSource } from '@prisma/client';

import { SymbolProfileService } from './symbol-profile.service';

describe('SymbolProfileService', () => {
  describe('getSymbolProfiles', () => {
    const getHoldings = async (holdings: object[]) => {
      const symbolProfileService = new SymbolProfileService({
        symbolProfile: {
          findMany: jest.fn().mockResolvedValue([
            {
              holdings,
              _count: { activities: 0, watchedBy: 0 },
              activities: [],
              assetProfileOverrides: null,
              countries: [],
              currency: 'USD',
              dataSource: DataSource.MANUAL,
              sectors: [],
              symbol: 'symbol'
            }
          ])
        }
      } as unknown as PrismaService);

      const [assetProfile] = await symbolProfileService.getSymbolProfiles([
        { dataSource: DataSource.MANUAL, symbol: 'symbol' }
      ]);

      return assetProfile.holdings;
    };

    it('gives the allocation of a holding with a weight', async () => {
      await expect(
        getHoldings([{ name: 'Apple', weight: 0.5 }])
      ).resolves.toEqual([
        expect.objectContaining({ allocationInPercentage: 0.5, name: 'Apple' })
      ]);
    });

    it('gives the allocation of a holding of an import', async () => {
      await expect(
        getHoldings([{ allocationInPercentage: 0.5, name: 'Apple' }])
      ).resolves.toEqual([
        expect.objectContaining({ allocationInPercentage: 0.5, name: 'Apple' })
      ]);
    });

    it('prefers the weight of a holding with both allocations', async () => {
      await expect(
        getHoldings([
          { allocationInPercentage: 0.5, name: 'Apple', weight: 0.9 }
        ])
      ).resolves.toEqual([
        expect.objectContaining({ allocationInPercentage: 0.9, name: 'Apple' })
      ]);
    });

    it('keeps a weight of zero', async () => {
      await expect(
        getHoldings([{ allocationInPercentage: 0.5, name: 'Apple', weight: 0 }])
      ).resolves.toEqual([
        expect.objectContaining({ allocationInPercentage: 0, name: 'Apple' })
      ]);
    });
  });

  describe('getSymbolProfilesOfUser', () => {
    const userId = 'user-id';

    let findManySymbolProfiles: jest.Mock;
    let symbolProfileService: SymbolProfileService;

    beforeEach(() => {
      findManySymbolProfiles = jest.fn().mockResolvedValue([
        {
          assetProfileOverrides: null,
          currency: 'USD',
          dataSource: DataSource.YAHOO,
          isin: 'US0378331005',
          name: 'Apple Inc.',
          symbol: 'AAPL'
        }
      ]);

      symbolProfileService = new SymbolProfileService({
        symbolProfile: { findMany: findManySymbolProfiles }
      } as unknown as PrismaService);
    });

    it('gives the active asset profiles of the investment activities of the user', async () => {
      await expect(
        symbolProfileService.getSymbolProfilesOfUser({ userId })
      ).resolves.toEqual([
        {
          currency: 'USD',
          dataSource: DataSource.YAHOO,
          isin: 'US0378331005',
          name: 'Apple Inc.',
          symbol: 'AAPL'
        }
      ]);

      expect(findManySymbolProfiles).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            activities: {
              some: { userId, type: { in: INVESTMENT_ACTIVITY_TYPES } }
            },
            isActive: true
          }
        })
      );
    });

    it('sorts the asset profiles by the symbol and then by the data source', async () => {
      await symbolProfileService.getSymbolProfilesOfUser({ userId });

      expect(findManySymbolProfiles).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: [{ symbol: 'asc' }, { dataSource: 'asc' }]
        })
      );
    });

    it('gives the name of the overrides', async () => {
      findManySymbolProfiles.mockResolvedValue([
        {
          assetProfileOverrides: { name: 'Apple' },
          currency: 'USD',
          dataSource: DataSource.YAHOO,
          isin: 'US0378331005',
          name: 'Apple Inc.',
          symbol: 'AAPL'
        }
      ]);

      await expect(
        symbolProfileService.getSymbolProfilesOfUser({ userId })
      ).resolves.toEqual([expect.objectContaining({ name: 'Apple' })]);
    });
  });
});
