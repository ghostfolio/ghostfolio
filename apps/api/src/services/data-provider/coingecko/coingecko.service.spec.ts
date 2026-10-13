import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';
import { FetchService } from '@ghostfolio/api/services/fetch/fetch.service';

import { Test } from '@nestjs/testing';
import { AssetClass, AssetSubClass, DataSource } from '@prisma/client';

import { CoinGeckoService } from './coingecko.service';

jest.mock(
  '@ghostfolio/api/services/configuration/configuration.service',
  () => {
    return { ConfigurationService: class ConfigurationService {} };
  }
);

jest.mock('@ghostfolio/api/services/fetch/fetch.service', () => {
  return { FetchService: class FetchService {} };
});

describe('CoinGeckoService', () => {
  let configuration: Record<string, string | number>;
  let fetchService: { fetch: jest.Mock };
  let service: CoinGeckoService;

  beforeEach(async () => {
    configuration = {
      API_KEY_COINGECKO_DEMO: '',
      API_KEY_COINGECKO_PRO: '',
      REQUEST_TIMEOUT: 5000
    };
    fetchService = { fetch: jest.fn() };

    const module = await Test.createTestingModule({
      providers: [
        CoinGeckoService,
        {
          provide: ConfigurationService,
          useValue: {
            get: (key: string) => {
              return configuration[key];
            }
          }
        },
        { provide: FetchService, useValue: fetchService }
      ]
    }).compile();

    service = module.get(CoinGeckoService);
    await module.init();
  });

  describe('search', () => {
    it('offers EUR assets alongside existing USD assets for each search result', async () => {
      fetchService.fetch.mockResolvedValue({
        json: async () => {
          return {
            coins: [
              { id: 'bitcoin', name: 'Bitcoin' },
              { id: 'wrapped-bitcoin', name: 'Wrapped Bitcoin' }
            ]
          };
        }
      });

      const { items } = await service.search({ query: 'bitcoin' });
      const url = new URL(fetchService.fetch.mock.calls[0][0]);

      expect(url.pathname).toBe('/api/v3/search');
      expect(url.searchParams.get('query')).toBe('bitcoin');
      expect(items).toHaveLength(4);
      expect(items).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            currency: 'USD',
            name: 'Bitcoin',
            symbol: 'bitcoin'
          }),
          expect.objectContaining({
            assetClass: AssetClass.LIQUIDITY,
            assetSubClass: AssetSubClass.CRYPTOCURRENCY,
            currency: 'EUR',
            dataSource: DataSource.COINGECKO,
            name: 'Bitcoin',
            symbol: 'bitcoin-EUR'
          }),
          expect.objectContaining({
            currency: 'USD',
            name: 'Wrapped Bitcoin',
            symbol: 'wrapped-bitcoin'
          }),
          expect.objectContaining({
            currency: 'EUR',
            name: 'Wrapped Bitcoin',
            symbol: 'wrapped-bitcoin-EUR'
          })
        ])
      );
    });

    it('searches the coin ID when the query includes the EUR suffix', async () => {
      fetchService.fetch.mockResolvedValue({
        json: async () => {
          return { coins: [{ id: 'bitcoin', name: 'Bitcoin' }] };
        }
      });

      const { items } = await service.search({ query: 'bitcoin-EUR' });
      const url = new URL(fetchService.fetch.mock.calls[0][0]);

      expect(url.searchParams.get('query')).toBe('bitcoin');
      expect(items).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ currency: 'EUR', symbol: 'bitcoin-EUR' })
        ])
      );
    });
  });

  describe('getAssetProfile', () => {
    it.each([
      { currency: 'USD', id: 'bitcoin', symbol: 'bitcoin' },
      { currency: 'EUR', id: 'bitcoin', symbol: 'bitcoin-EUR' },
      {
        currency: 'USD',
        id: 'wrapped-bitcoin',
        symbol: 'wrapped-bitcoin'
      },
      {
        currency: 'EUR',
        id: 'wrapped-bitcoin',
        symbol: 'wrapped-bitcoin-EUR'
      }
    ])(
      'loads $symbol with its $currency currency',
      async ({ currency, id, symbol }) => {
        fetchService.fetch.mockResolvedValue({
          json: async () => {
            return { name: 'Bitcoin' };
          }
        });

        const profile = await service.getAssetProfile({ symbol });

        expect(fetchService.fetch).toHaveBeenCalledWith(
          `https://api.coingecko.com/api/v3/coins/${id}`,
          expect.any(Object)
        );
        expect(profile).toEqual({
          currency,
          symbol,
          assetClass: AssetClass.LIQUIDITY,
          assetSubClass: AssetSubClass.CRYPTOCURRENCY,
          dataSource: DataSource.COINGECKO,
          name: 'Bitcoin'
        });
      }
    );
  });

  describe('getHistorical', () => {
    it.each([
      { currency: 'usd', marketPrice: 70000, symbol: 'bitcoin' },
      { currency: 'eur', marketPrice: 65000, symbol: 'bitcoin-EUR' }
    ])(
      'loads $symbol history in $currency',
      async ({ currency, marketPrice, symbol }) => {
        const from = new Date('2024-01-01T00:00:00Z');
        const to = new Date('2024-01-02T00:00:00Z');
        fetchService.fetch.mockResolvedValue({
          json: async () => {
            return {
              prices: [
                [from.getTime(), marketPrice],
                [to.getTime(), marketPrice + 100]
              ]
            };
          }
        });

        const history = await service.getHistorical({ from, symbol, to });
        const url = new URL(fetchService.fetch.mock.calls[0][0]);

        expect(url.pathname).toBe('/api/v3/coins/bitcoin/market_chart/range');
        expect(url.searchParams.get('vs_currency')).toBe(currency);
        expect(url.searchParams.get('from')).toBe(`${from.getTime() / 1000}`);
        expect(url.searchParams.get('to')).toBe(`${to.getTime() / 1000}`);
        expect(history).toEqual({
          '2024-01-01': { marketPrice },
          '2024-01-02': { marketPrice: marketPrice + 100 }
        });
      }
    );
  });

  describe('getQuotes', () => {
    it('keeps USD and EUR prices separate while requesting each coin ID once', async () => {
      fetchService.fetch.mockResolvedValue({
        json: async () => {
          return {
            bitcoin: { eur: 65000, usd: 70000 },
            ethereum: { eur: 3000, usd: 3200 }
          };
        }
      });

      const quotes = await service.getQuotes({
        symbols: ['bitcoin', 'bitcoin-EUR', 'ethereum-EUR']
      });
      const url = new URL(fetchService.fetch.mock.calls[0][0]);

      expect(fetchService.fetch).toHaveBeenCalledTimes(1);
      expect(url.pathname).toBe('/api/v3/simple/price');
      expect(url.searchParams.get('ids').split(',').sort()).toEqual([
        'bitcoin',
        'ethereum'
      ]);
      expect(url.searchParams.get('vs_currencies').split(',').sort()).toEqual([
        'eur',
        'usd'
      ]);
      expect(Object.keys(quotes).sort()).toEqual([
        'bitcoin',
        'bitcoin-EUR',
        'ethereum-EUR'
      ]);
      expect(quotes).toMatchObject({
        bitcoin: {
          currency: 'USD',
          dataSource: DataSource.COINGECKO,
          marketPrice: 70000,
          marketState: 'open'
        },
        'bitcoin-EUR': {
          currency: 'EUR',
          dataSource: DataSource.COINGECKO,
          marketPrice: 65000,
          marketState: 'open'
        },
        'ethereum-EUR': {
          currency: 'EUR',
          marketPrice: 3000
        }
      });
    });

    it('continues requesting USD for legacy coin IDs', async () => {
      fetchService.fetch.mockResolvedValue({
        json: async () => {
          return { bitcoin: { usd: 70000 }, 'wrapped-bitcoin': { usd: 69900 } };
        }
      });

      const quotes = await service.getQuotes({
        symbols: ['bitcoin', 'wrapped-bitcoin']
      });
      const url = new URL(fetchService.fetch.mock.calls[0][0]);

      expect(url.searchParams.get('ids')).toBe('bitcoin,wrapped-bitcoin');
      expect(url.searchParams.get('vs_currencies')).toBe('usd');
      expect(quotes).toMatchObject({
        bitcoin: { currency: 'USD', marketPrice: 70000 },
        'wrapped-bitcoin': { currency: 'USD', marketPrice: 69900 }
      });
    });

    it.each([undefined, null, '65000'])(
      'skips EUR prices that are unavailable or non-numeric (%s)',
      async (marketPrice) => {
        fetchService.fetch.mockResolvedValue({
          json: async () => {
            return { bitcoin: { eur: marketPrice, usd: 70000 } };
          }
        });

        const quotes = await service.getQuotes({
          symbols: ['bitcoin', 'bitcoin-EUR', 'ethereum-EUR']
        });

        expect(Object.keys(quotes)).toEqual(['bitcoin']);
        expect(quotes.bitcoin).toMatchObject({
          currency: 'USD',
          marketPrice: 70000
        });
      }
    );
  });

  describe('API keys', () => {
    it.each([
      {
        configurationKey: 'API_KEY_COINGECKO_DEMO',
        header: 'x-cg-demo-api-key',
        hostname: 'api.coingecko.com'
      },
      {
        configurationKey: 'API_KEY_COINGECKO_PRO',
        header: 'x-cg-pro-api-key',
        hostname: 'pro-api.coingecko.com'
      }
    ])(
      'preserves $configurationKey for EUR requests',
      async ({ configurationKey, header, hostname }) => {
        configuration[configurationKey] = 'test-api-key';
        service.onModuleInit();
        fetchService.fetch.mockResolvedValue({
          json: async () => {
            return { bitcoin: { eur: 65000 } };
          }
        });

        const quotes = await service.getQuotes({ symbols: ['bitcoin-EUR'] });
        const [input, options] = fetchService.fetch.mock.calls[0];
        const url = new URL(input);

        expect(url.hostname).toBe(hostname);
        expect(url.searchParams.get('ids')).toBe('bitcoin');
        expect(url.searchParams.get('vs_currencies')).toBe('eur');
        expect(options.headers).toEqual({ [header]: 'test-api-key' });
        expect(quotes['bitcoin-EUR']).toMatchObject({
          currency: 'EUR',
          marketPrice: 65000
        });
      }
    );
  });
});
