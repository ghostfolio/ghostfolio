import { DataGatheringItem } from '@ghostfolio/api/services/interfaces/interfaces';
import {
  getAssetProfileIdentifier,
  parseDate
} from '@ghostfolio/common/helper';

import { DataSource } from '@prisma/client';
import { Job } from 'bull';

import { DataGatheringProcessor } from './data-gathering.processor';

describe('DataGatheringProcessor', () => {
  let dataGatheringProcessor: DataGatheringProcessor;
  let dataProviderService: { getHistoricalRaw: jest.Mock };
  let marketDataService: { replaceForSymbol: jest.Mock; updateMany: jest.Mock };

  const createJob = ({
    dataSource,
    date,
    symbol
  }: {
    dataSource: DataSource;
    date: string;
    symbol: string;
  }) => {
    return {
      data: {
        dataSource,
        symbol,
        date: parseDate(date).toISOString()
      }
    } as unknown as Job<DataGatheringItem>;
  };

  const mockHistoricalData = ({
    dataSource,
    prices,
    symbol
  }: {
    dataSource: DataSource;
    prices: { [date: string]: number };
    symbol: string;
  }) => {
    const assetProfileIdentifier = getAssetProfileIdentifier({
      dataSource,
      symbol
    });

    const historicalData: {
      [symbol: string]: { [date: string]: { marketPrice: number } };
    } = { [assetProfileIdentifier]: {} };

    for (const [date, marketPrice] of Object.entries(prices)) {
      historicalData[assetProfileIdentifier][date] = { marketPrice };
    }

    dataProviderService.getHistoricalRaw.mockResolvedValue(historicalData);
  };

  beforeAll(() => {
    jest.useFakeTimers().setSystemTime(parseDate('2026-08-24').getTime());
  });

  beforeEach(() => {
    dataProviderService = { getHistoricalRaw: jest.fn() };
    marketDataService = {
      replaceForSymbol: jest.fn(),
      updateMany: jest.fn()
    };

    dataGatheringProcessor = new DataGatheringProcessor(
      null,
      dataProviderService as any,
      marketDataService as any,
      null
    );
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('writes an all-real series without carried forward market prices', async () => {
    mockHistoricalData({
      dataSource: 'COINGECKO',
      symbol: 'bitcoin',
      prices: {
        '2026-08-17': 1,
        '2026-08-18': 2,
        '2026-08-19': 3,
        '2026-08-20': 4,
        '2026-08-21': 5,
        '2026-08-22': 6,
        '2026-08-23': 7
      }
    });

    await dataGatheringProcessor.gatherHistoricalMarketData(
      createJob({
        dataSource: 'COINGECKO',
        date: '2026-08-17',
        symbol: 'bitcoin'
      })
    );

    const { data } = marketDataService.updateMany.mock.calls[0][0];

    expect(data).toHaveLength(7);
    expect(
      data.every(({ isCarriedForward }) => {
        return isCarriedForward === false;
      })
    ).toBe(true);
  });

  it('fills an interior gap with carried forward market prices', async () => {
    mockHistoricalData({
      dataSource: 'YAHOO',
      symbol: 'AAPL',
      prices: {
        '2026-08-17': 1,
        '2026-08-18': 2,
        '2026-08-21': 5,
        '2026-08-22': 6,
        '2026-08-23': 7
      }
    });

    await dataGatheringProcessor.gatherHistoricalMarketData(
      createJob({ dataSource: 'YAHOO', date: '2026-08-17', symbol: 'AAPL' })
    );

    const { data } = marketDataService.updateMany.mock.calls[0][0];

    expect(data).toEqual([
      expect.objectContaining({
        date: parseDate('2026-08-17'),
        isCarriedForward: false,
        marketPrice: 1
      }),
      expect.objectContaining({
        date: parseDate('2026-08-18'),
        isCarriedForward: false,
        marketPrice: 2
      }),
      expect.objectContaining({
        date: parseDate('2026-08-19'),
        isCarriedForward: true,
        marketPrice: 2
      }),
      expect.objectContaining({
        date: parseDate('2026-08-20'),
        isCarriedForward: true,
        marketPrice: 2
      }),
      expect.objectContaining({
        date: parseDate('2026-08-21'),
        isCarriedForward: false,
        marketPrice: 5
      }),
      expect.objectContaining({
        date: parseDate('2026-08-22'),
        isCarriedForward: false,
        marketPrice: 6
      }),
      expect.objectContaining({
        date: parseDate('2026-08-23'),
        isCarriedForward: false,
        marketPrice: 7
      })
    ]);
  });

  it('fills a trailing gap with carried forward market prices', async () => {
    mockHistoricalData({
      dataSource: 'YAHOO',
      symbol: 'AAPL',
      prices: {
        '2026-08-17': 1,
        '2026-08-18': 2,
        '2026-08-19': 3,
        '2026-08-20': 4,
        '2026-08-21': 5
      }
    });

    await dataGatheringProcessor.gatherHistoricalMarketData(
      createJob({ dataSource: 'YAHOO', date: '2026-08-17', symbol: 'AAPL' })
    );

    const { data } = marketDataService.updateMany.mock.calls[0][0];

    expect(data).toHaveLength(7);
    expect(data.slice(5)).toEqual([
      expect.objectContaining({
        date: parseDate('2026-08-22'),
        isCarriedForward: true,
        marketPrice: 5
      }),
      expect.objectContaining({
        date: parseDate('2026-08-23'),
        isCarriedForward: true,
        marketPrice: 5
      })
    ]);
  });

  it('does not fill a leading gap', async () => {
    mockHistoricalData({
      dataSource: 'YAHOO',
      symbol: 'AAPL',
      prices: {
        '2026-08-19': 3,
        '2026-08-20': 4,
        '2026-08-21': 5,
        '2026-08-22': 6,
        '2026-08-23': 7
      }
    });

    await dataGatheringProcessor.gatherHistoricalMarketData(
      createJob({ dataSource: 'YAHOO', date: '2026-08-17', symbol: 'AAPL' })
    );

    const { data } = marketDataService.updateMany.mock.calls[0][0];

    expect(data).toHaveLength(5);
    expect(data[0]).toEqual(
      expect.objectContaining({
        date: parseDate('2026-08-19'),
        isCarriedForward: false,
        marketPrice: 3
      })
    );
  });

  it('labels a market price of 0 from the data provider as carried forward', async () => {
    mockHistoricalData({
      dataSource: 'YAHOO',
      symbol: 'AAPL',
      prices: {
        '2026-08-17': 1,
        '2026-08-18': 2,
        '2026-08-19': 0,
        '2026-08-20': 4,
        '2026-08-21': 5,
        '2026-08-22': 6,
        '2026-08-23': 7
      }
    });

    await dataGatheringProcessor.gatherHistoricalMarketData(
      createJob({ dataSource: 'YAHOO', date: '2026-08-17', symbol: 'AAPL' })
    );

    const { data } = marketDataService.updateMany.mock.calls[0][0];

    expect(data[2]).toEqual(
      expect.objectContaining({
        date: parseDate('2026-08-19'),
        isCarriedForward: true,
        marketPrice: 2
      })
    );
  });
});
