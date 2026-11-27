import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';
import { FetchService } from '@ghostfolio/api/services/fetch/fetch.service';

import { Logger } from '@nestjs/common';

import { CoinGeckoService } from './coingecko.service';

jest.mock('@ghostfolio/api/services/fetch/fetch.service', () => {
  return {
    FetchService: jest.fn()
  };
});

const ERROR_MESSAGE_OF_PUBLIC_API =
  'Your request exceeds the allowed time range. Public API users are limited to querying historical data within the past 365 days.';

const NOW = new Date('2026-11-27T12:00:00.000Z');

const getUnixTimeOf = (date: string) => {
  return new Date(date).getTime() / 1000;
};

describe('CoinGeckoService', () => {
  let fetchService: { fetch: jest.Mock };

  const createCoinGeckoService = (
    configuration: { [key: string]: number | string } = {}
  ) => {
    const coinGeckoService = new CoinGeckoService(
      {
        get: (key: string) => {
          return { REQUEST_TIMEOUT: 3000, ...configuration }[key] ?? '';
        }
      } as unknown as ConfigurationService,
      fetchService as unknown as FetchService
    );

    coinGeckoService.onModuleInit();

    return coinGeckoService;
  };

  const getRequestedRange = () => {
    const url = new URL(fetchService.fetch.mock.calls[0][0]);

    return {
      from: Number(url.searchParams.get('from')),
      to: Number(url.searchParams.get('to')),
      url: `${url.origin}${url.pathname}`
    };
  };

  beforeEach(() => {
    jest.useFakeTimers({ now: NOW });
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();

    // Respond like the public API which rejects requests starting more than
    // 365 days in the past
    fetchService = {
      fetch: jest.fn((url: string) => {
        const { searchParams } = new URL(url);

        const isAllowedTimeRange =
          url.startsWith('https://pro-api.coingecko.com') ||
          Number(searchParams.get('from')) >=
            getUnixTimeOf('2025-11-27T00:00:00.000Z');

        return Promise.resolve(
          Response.json(
            isAllowedTimeRange
              ? {
                  prices: [
                    [new Date('2026-11-25T00:00:00.000Z').getTime(), 90000],
                    [new Date('2026-11-26T00:00:00.000Z').getTime(), 91000]
                  ]
                }
              : {
                  error: {
                    status: {
                      error_code: 10012,
                      error_message: ERROR_MESSAGE_OF_PUBLIC_API
                    }
                  }
                }
          )
        );
      })
    };
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  describe('getHistorical', () => {
    it.each([
      { configuration: {}, description: 'without an API key' },
      {
        configuration: { API_KEY_COINGECKO_DEMO: 'demo-api-key' },
        description: 'with a demo API key'
      }
    ])(
      'should limit the request to the past 365 days $description',
      async ({ configuration }) => {
        const coinGeckoService = createCoinGeckoService(configuration);

        const historicalData = await coinGeckoService.getHistorical({
          from: new Date('2015-07-20T00:00:00.000Z'),
          symbol: 'ethereum',
          to: NOW
        });

        expect(getRequestedRange()).toEqual({
          from: getUnixTimeOf('2025-11-27T12:00:00.000Z'),
          to: getUnixTimeOf('2026-11-27T12:00:00.000Z'),
          url: 'https://api.coingecko.com/api/v3/coins/ethereum/market_chart/range'
        });

        expect(historicalData).toEqual({
          '2026-11-25': { marketPrice: 90000 },
          '2026-11-26': { marketPrice: 91000 }
        });

        expect(Logger.prototype.warn).toHaveBeenCalledTimes(1);
      }
    );

    it('should not limit a request within the past 365 days without a pro API key', async () => {
      const coinGeckoService = createCoinGeckoService();

      await coinGeckoService.getHistorical({
        from: new Date('2026-06-01T00:00:00.000Z'),
        symbol: 'ethereum',
        to: NOW
      });

      expect(getRequestedRange()).toMatchObject({
        from: getUnixTimeOf('2026-06-01T00:00:00.000Z'),
        to: getUnixTimeOf('2026-11-27T12:00:00.000Z')
      });

      expect(Logger.prototype.warn).not.toHaveBeenCalled();
    });

    it('should not request a time range older than 365 days without a pro API key', async () => {
      const coinGeckoService = createCoinGeckoService();

      const historicalData = await coinGeckoService.getHistorical({
        from: new Date('2020-01-01T00:00:00.000Z'),
        symbol: 'ethereum',
        to: new Date('2020-01-01T00:00:00.000Z')
      });

      expect(fetchService.fetch).not.toHaveBeenCalled();
      expect(historicalData).toEqual({});
    });

    it('should not limit the request with a pro API key', async () => {
      const coinGeckoService = createCoinGeckoService({
        API_KEY_COINGECKO_PRO: 'pro-api-key'
      });

      const historicalData = await coinGeckoService.getHistorical({
        from: new Date('2015-07-20T00:00:00.000Z'),
        symbol: 'ethereum',
        to: NOW
      });

      expect(getRequestedRange()).toEqual({
        from: getUnixTimeOf('2015-07-20T00:00:00.000Z'),
        to: getUnixTimeOf('2026-11-27T12:00:00.000Z'),
        url: 'https://pro-api.coingecko.com/api/v3/coins/ethereum/market_chart/range'
      });

      expect(historicalData).toEqual({
        '2026-11-25': { marketPrice: 90000 },
        '2026-11-26': { marketPrice: 91000 }
      });

      expect(Logger.prototype.warn).not.toHaveBeenCalled();
    });

    it('should throw the error message of the data provider', async () => {
      fetchService.fetch.mockResolvedValue(
        Response.json({
          status: {
            error_code: 429,
            error_message: "You've exceeded the Rate Limit."
          }
        })
      );

      const coinGeckoService = createCoinGeckoService();

      await expect(
        coinGeckoService.getHistorical({
          from: new Date('2026-06-01T00:00:00.000Z'),
          symbol: 'ethereum',
          to: NOW
        })
      ).rejects.toThrow("[Error] You've exceeded the Rate Limit.");
    });
  });
});
