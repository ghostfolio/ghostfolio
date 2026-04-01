import { AssetClass, DataSource } from '@prisma/client';

import { MarketSentimentService } from './market-sentiment.service';

describe('MarketSentimentService', () => {
  const configurationService = {
    get: jest.fn((key: string) => {
      const values = {
        API_KEY_ADANOS: 'sk_live_test',
        CACHE_MARKET_SENTIMENT_TTL: 1000,
        REQUEST_TIMEOUT: 5000
      };

      return values[key];
    })
  };
  const redisCacheService = {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined)
  };

  let marketSentimentService: MarketSentimentService;

  beforeEach(() => {
    jest.clearAllMocks();
    configurationService.get.mockImplementation((key: string) => {
      const values = {
        API_KEY_ADANOS: 'sk_live_test',
        CACHE_MARKET_SENTIMENT_TTL: 1000,
        REQUEST_TIMEOUT: 5000
      };

      return values[key];
    });
    global.fetch = jest.fn().mockImplementation((url: URL | string) => {
      const href = url.toString();

      if (href.includes('/reddit/')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            stocks: [
              {
                bullish_pct: 66,
                buzz_score: 64.2,
                mentions: 140,
                ticker: 'AAPL',
                trend: 'rising'
              }
            ]
          }),
          status: 200,
          statusText: 'OK'
        });
      }

      if (href.includes('/x/')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            stocks: [
              {
                bullish_pct: 61,
                buzz_score: 58.1,
                mentions: 210,
                ticker: 'AAPL',
                trend: 'stable'
              }
            ]
          }),
          status: 200,
          statusText: 'OK'
        });
      }

      if (href.includes('/news/')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            stocks: [
              {
                bullish_pct: 63,
                buzz_score: 55.5,
                mentions: 34,
                ticker: 'AAPL',
                trend: 'rising'
              }
            ]
          }),
          status: 200,
          statusText: 'OK'
        });
      }

      return Promise.resolve({
        ok: true,
        json: async () => ({
          stocks: [
            {
              bullish_pct: 68,
              buzz_score: 49.8,
              ticker: 'AAPL',
              trade_count: 12,
              trend: 'stable'
            }
          ]
        }),
        status: 200,
        statusText: 'OK'
      });
    }) as typeof fetch;

    marketSentimentService = new MarketSentimentService(
      configurationService as never,
      redisCacheService as never
    );
  });

  it('returns no data when the API key is missing', async () => {
    configurationService.get.mockImplementation((key: string) => {
      return key === 'API_KEY_ADANOS' ? '' : 1000;
    });

    expect(
      await marketSentimentService.getWatchlistMarketSentiment([
        {
          assetClass: AssetClass.EQUITY,
          dataSource: DataSource.YAHOO,
          name: 'Apple',
          symbol: 'AAPL'
        } as never
      ])
    ).toEqual([]);
  });

  it('returns no data for an empty holding profile', async () => {
    await expect(
      marketSentimentService.getHoldingMarketSentiment(undefined)
    ).resolves.toBeUndefined();
  });

  it('aggregates per-source responses for supported watchlist items', async () => {
    const [sentimentItem] =
      await marketSentimentService.getWatchlistMarketSentiment([
        {
          assetClass: AssetClass.EQUITY,
          dataSource: DataSource.YAHOO,
          name: 'Apple',
          symbol: 'AAPL'
        } as never,
        {
          assetClass: AssetClass.COMMODITY,
          dataSource: DataSource.YAHOO,
          name: 'Bitcoin',
          symbol: 'BTC-USD'
        } as never
      ]);

    expect(global.fetch).toHaveBeenCalledTimes(4);
    expect(sentimentItem.symbol).toBe('AAPL');
    expect(sentimentItem.marketSentiment.averageBuzzScore).toBe(56.9);
    expect(sentimentItem.marketSentiment.averageBullishPct).toBe(64.5);
    expect(sentimentItem.marketSentiment.coverage).toBe(4);
    expect(sentimentItem.marketSentiment.sourceAlignment).toBe('ALIGNED');
  });

  it('splits large watchlists into compare batches of 10', async () => {
    const items = Array.from({ length: 11 }).map((_, index) => {
      return {
        assetClass: AssetClass.EQUITY,
        dataSource: DataSource.YAHOO,
        name: `Stock ${index}`,
        symbol: `A${index}`
      };
    });

    await marketSentimentService.getWatchlistMarketSentiment(items as never[]);

    expect(global.fetch).toHaveBeenCalledTimes(8);
  });
});
