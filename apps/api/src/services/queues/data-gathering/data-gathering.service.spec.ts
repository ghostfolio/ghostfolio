import {
  DATA_GATHERING_QUEUE_PRIORITY_HIGH,
  GATHER_HISTORICAL_MARKET_DATA_COOLDOWN_IN_MS
} from '@ghostfolio/common/config';
import { parseDate } from '@ghostfolio/common/helper';

import { DataGatheringService } from './data-gathering.service';

describe('DataGatheringService', () => {
  let dataGatheringQueue: { addBulk: jest.Mock; clean: jest.Mock };
  let dataGatheringService: DataGatheringService;
  let dataProviderService: {
    getAssetProfiles: jest.Mock;
    getHistoricalRaw: jest.Mock;
  };
  let prismaService: {
    marketData: { groupBy: jest.Mock; upsert: jest.Mock };
    symbolProfile: { upsert: jest.Mock };
  };
  let symbolProfileService: { getSymbolProfiles: jest.Mock };

  beforeEach(() => {
    dataGatheringQueue = {
      addBulk: jest.fn().mockResolvedValue([]),
      clean: jest.fn().mockResolvedValue([])
    };
    dataProviderService = {
      getAssetProfiles: jest.fn(),
      getHistoricalRaw: jest.fn()
    };
    prismaService = {
      marketData: {
        groupBy: jest.fn().mockResolvedValue([]),
        upsert: jest.fn().mockResolvedValue({})
      },
      symbolProfile: {
        upsert: jest.fn().mockResolvedValue({})
      }
    };
    symbolProfileService = {
      getSymbolProfiles: jest.fn().mockResolvedValue([])
    };

    dataGatheringService = new DataGatheringService(
      [],
      dataGatheringQueue as any,
      dataProviderService as any,
      null,
      null,
      prismaService as any,
      null,
      symbolProfileService as any
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('gatherAssetProfiles', () => {
    const assetProfileIdentifier = { dataSource: 'YAHOO', symbol: 'VWCE.DE' };

    it('keeps the stored lists if the lists of the asset profile are empty', async () => {
      dataProviderService.getAssetProfiles.mockResolvedValue({
        'VWCE.DE': {
          ...assetProfileIdentifier,
          countries: [],
          holdings: [],
          sectors: []
        }
      });

      await dataGatheringService.gatherAssetProfiles([
        assetProfileIdentifier as any
      ]);

      const { create, update } =
        prismaService.symbolProfile.upsert.mock.calls[0][0];

      expect(create.holdings).toEqual([]);
      expect(update.countries).toBeUndefined();
      expect(update.holdings).toBeUndefined();
      expect(update.sectors).toBeUndefined();
    });

    it('updates the stored lists if the lists of the asset profile have items', async () => {
      const countries = [{ code: 'US', weight: 1 }];
      const holdings = [{ name: 'NVIDIA Corp.', weight: 0.05 }];
      const sectors = [{ name: 'Technology', weight: 1 }];

      dataProviderService.getAssetProfiles.mockResolvedValue({
        'VWCE.DE': {
          ...assetProfileIdentifier,
          countries,
          holdings,
          sectors
        }
      });

      await dataGatheringService.gatherAssetProfiles([
        assetProfileIdentifier as any
      ]);

      const { update } = prismaService.symbolProfile.upsert.mock.calls[0][0];

      expect(update).toEqual(
        expect.objectContaining({ countries, holdings, sectors })
      );
    });
  });

  describe('getAssetProfileIdentifiersWithRecentMarketData', () => {
    it('queries real market prices since the start of yesterday (UTC)', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-08-24T14:00:00.000Z'));

      await dataGatheringService[
        'getAssetProfileIdentifiersWithRecentMarketData'
      ]();

      expect(prismaService.marketData.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            date: { gte: new Date('2026-08-23T00:00:00.000Z') },
            isCarriedForward: false,
            state: 'CLOSE'
          }
        })
      );
    });

    it('includes the Friday close when it runs on Saturday', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-08-22T14:00:00.000Z'));

      await dataGatheringService[
        'getAssetProfileIdentifiersWithRecentMarketData'
      ]();

      expect(prismaService.marketData.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            date: { gte: new Date('2026-08-21T00:00:00.000Z') }
          })
        })
      );
    });

    it('excludes the Friday close when it runs on Sunday', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-08-23T14:00:00.000Z'));

      await dataGatheringService[
        'getAssetProfileIdentifiersWithRecentMarketData'
      ]();

      expect(prismaService.marketData.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            date: { gte: new Date('2026-08-22T00:00:00.000Z') }
          })
        })
      );
    });

    it('maps the query result to asset profile identifiers', async () => {
      prismaService.marketData.groupBy.mockResolvedValue([
        { dataSource: 'COINGECKO', symbol: 'bitcoin' },
        { dataSource: 'YAHOO', symbol: 'AAPL' }
      ]);

      const assetProfileIdentifiers =
        await dataGatheringService[
          'getAssetProfileIdentifiersWithRecentMarketData'
        ]();

      expect(assetProfileIdentifiers).toEqual([
        { dataSource: 'COINGECKO', symbol: 'bitcoin' },
        { dataSource: 'YAHOO', symbol: 'AAPL' }
      ]);
    });
  });

  describe('gatherRecentMarketData', () => {
    it('queries the asset profiles with recent market data once and reuses them', async () => {
      const assetProfileIdentifiersWithRecentMarketData = [
        { dataSource: 'COINGECKO', symbol: 'bitcoin' }
      ];

      prismaService.marketData.groupBy.mockResolvedValue(
        assetProfileIdentifiersWithRecentMarketData
      );

      const getCurrencies7D = jest
        .spyOn(dataGatheringService as any, 'getCurrencies7D')
        .mockReturnValue([]);
      const getSymbols7D = jest
        .spyOn(dataGatheringService as any, 'getSymbols7D')
        .mockResolvedValue([]);

      await dataGatheringService.gatherRecentMarketData();

      expect(prismaService.marketData.groupBy).toHaveBeenCalledTimes(1);

      expect(getCurrencies7D).toHaveBeenCalledWith({
        assetProfileIdentifiersWithRecentMarketData
      });

      expect(getSymbols7D).toHaveBeenCalledWith({
        assetProfileIdentifiersWithRecentMarketData,
        withUserSubscription: true
      });

      expect(getSymbols7D).toHaveBeenCalledWith({
        assetProfileIdentifiersWithRecentMarketData,
        withUserSubscription: false
      });
    });

    it('expires completed jobs which are older than the cooldown', async () => {
      jest
        .spyOn(dataGatheringService as any, 'getCurrencies7D')
        .mockReturnValue([]);
      jest
        .spyOn(dataGatheringService as any, 'getSymbols7D')
        .mockResolvedValue([]);

      await dataGatheringService.gatherRecentMarketData();

      expect(dataGatheringQueue.clean).toHaveBeenCalledWith(
        GATHER_HISTORICAL_MARKET_DATA_COOLDOWN_IN_MS,
        'completed'
      );
    });

    it('retains its completed jobs for the duration of the cooldown', async () => {
      jest
        .spyOn(dataGatheringService as any, 'getCurrencies7D')
        .mockReturnValue([
          {
            dataSource: 'YAHOO',
            date: parseDate('2026-08-01'),
            symbol: 'AAPL'
          }
        ]);
      jest
        .spyOn(dataGatheringService as any, 'getSymbols7D')
        .mockResolvedValue([]);

      await dataGatheringService.gatherRecentMarketData();

      const [jobs] = dataGatheringQueue.addBulk.mock.calls[0];

      expect(jobs[0].opts.removeOnComplete).toEqual({
        age: GATHER_HISTORICAL_MARKET_DATA_COOLDOWN_IN_MS / 1000
      });
    });
  });

  describe('gatherSymbol', () => {
    beforeEach(() => {
      jest
        .spyOn(dataGatheringService as any, 'getSymbolsMax')
        .mockResolvedValue([
          {
            dataSource: 'YAHOO',
            date: parseDate('2026-08-01'),
            symbol: 'USDEUR'
          }
        ]);
    });

    it('does not apply the cooldown by default', async () => {
      await dataGatheringService.gatherSymbol({
        dataSource: 'YAHOO',
        symbol: 'USDEUR'
      });

      const [jobs] = dataGatheringQueue.addBulk.mock.calls[0];

      expect(jobs[0].opts.removeOnComplete).toBe(true);
    });

    it('retains its completed jobs for the duration of a given cooldown', async () => {
      await dataGatheringService.gatherSymbol({
        dataSource: 'YAHOO',
        removeOnComplete: {
          age: GATHER_HISTORICAL_MARKET_DATA_COOLDOWN_IN_MS / 1000
        },
        symbol: 'USDEUR'
      });

      const [jobs] = dataGatheringQueue.addBulk.mock.calls[0];

      expect(jobs[0].opts.removeOnComplete).toEqual({
        age: GATHER_HISTORICAL_MARKET_DATA_COOLDOWN_IN_MS / 1000
      });
    });
  });

  describe('gatherSymbols', () => {
    it('does not apply the cooldown to a manually triggered gathering', async () => {
      await dataGatheringService.gatherSymbols({
        dataGatheringItems: [
          {
            dataSource: 'YAHOO',
            date: parseDate('2026-08-01'),
            symbol: 'AAPL'
          }
        ],
        priority: DATA_GATHERING_QUEUE_PRIORITY_HIGH
      });

      const [jobs] = dataGatheringQueue.addBulk.mock.calls[0];

      expect(jobs[0].opts.removeOnComplete).toBe(true);
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
          update: { isCarriedForward: false, marketPrice: 100, state: 'CLOSE' }
        })
      );
    });

    it('sets the state to INTRADAY for today', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-08-22T14:00:00.000Z'));

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
          update: expect.objectContaining({ state: 'INTRADAY' })
        })
      );
    });

    it('returns the upserted market data', async () => {
      dataProviderService.getHistoricalRaw.mockResolvedValue({
        'YAHOO-AAPL': {
          '2026-08-22': { marketPrice: 100 }
        }
      });
      prismaService.marketData.upsert.mockResolvedValue({ marketPrice: 100 });

      const marketData = await dataGatheringService.gatherSymbolForDate({
        dataSource: 'YAHOO',
        date: parseDate('2026-08-22'),
        symbol: 'AAPL'
      });

      expect(marketData).toEqual({ marketPrice: 100 });
    });

    it('returns undefined if the data provider has no market price', async () => {
      dataProviderService.getHistoricalRaw.mockResolvedValue({});

      const marketData = await dataGatheringService.gatherSymbolForDate({
        dataSource: 'YAHOO',
        date: parseDate('2026-08-22'),
        symbol: 'AAPL'
      });

      expect(marketData).toBeUndefined();
    });
  });
});
