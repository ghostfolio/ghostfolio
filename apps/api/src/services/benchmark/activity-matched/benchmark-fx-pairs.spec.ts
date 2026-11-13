import { getBenchmarkFxPairs } from './benchmark-fx-pairs';

describe('Benchmark FX candidate pairs', () => {
  const symbols = (currencyFrom: string, currencyTo: string) =>
    getBenchmarkFxPairs({ currencyFrom, currencyTo }).map(
      ({ symbol }) => symbol
    );

  it('requires no FX quotes for identical currencies', () => {
    expect(symbols('EUR', 'EUR')).toEqual([]);
  });

  it('requires no market FX for derived currencies sharing a root', () => {
    expect(symbols('GBP', 'GBp')).toEqual([]);
    expect(symbols('GBp', 'GBP')).toEqual([]);
  });

  it('includes both directions for a USD conversion', () => {
    expect(symbols('USD', 'EUR')).toEqual(['USDEUR', 'EURUSD']);
  });

  it('includes direct, inverse and USD bridge candidates', () => {
    expect(symbols('GBP', 'EUR')).toEqual([
      'GBPEUR',
      'EURGBP',
      'USDGBP',
      'GBPUSD',
      'USDEUR',
      'EURUSD'
    ]);
  });

  it('normalizes a derived source currency', () => {
    expect(symbols('GBp', 'EUR')).toEqual(symbols('GBP', 'EUR'));
  });

  it('normalizes a derived target currency', () => {
    expect(symbols('EUR', 'GBp')).toEqual(symbols('EUR', 'GBP'));
  });

  it('does not introduce duplicate symbols', () => {
    for (const [currencyFrom, currencyTo] of [
      ['USD', 'EUR'],
      ['GBP', 'EUR'],
      ['GBp', 'EUR'],
      ['EUR', 'GBp'],
      ['GBP', 'GBp']
    ]) {
      const result = symbols(currencyFrom, currencyTo);

      expect(new Set(result).size).toBe(result.length);
    }
  });

  it('preserves pair direction metadata', () => {
    expect(
      getBenchmarkFxPairs({
        currencyFrom: 'USD',
        currencyTo: 'EUR'
      })
    ).toEqual([
      {
        currencyFrom: 'USD',
        currencyTo: 'EUR',
        symbol: 'USDEUR'
      },
      {
        currencyFrom: 'EUR',
        currencyTo: 'USD',
        symbol: 'EURUSD'
      }
    ]);
  });
});
