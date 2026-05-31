import { Big } from 'big.js';

import { getLatestMarketPriceOnOrBefore } from './portfolio.helper';

describe('getLatestMarketPriceOnOrBefore', () => {
  it('returns the latest available price without using future values', () => {
    expect(
      getLatestMarketPriceOnOrBefore({
        dateString: '2026-05-31',
        marketSymbolMap: {
          '2026-06-01': { SPY: new Big(103) },
          '2026-05-29': { SPY: new Big(101) },
          '2026-05-28': { SPY: new Big(100) }
        },
        symbol: 'SPY'
      })
    ).toEqual(new Big(101));
  });
});
