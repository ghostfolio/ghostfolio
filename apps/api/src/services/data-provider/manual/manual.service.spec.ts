import { PrismaService } from '@ghostfolio/api/services/prisma/prisma.service';
import { SymbolProfileService } from '@ghostfolio/api/services/symbol-profile/symbol-profile.service';
import { EnhancedAssetProfile } from '@ghostfolio/common/interfaces';

import { DataSource } from '@prisma/client';

import { ManualService } from './manual.service';

jest.mock('@ghostfolio/api/services/fetch/fetch.service', () => {
  return {
    FetchService: jest.fn()
  };
});

describe('ManualService', () => {
  let manualService: ManualService;
  let prismaService: {
    marketData: {
      findFirst: jest.Mock;
    };
  };
  let symbolProfileService: SymbolProfileService;

  beforeEach(() => {
    prismaService = {
      marketData: {
        findFirst: jest.fn()
      }
    };

    symbolProfileService = new SymbolProfileService(null);

    manualService = new ManualService(
      null,
      null,
      prismaService as unknown as PrismaService,
      symbolProfileService
    );
  });

  describe('getQuotes', () => {
    it('should use the latest market price of each symbol of the manual data source', async () => {
      const latestMarketPrices: { [symbol: string]: number } = {
        A: 13,
        B: 22
      };

      prismaService.marketData.findFirst.mockImplementation(
        ({ where: { symbol } }) => {
          return Promise.resolve(
            latestMarketPrices[symbol]
              ? { symbol, marketPrice: latestMarketPrices[symbol] }
              : null
          );
        }
      );

      jest.spyOn(symbolProfileService, 'getSymbolProfiles').mockResolvedValue(
        ['A', 'B', 'C'].map((symbol) => {
          return { symbol, currency: 'USD' };
        }) as EnhancedAssetProfile[]
      );

      const quotes = await manualService.getQuotes({
        symbols: ['A', 'B', 'C']
      });

      expect(prismaService.marketData.findFirst).toHaveBeenCalledWith({
        orderBy: { date: 'desc' },
        where: { dataSource: DataSource.MANUAL, symbol: 'A' }
      });

      expect(quotes).toEqual({
        A: {
          currency: 'USD',
          dataSource: DataSource.MANUAL,
          marketPrice: 13,
          marketState: 'delayed'
        },
        B: {
          currency: 'USD',
          dataSource: DataSource.MANUAL,
          marketPrice: 22,
          marketState: 'delayed'
        },
        // Without market data
        C: {
          currency: 'USD',
          dataSource: DataSource.MANUAL,
          marketPrice: 0,
          marketState: 'delayed'
        }
      });
    });
  });
});
