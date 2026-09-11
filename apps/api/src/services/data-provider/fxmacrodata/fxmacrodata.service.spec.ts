import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';
import { FetchService } from '@ghostfolio/api/services/fetch/fetch.service';

import { DataSource } from '@prisma/client';

import { FXMacroDataService } from './fxmacrodata.service';

// FetchService pulls in @openrouter/ai-sdk-provider, which ships ESM only and
// is not transformed for Jest. This suite injects its own stub, so the real
// implementation is never needed here.
jest.mock('@ghostfolio/api/services/fetch/fetch.service', () => {
  return { FetchService: class {} };
});

const SOURCES_RESPONSE = {
  sources: [{ served_pairs: ['EUR/USD', 'USD/JPY', 'GBP/USD'] }]
};

describe('FXMacroDataService', () => {
  let configurationService: ConfigurationService;
  let fetchService: FetchService;
  let fxMacroDataService: FXMacroDataService;
  let responses: { [url: string]: unknown };

  const jsonResponse = (body: unknown) => {
    return Promise.resolve({
      ok: true,
      json: () => {
        return Promise.resolve(body);
      }
    });
  };

  beforeEach(() => {
    responses = { 'fx/sources': SOURCES_RESPONSE };

    configurationService = {
      get: jest.fn((key: string) => {
        return key === 'API_KEY_FXMACRODATA' ? 'test-key' : 30_000;
      })
    } as unknown as ConfigurationService;

    fetchService = {
      fetch: jest.fn((url: string) => {
        const match = Object.keys(responses).find((path) => {
          return url.includes(path);
        });

        if (!match) {
          return Promise.resolve({ ok: false, status: 404 });
        }

        const body = responses[match];

        if (body instanceof Error) {
          return Promise.reject(body);
        }

        return jsonResponse(body);
      })
    } as unknown as FetchService;

    fxMacroDataService = new FXMacroDataService(
      configurationService,
      fetchService
    );
  });

  describe('canHandle', () => {
    it('handles currency pairs', () => {
      expect(fxMacroDataService.canHandle('EURUSD')).toBe(true);
    });

    it('leaves non-currency symbols to the other providers', () => {
      expect(fxMacroDataService.canHandle('AAPL')).toBe(false);
    });

    it('is disabled without an API key', () => {
      configurationService.get = jest.fn(() => {
        return '';
      }) as unknown as ConfigurationService['get'];

      expect(fxMacroDataService.canHandle('EURUSD')).toBe(false);
    });
  });

  describe('getName', () => {
    it('reports its data source', () => {
      expect(fxMacroDataService.getName()).toEqual(DataSource.FXMACRODATA);
    });
  });

  describe('getQuotes', () => {
    it('returns the latest rate of each requested pair', async () => {
      responses['forex/eur/usd'] = {
        data: [{ date: '2026-09-10', val: 1.16 }]
      };
      responses['forex/gbp/usd'] = {
        data: [{ date: '2026-09-10', val: 1.35 }]
      };

      const quotes = await fxMacroDataService.getQuotes({
        symbols: ['EURUSD', 'GBPUSD']
      });

      expect(quotes['EURUSD']).toEqual({
        currency: 'USD',
        dataSource: DataSource.FXMACRODATA,
        marketPrice: 1.16,
        marketState: 'open'
      });
      expect(quotes['GBPUSD'].marketPrice).toEqual(1.35);
    });

    it('asks for a pair in the direction wanted rather than inverting locally', async () => {
      // FXMacroData stores USD/JPY, not JPY/USD, and derives the inverse
      // itself, so the request must be for the wanted direction.
      responses['forex/jpy/usd'] = {
        data: [{ date: '2026-09-10', val: 0.00678 }]
      };

      const quotes = await fxMacroDataService.getQuotes({
        symbols: ['JPYUSD']
      });

      expect(quotes['JPYUSD'].marketPrice).toEqual(0.00678);
      expect(fetchService.fetch).toHaveBeenCalledWith(
        expect.stringContaining('forex/jpy/usd'),
        expect.anything()
      );
    });

    it('sends the API key as a header, never in the URL', async () => {
      responses['forex/eur/usd'] = {
        data: [{ date: '2026-09-10', val: 1.16 }]
      };

      await fxMacroDataService.getQuotes({ symbols: ['EURUSD'] });

      const [url, init] = (fetchService.fetch as jest.Mock).mock.calls[0] as [
        string,
        { headers: Record<string, string> }
      ];

      expect(url).not.toContain('test-key');
      expect(init.headers['X-API-Key']).toEqual('test-key');
    });

    it('drops a null rate rather than publishing it as zero', async () => {
      responses['forex/eur/usd'] = {
        data: [{ date: '2026-09-10', val: null }]
      };

      const quotes = await fxMacroDataService.getQuotes({
        symbols: ['EURUSD']
      });

      expect(quotes).toEqual({});
    });

    it('does not lose the other pairs when one fails', async () => {
      responses['forex/eur/usd'] = new Error('unavailable');
      responses['forex/gbp/usd'] = {
        data: [{ date: '2026-09-10', val: 1.35 }]
      };

      const quotes = await fxMacroDataService.getQuotes({
        symbols: ['EURUSD', 'GBPUSD']
      });

      expect(Object.keys(quotes)).toEqual(['GBPUSD']);
    });

    it('ignores a symbol that is not a currency pair', async () => {
      const quotes = await fxMacroDataService.getQuotes({ symbols: ['AAPL'] });

      expect(quotes).toEqual({});
      expect(fetchService.fetch).not.toHaveBeenCalled();
    });

    it('makes no request for an empty symbol list', async () => {
      const quotes = await fxMacroDataService.getQuotes({ symbols: [] });

      expect(quotes).toEqual({});
      expect(fetchService.fetch).not.toHaveBeenCalled();
    });
  });

  describe('getHistorical', () => {
    it('returns a market price per date', async () => {
      responses['forex/eur/usd'] = {
        data: [
          { date: '2026-09-09', val: 1.15 },
          { date: '2026-09-10', val: 1.16 }
        ]
      };

      const historical = await fxMacroDataService.getHistorical({
        from: new Date('2026-09-09'),
        symbol: 'EURUSD',
        to: new Date('2026-09-10')
      });

      expect(historical).toEqual({
        '2026-09-09': { marketPrice: 1.15 },
        '2026-09-10': { marketPrice: 1.16 }
      });
    });

    it('skips a date whose rate is null', async () => {
      responses['forex/eur/usd'] = {
        data: [
          { date: '2026-09-09', val: null },
          { date: '2026-09-10', val: 1.16 }
        ]
      };

      const historical = await fxMacroDataService.getHistorical({
        from: new Date('2026-09-09'),
        symbol: 'EURUSD',
        to: new Date('2026-09-10')
      });

      expect(historical).toEqual({ '2026-09-10': { marketPrice: 1.16 } });
    });

    it('returns nothing for a symbol that is not a currency pair', async () => {
      const historical = await fxMacroDataService.getHistorical({
        from: new Date('2026-09-09'),
        symbol: 'AAPL',
        to: new Date('2026-09-10')
      });

      expect(historical).toEqual({});
      expect(fetchService.fetch).not.toHaveBeenCalled();
    });
  });

  describe('search', () => {
    it('offers pairs built from the covered currencies', async () => {
      const { items } = await fxMacroDataService.search({ query: 'eurus' });

      expect(items).toEqual([
        expect.objectContaining({
          currency: 'USD',
          dataSource: DataSource.FXMACRODATA,
          name: 'EUR/USD',
          symbol: 'EURUSD'
        })
      ]);
    });

    it('offers a cross the API derives but does not store', async () => {
      // GBP/JPY is in neither served_pairs entry, but both currencies are
      // covered, so the API serves the cross.
      const { items } = await fxMacroDataService.search({ query: 'GBPJPY' });

      expect(items.map(({ symbol }) => symbol)).toEqual(['GBPJPY']);
    });

    it('never offers a currency against itself', async () => {
      const { items } = await fxMacroDataService.search({ query: 'USD' });

      expect(items.map(({ symbol }) => symbol)).not.toContain('USDUSD');
    });

    it('returns nothing for an empty query', async () => {
      const { items } = await fxMacroDataService.search({ query: '  ' });

      expect(items).toEqual([]);
    });
  });

  describe('getAssetProfile', () => {
    it('describes the pair as liquidity in the quote currency', async () => {
      const profile = await fxMacroDataService.getAssetProfile({
        symbol: 'EURUSD'
      });

      expect(profile).toEqual(
        expect.objectContaining({
          currency: 'USD',
          dataSource: DataSource.FXMACRODATA,
          name: 'EUR/USD',
          symbol: 'EURUSD'
        })
      );
    });
  });
});
