import { PrismaService } from '@ghostfolio/api/services/prisma/prisma.service';
import { INVESTMENT_ACTIVITY_TYPES } from '@ghostfolio/common/config';

import { DataSource } from '@prisma/client';

import { SymbolProfileService } from './symbol-profile.service';

describe('SymbolProfileService', () => {
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

    it('gives the asset profiles of the investment activities of the user', async () => {
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
            }
          }
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
