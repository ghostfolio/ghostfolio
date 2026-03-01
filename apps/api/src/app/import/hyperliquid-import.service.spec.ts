import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest
} from '@jest/globals';

import { HyperliquidImportService } from './hyperliquid-import.service';

describe('HyperliquidImportService', () => {
  let configurationService: ConfigurationService;
  let hyperliquidImportService: HyperliquidImportService;

  beforeEach(() => {
    const getMock = jest.fn().mockImplementation((key: string) => {
      if (key === 'REQUEST_TIMEOUT') {
        return 2000;
      }

      return undefined;
    });

    configurationService = {
      get: getMock
    } as unknown as ConfigurationService;

    hyperliquidImportService = new HyperliquidImportService(
      configurationService
    );

    jest.spyOn(global, 'fetch').mockImplementation(async (_url, init) => {
      const payload = JSON.parse(init.body as string);

      if (payload.type === 'spotMeta') {
        return createResponse({
          tokens: [
            { fullName: 'Hyperliquid', index: 0, name: 'HYPE' },
            { fullName: 'USD Coin', index: 1, name: 'USDC' }
          ],
          universe: [{ name: '@2', tokens: [0, 1] }]
        });
      }

      if (payload.type === 'userFills') {
        return createResponse([
          {
            builderFee: '0.05',
            coin: '@2',
            fee: '0.1',
            px: '10',
            side: 'B',
            sz: '2',
            time: Date.UTC(2024, 0, 1)
          }
        ]);
      }

      if (payload.type === 'userFunding') {
        return createResponse([
          {
            delta: {
              coin: 'BTC',
              usdc: '-1.5'
            },
            time: Date.UTC(2024, 0, 2)
          },
          {
            delta: {
              coin: 'ETH',
              usdc: '2.5'
            },
            time: Date.UTC(2024, 0, 3)
          }
        ]);
      }

      if (payload.type === 'userNonFundingLedgerUpdates') {
        return createResponse([
          {
            delta: {
              amount: '3.25',
              token: 'HYPE',
              type: 'rewardsClaim'
            },
            time: Date.UTC(2024, 0, 4)
          },
          {
            delta: {
              fee: '0.2',
              feeToken: 'USDC',
              type: 'send'
            },
            time: Date.UTC(2024, 0, 5)
          },
          {
            delta: {
              type: 'deposit',
              usdc: '100'
            },
            time: Date.UTC(2024, 0, 6)
          }
        ]);
      }

      return createResponse([]);
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('maps fills, funding and selected ledger items', async () => {
    const activities = await hyperliquidImportService.getActivities({
      walletAddress: '0x0000000000000000000000000000000000000001'
    });

    expect(activities).toHaveLength(5);

    expect(activities[0]).toMatchObject({
      dataSource: 'HYPERLIQUID',
      quantity: 2,
      symbol: 'HYPE/USDC',
      type: 'BUY',
      unitPrice: 10
    });
    expect(activities[0].fee).toBeCloseTo(0.15);

    expect(
      activities.some((activity) => {
        return (
          activity.type === 'FEE' &&
          activity.symbol === 'BTC' &&
          activity.unitPrice === 1.5
        );
      })
    ).toBe(true);

    expect(
      activities.some((activity) => {
        return (
          activity.type === 'INTEREST' &&
          activity.symbol === 'ETH' &&
          activity.unitPrice === 2.5
        );
      })
    ).toBe(true);

    expect(
      activities.some((activity) => {
        return (
          activity.type === 'INTEREST' &&
          activity.symbol === 'HYPE' &&
          activity.unitPrice === 3.25
        );
      })
    ).toBe(true);

    expect(
      activities.some((activity) => {
        return (
          activity.type === 'FEE' &&
          activity.symbol === 'USDC' &&
          activity.unitPrice === 0.2
        );
      })
    ).toBe(true);
  });

  it('skips ledger updates when disabled', async () => {
    const activities = await hyperliquidImportService.getActivities({
      includeLedger: false,
      walletAddress: '0x0000000000000000000000000000000000000001'
    });

    expect(activities).toHaveLength(3);
  });
});

function createResponse(data: unknown) {
  return Promise.resolve({
    json: async () => data,
    ok: true,
    status: 200,
    statusText: 'OK'
  } as Response);
}
