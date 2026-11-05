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

  describe('getSymbolProfiles', () => {
    let findManySymbolProfiles: jest.Mock;
    let symbolProfileService: SymbolProfileService;

    beforeEach(() => {
      findManySymbolProfiles = jest.fn();

      symbolProfileService = new SymbolProfileService({
        symbolProfile: { findMany: findManySymbolProfiles }
      } as unknown as PrismaService);
    });

    it('enhances the symbol profile and excludes relational metadata', async () => {
      const dateOfFirstActivity = new Date('2024-01-15T00:00:00.000Z');

      findManySymbolProfiles.mockResolvedValue([
        {
          _count: { activities: 3, watchedBy: 1 },
          activities: [{ date: dateOfFirstActivity }],
          assetProfileOverrides: { name: 'Apple Inc. (Custom)' },
          currency: 'USD',
          dataSource: DataSource.YAHOO,
          isin: 'US0378331005',
          name: 'Apple Inc.',
          scraperConfiguration: {
            defaultMarketPrice: 100,
            headers: { 'User-Agent': 'Test' },
            locale: 'en',
            mode: 'lazy',
            selector: '.price',
            url: 'https://example.com'
          },
          symbol: 'AAPL'
        }
      ]);

      const [result] = await symbolProfileService.getSymbolProfiles([
        { dataSource: DataSource.YAHOO, symbol: 'AAPL' }
      ]);

      expect(result).toEqual(
        expect.objectContaining({
          activitiesCount: 3,
          dateOfFirstActivity,
          name: 'Apple Inc. (Custom)',
          scraperConfiguration: {
            defaultMarketPrice: 100,
            headers: { 'User-Agent': 'Test' },
            locale: 'en',
            mode: 'lazy',
            selector: '.price',
            url: 'https://example.com'
          },
          watchedByCount: 1
        })
      );
      expect(result).not.toHaveProperty('_count');
      expect(result).not.toHaveProperty('activities');
      expect(result).not.toHaveProperty('assetProfileOverrides');
    });

    it('gives null for scraperConfiguration if none exists', async () => {
      findManySymbolProfiles.mockResolvedValue([
        {
          _count: { activities: 0 },
          assetProfileOverrides: null,
          currency: 'USD',
          dataSource: DataSource.YAHOO,
          isin: 'US0378331005',
          name: 'Apple Inc.',
          scraperConfiguration: null,
          symbol: 'AAPL'
        }
      ]);

      const [result] = await symbolProfileService.getSymbolProfiles([
        { dataSource: DataSource.YAHOO, symbol: 'AAPL' }
      ]);

      expect(result.scraperConfiguration).toBeNull();
      expect(result.dateOfFirstActivity).toBeUndefined();
      expect(result.watchedByCount).toBe(0);
    });
  });
});
