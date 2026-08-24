/**
 * @jest-environment <rootDir>/jest-environment-tz.js
 * @jest-environment-options {"timeZone": "Europe/Berlin"}
 */
import { DataGatheringService } from './data-gathering.service';

describe('DataGatheringService in a time zone with daylight saving time', () => {
  let dataGatheringQueue: { addBulk: jest.Mock; clean: jest.Mock };
  let dataGatheringService: DataGatheringService;
  let prismaService: { marketData: { groupBy: jest.Mock; upsert: jest.Mock } };

  beforeEach(() => {
    dataGatheringQueue = {
      addBulk: jest.fn().mockResolvedValue([]),
      clean: jest.fn().mockResolvedValue([])
    };
    prismaService = {
      marketData: {
        groupBy: jest.fn().mockResolvedValue([]),
        upsert: jest.fn().mockResolvedValue({})
      }
    };

    dataGatheringService = new DataGatheringService(
      null,
      dataGatheringQueue as any,
      { getHistoricalRaw: jest.fn() } as any,
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
    it('keeps a market price of yesterday when the clocks go forward', async () => {
      // The clocks in Berlin go forward on 2026-03-29, so a local day is 23 hours
      jest.useFakeTimers().setSystemTime(new Date('2026-03-29T23:00:00.000Z'));

      prismaService.marketData.groupBy.mockResolvedValue([
        {
          _max: { date: new Date('2026-03-28T00:00:00.000Z') },
          dataSource: 'COINGECKO',
          symbol: 'bitcoin'
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

    it('drops a market price of two days ago when the clocks go back', async () => {
      // The clocks in Berlin go back on 2026-10-25, so a local day is 25 hours
      jest.useFakeTimers().setSystemTime(new Date('2026-10-26T00:00:00.000Z'));

      prismaService.marketData.groupBy.mockResolvedValue([
        {
          _max: { date: new Date('2026-10-24T00:00:00.000Z') },
          dataSource: 'COINGECKO',
          symbol: 'bitcoin'
        }
      ]);

      const assetProfileIdentifiers =
        await dataGatheringService[
          'getAssetProfileIdentifiersWithRecentMarketData'
        ]();

      expect(assetProfileIdentifiers).toEqual([]);
    });
  });
});
