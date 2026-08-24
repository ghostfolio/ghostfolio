import {
  GATHER_HISTORICAL_MARKET_DATA_COOLDOWN_IN_MS,
  GATHER_HISTORICAL_MARKET_DATA_PROCESS_JOB_OPTIONS
} from '@ghostfolio/common/config';
import { parseDate } from '@ghostfolio/common/helper';

import { DataGatheringService } from './data-gathering.service';

describe('DataGatheringService', () => {
  let dataGatheringQueue: { addBulk: jest.Mock; clean: jest.Mock };
  let dataGatheringService: DataGatheringService;
  let dataProviderService: { getHistoricalRaw: jest.Mock };
  let prismaService: { marketData: { groupBy: jest.Mock; upsert: jest.Mock } };

  beforeEach(() => {
    dataGatheringQueue = {
      addBulk: jest.fn().mockResolvedValue([]),
      clean: jest.fn().mockResolvedValue([])
    };
    dataProviderService = { getHistoricalRaw: jest.fn() };
    prismaService = {
      marketData: {
        groupBy: jest.fn().mockResolvedValue([]),
        upsert: jest.fn().mockResolvedValue({})
      }
    };

    dataGatheringService = new DataGatheringService(
      null,
      dataGatheringQueue as any,
      dataProviderService as any,
      null,
      null,
      prismaService as any,
      null,
      null
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('getAssetProfileIdentifiersWithRecentMarketData', () => {
    it('excludes carried forward market prices from the query', async () => {
      jest.useFakeTimers().setSystemTime(parseDate('2026-08-23').getTime());

      await dataGatheringService[
        'getAssetProfileIdentifiersWithRecentMarketData'
      ]();

      expect(prismaService.marketData.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isCarriedForward: false,
            state: 'CLOSE'
          })
        })
      );
    });

    it('keeps a cryptocurrency with a real market price of yesterday on Sunday', async () => {
      jest.useFakeTimers().setSystemTime(parseDate('2026-08-23').getTime());

      prismaService.marketData.groupBy.mockResolvedValue([
        {
          _max: { date: parseDate('2026-08-22') },
          dataSource: 'COINGECKO',
          symbol: 'bitcoin'
        },
        {
          _max: { date: parseDate('2026-08-21') },
          dataSource: 'YAHOO',
          symbol: 'AAPL'
        }
      ]);

      const assetProfileIdentifiers =
        await dataGatheringService[
          'getAssetProfileIdentifiersWithRecentMarketData'
        ]();

      expect(assetProfileIdentifiers).toEqual([
        { dataSource: 'COINGECKO', symbol: 'bitcoin' }
      ]);
    });

    it('drops a stock with a real market price of Friday on Monday', async () => {
      jest.useFakeTimers().setSystemTime(parseDate('2026-08-24').getTime());

      prismaService.marketData.groupBy.mockResolvedValue([
        {
          _max: { date: parseDate('2026-08-23') },
          dataSource: 'COINGECKO',
          symbol: 'bitcoin'
        },
        {
          _max: { date: parseDate('2026-08-21') },
          dataSource: 'YAHOO',
          symbol: 'AAPL'
        }
      ]);

      const assetProfileIdentifiers =
        await dataGatheringService[
          'getAssetProfileIdentifiersWithRecentMarketData'
        ]();

      expect(assetProfileIdentifiers).toEqual([
        { dataSource: 'COINGECKO', symbol: 'bitcoin' }
      ]);
    });

    it('drops a stock with a late Friday close on Saturday', async () => {
      jest.useFakeTimers().setSystemTime(parseDate('2026-08-22').getTime());

      prismaService.marketData.groupBy.mockResolvedValue([
        {
          _max: { date: parseDate('2026-08-20') },
          dataSource: 'YAHOO',
          symbol: 'AAPL'
        },
        {
          _max: { date: parseDate('2026-08-21') },
          dataSource: 'YAHOO',
          symbol: 'MSFT'
        }
      ]);

      const assetProfileIdentifiers =
        await dataGatheringService[
          'getAssetProfileIdentifiersWithRecentMarketData'
        ]();

      expect(assetProfileIdentifiers).toEqual([
        { dataSource: 'YAHOO', symbol: 'MSFT' }
      ]);
    });
  });

  describe('gatherRecentMarketData', () => {
    it('expires completed jobs which are older than the cooldown', async () => {
      jest
        .spyOn(dataGatheringService as any, 'getCurrencies7D')
        .mockResolvedValue([]);
      jest
        .spyOn(dataGatheringService as any, 'getSymbols7D')
        .mockResolvedValue([]);

      await dataGatheringService.gatherRecentMarketData();

      expect(dataGatheringQueue.clean).toHaveBeenCalledWith(
        GATHER_HISTORICAL_MARKET_DATA_COOLDOWN_IN_MS,
        'completed'
      );
    });

    it('retains completed jobs for the duration of the cooldown', () => {
      expect(
        GATHER_HISTORICAL_MARKET_DATA_PROCESS_JOB_OPTIONS.removeOnComplete
      ).toEqual({
        age: GATHER_HISTORICAL_MARKET_DATA_COOLDOWN_IN_MS / 1000
      });
    });
  });

  describe('gatherSymbolForDate', () => {
    it('resets isCarriedForward on a previously carried forward market price', async () => {
      dataProviderService.getHistoricalRaw.mockResolvedValue({
        'YAHOO-AAPL': {
          '2026-08-22': { marketPrice: 100 }
        }
      });

      await dataGatheringService.gatherSymbolForDate({
        dataSource: 'YAHOO',
        date: parseDate('2026-08-22'),
        symbol: 'AAPL'
      });

      expect(prismaService.marketData.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({ isCarriedForward: false }),
          update: { marketPrice: 100, isCarriedForward: false }
        })
      );
    });
  });
});
