import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest
} from '@jest/globals';

import { HyperliquidService } from './hyperliquid.service';

describe('HyperliquidService', () => {
  let configurationService: ConfigurationService;
  let hyperliquidService: HyperliquidService;
  let requestCounter: Record<string, number>;

  beforeEach(() => {
    requestCounter = {};

    configurationService = {
      get: (key) => {
        if (key === 'REQUEST_TIMEOUT') {
          return 2000;
        }

        return undefined;
      }
    } as any;

    hyperliquidService = new HyperliquidService(configurationService);

    jest.spyOn(global, 'fetch').mockImplementation(async (_url, init) => {
      const payload = JSON.parse(init.body as string);
      requestCounter[payload.type] = (requestCounter[payload.type] ?? 0) + 1;

      if (payload.type === 'meta') {
        return createResponse({
          universe: [{ name: 'BTC' }, { isDelisted: true, name: 'DELISTED' }]
        });
      }

      if (payload.type === 'spotMeta') {
        return createResponse({
          tokens: [
            { fullName: 'Hyperliquid', index: 0, name: 'HYPE' },
            { fullName: 'USD Coin', index: 1, name: 'USDC' }
          ],
          universe: [{ name: '@2', tokens: [0, 1] }]
        });
      }

      if (payload.type === 'allMids') {
        return createResponse({
          '@2': '12.34',
          BTC: '100000'
        });
      }

      if (payload.type === 'candleSnapshot') {
        return createResponse([
          {
            c: '10.5',
            t: Date.UTC(2024, 0, 1)
          },
          {
            c: '11.25',
            t: Date.UTC(2024, 0, 2)
          }
        ]);
      }

      return createResponse({});
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('maps quotes for perp and spot symbols', async () => {
    const result = await hyperliquidService.getQuotes({
      requestTimeout: 1000,
      symbols: ['BTC', 'HYPE/USDC']
    });

    expect(result.BTC.marketPrice).toBe(100000);
    expect(result.BTC.currency).toBe('USD');
    expect(result.BTC.dataSource).toBe('HYPERLIQUID');

    expect(result['HYPE/USDC'].marketPrice).toBe(12.34);
    expect(result['HYPE/USDC'].currency).toBe('USD');
    expect(result['HYPE/USDC'].dataSource).toBe('HYPERLIQUID');
  });

  it('returns search results with canonical symbols', async () => {
    const result = await hyperliquidService.search({
      query: 'hyp'
    });

    expect(result.items.some(({ symbol }) => symbol === 'HYPE/USDC')).toBe(
      true
    );
    expect(result.items.some(({ symbol }) => symbol === 'BTC')).toBe(false);
  });

  it('maps historical candles for spot canonical symbol', async () => {
    const result = await hyperliquidService.getHistorical({
      from: new Date(Date.UTC(2024, 0, 1)),
      requestTimeout: 1000,
      symbol: 'HYPE/USDC',
      to: new Date(Date.UTC(2024, 0, 3))
    });

    expect(result['HYPE/USDC']['2024-01-01'].marketPrice).toBe(10.5);
    expect(result['HYPE/USDC']['2024-01-02'].marketPrice).toBe(11.25);
  });

  it('reuses cached catalog between calls', async () => {
    await hyperliquidService.search({
      query: 'btc'
    });

    await hyperliquidService.getQuotes({
      symbols: ['BTC']
    });

    expect(requestCounter.meta).toBe(1);
    expect(requestCounter.spotMeta).toBe(1);
    expect(requestCounter.allMids).toBe(1);
  });
});

function createResponse(data: unknown, ok = true) {
  return Promise.resolve({
    json: async () => data,
    ok,
    status: ok ? 200 : 500,
    statusText: ok ? 'OK' : 'ERROR'
  } as Response);
}
