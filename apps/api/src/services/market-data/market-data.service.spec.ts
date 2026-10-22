import { parseDate } from '@ghostfolio/common/helper';

import { MarketDataService } from './market-data.service';

describe('MarketDataService', () => {
  let marketDataService: MarketDataService;
  let prismaService: {
    $transaction: jest.Mock;
    marketData: {
      createMany: jest.Mock;
      deleteMany: jest.Mock;
      findMany: jest.Mock;
      upsert: jest.Mock;
    };
  };

  beforeEach(() => {
    prismaService = {
      $transaction: jest.fn(),
      marketData: {
        createMany: jest.fn(),
        deleteMany: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        upsert: jest.fn().mockResolvedValue({})
      }
    };

    marketDataService = new MarketDataService(prismaService as any);
  });

  describe('getRange', () => {
    it('queries the symbols grouped by data source', async () => {
      await marketDataService.getRange({
        assetProfileIdentifiers: [
          { dataSource: 'YAHOO', symbol: 'AAPL' },
          { dataSource: 'COINGECKO', symbol: 'bitcoin' },
          { dataSource: 'YAHOO', symbol: 'MSFT' }
        ],
        dateQuery: { gte: parseDate('2026-01-01') }
      });

      expect(
        prismaService.marketData.findMany.mock.calls[0][0].where.OR
      ).toEqual([
        { dataSource: 'YAHOO', symbol: { in: ['AAPL', 'MSFT'] } },
        { dataSource: 'COINGECKO', symbol: { in: ['bitcoin'] } }
      ]);
    });
  });

  describe('updateMany', () => {
    it('does not drop isCarriedForward', async () => {
      prismaService.$transaction.mockImplementation((promises) => {
        return Promise.all(promises);
      });

      await marketDataService.updateMany({
        data: [
          {
            dataSource: 'YAHOO',
            date: parseDate('2026-08-22'),
            isCarriedForward: true,
            marketPrice: 100,
            state: 'CLOSE',
            symbol: 'AAPL'
          }
        ]
      });

      expect(prismaService.marketData.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({ isCarriedForward: true }),
          update: expect.objectContaining({ isCarriedForward: true })
        })
      );
    });

    it('resets isCarriedForward if it is omitted by the caller', async () => {
      prismaService.$transaction.mockImplementation((promises) => {
        return Promise.all(promises);
      });

      await marketDataService.updateMany({
        data: [
          {
            dataSource: 'YAHOO',
            date: parseDate('2026-08-22'),
            marketPrice: 100,
            state: 'CLOSE',
            symbol: 'AAPL'
          }
        ]
      });

      expect(prismaService.marketData.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({ isCarriedForward: false })
        })
      );
    });
  });

  describe('replaceForSymbol', () => {
    it('does not drop isCarriedForward', async () => {
      prismaService.$transaction.mockImplementation((callback) => {
        return callback(prismaService);
      });

      await marketDataService.replaceForSymbol({
        data: [
          {
            dataSource: 'YAHOO',
            date: parseDate('2026-08-21'),
            isCarriedForward: false,
            marketPrice: 100,
            state: 'CLOSE',
            symbol: 'AAPL'
          },
          {
            dataSource: 'YAHOO',
            date: parseDate('2026-08-22'),
            isCarriedForward: true,
            marketPrice: 100,
            state: 'CLOSE',
            symbol: 'AAPL'
          }
        ],
        dataSource: 'YAHOO',
        symbol: 'AAPL'
      });

      const { data } = prismaService.marketData.createMany.mock.calls[0][0];

      expect(data).toEqual([
        expect.objectContaining({ isCarriedForward: false }),
        expect.objectContaining({ isCarriedForward: true })
      ]);
    });
  });
});
