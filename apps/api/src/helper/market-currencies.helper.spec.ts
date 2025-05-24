import { lookupCurrency } from '@ghostfolio/api/helper/market-currencies.helper';

describe('lookupCurrency', () => {
  it('should return null if param is empty or null', () => {
    expect(lookupCurrency(null)).toBeNull();

    expect(lookupCurrency('')).toBeNull();

    expect(lookupCurrency('    ')).toBeNull();
  });

  it('should return corresponding market currency from suffix code', () => {
    expect(lookupCurrency('VN')).toStrictEqual('VND');

    expect(lookupCurrency('T')).toStrictEqual('JPY');
  });
});

describe('determineStockCurrency', () => {
  it('should return corresponding market currency from symbol has suffix code', () => {
    expect(lookupCurrency('MBB.VN')).toStrictEqual('VND');

    expect(lookupCurrency('7203.T')).toStrictEqual('JPY');

    expect(lookupCurrency('EA.BK')).toStrictEqual('THB');
  });

  it('should return null if symbol has no suffix code', () => {
    expect(lookupCurrency('APPL')).toBeNull();

    expect(lookupCurrency('TLSA')).toBeNull();
  });

  it('should return null if symbol has suffix code but not supported in json data', () => {
    expect(lookupCurrency('A.CBT')).toBeNull();
  });
});
