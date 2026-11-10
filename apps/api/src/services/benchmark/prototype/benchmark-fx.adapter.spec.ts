import {
  BenchmarkFxQuote,
  convertBenchmarkPrices
} from './benchmark-fx.adapter';

const prices = [
  { date: '2025-01-10', price: '100' },
  { date: '2025-01-12', price: '110' }
];

const fxQuotes: BenchmarkFxQuote[] = [
  {
    currencyFrom: 'USD',
    currencyTo: 'EUR',
    date: '2025-01-10',
    rate: '0.92'
  }
];

describe('Benchmark historical FX adapter', () => {
  it('preserves prices for identical currencies', () => {
    const result = convertBenchmarkPrices({
      prices,
      currencyFrom: 'EUR',
      currencyTo: 'EUR',
      fxQuotes: []
    });

    expect(result.prices).toEqual(prices);
    expect(result.conversions).toEqual([
      {
        date: '2025-01-10',
        method: 'IDENTITY',
        rate: '1',
        components: []
      },
      {
        date: '2025-01-12',
        method: 'IDENTITY',
        rate: '1',
        components: []
      }
    ]);
  });

  it('converts using a direct historical rate', () => {
    const result = convertBenchmarkPrices({
      prices: [prices[0]],
      currencyFrom: 'USD',
      currencyTo: 'EUR',
      fxQuotes
    });

    expect(result.prices[0].price).toBe('92');
    expect(result.conversions[0]).toEqual({
      date: '2025-01-10',
      method: 'DIRECT',
      rate: '0.92',
      components: [
        {
          pair: 'USDEUR',
          sourceDate: '2025-01-10',
          ageInDays: 0,
          rate: '0.92',
          kind: 'MARKET'
        }
      ]
    });
  });

  it('converts using the inverse historical rate', () => {
    const result = convertBenchmarkPrices({
      prices: [{ date: '2025-01-10', price: '92' }],
      currencyFrom: 'EUR',
      currencyTo: 'USD',
      fxQuotes
    });

    expect(result.prices[0].price).toBe('100');
    expect(result.conversions[0].components[0].pair).toBe('USDEUR');
    expect(result.conversions[0].method).toBe('DIRECT');
  });

  it('uses the most recent preceding rate', () => {
    const result = convertBenchmarkPrices({
      prices: [prices[1]],
      currencyFrom: 'USD',
      currencyTo: 'EUR',
      fxQuotes
    });

    expect(result.prices[0].price).toBe('101.2');
    expect(result.conversions[0].components[0]).toMatchObject({
      sourceDate: '2025-01-10',
      ageInDays: 2
    });
  });

  it('rejects a rate older than seven days', () => {
    expect(() =>
      convertBenchmarkPrices({
        prices: [{ date: '2025-01-18', price: '100' }],
        currencyFrom: 'USD',
        currencyTo: 'EUR',
        fxQuotes
      })
    ).toThrow('Stale FX rate: USDEUR 2025-01-18');
  });

  it('never uses a future FX rate', () => {
    expect(() =>
      convertBenchmarkPrices({
        prices: [{ date: '2025-01-09', price: '100' }],
        currencyFrom: 'USD',
        currencyTo: 'EUR',
        fxQuotes
      })
    ).toThrow('Missing FX rate: USDEUR 2025-01-09');
  });

  it('rejects duplicate rates for the same pair and date', () => {
    expect(() =>
      convertBenchmarkPrices({
        prices: [prices[0]],
        currencyFrom: 'USD',
        currencyTo: 'EUR',
        fxQuotes: [...fxQuotes, ...fxQuotes]
      })
    ).toThrow('Duplicate FX rate: USDEUR 2025-01-10');
  });

  it('prefers a direct pair over an inverse pair', () => {
    const result = convertBenchmarkPrices({
      prices: [prices[0]],
      currencyFrom: 'USD',
      currencyTo: 'EUR',
      fxQuotes: [
        ...fxQuotes,
        {
          currencyFrom: 'EUR',
          currencyTo: 'USD',
          date: '2025-01-10',
          rate: '1.1'
        }
      ]
    });

    expect(result.prices[0].price).toBe('92');
    expect(result.conversions[0].components[0].pair).toBe('USDEUR');
  });

  it.each(['0', '-1', 'NaN', 'Infinity', '-Infinity'])(
    'rejects invalid FX rate %s',
    (rate) => {
      expect(() =>
        convertBenchmarkPrices({
          prices: [prices[0]],
          currencyFrom: 'USD',
          currencyTo: 'EUR',
          fxQuotes: [{ ...fxQuotes[0], rate }]
        })
      ).toThrow('Invalid FX rate');
    }
  );

  it('rejects a stale direct rate without falling back to an inverse rate', () => {
    expect(() =>
      convertBenchmarkPrices({
        prices: [{ date: '2025-01-18', price: '100' }],
        currencyFrom: 'USD',
        currencyTo: 'EUR',
        fxQuotes: [
          ...fxQuotes,
          {
            currencyFrom: 'EUR',
            currencyTo: 'USD',
            date: '2025-01-18',
            rate: '1.1'
          }
        ]
      })
    ).toThrow('Stale FX rate: USDEUR 2025-01-18');
  });

  it('converts indirectly from GBP to EUR through USD', () => {
    const result = convertBenchmarkPrices({
      prices: [{ date: '2025-01-10', price: '80' }],
      currencyFrom: 'GBP',
      currencyTo: 'EUR',
      fxQuotes: [
        {
          currencyFrom: 'USD',
          currencyTo: 'GBP',
          date: '2025-01-10',
          rate: '0.8'
        },
        {
          currencyFrom: 'USD',
          currencyTo: 'EUR',
          date: '2025-01-10',
          rate: '0.92'
        }
      ]
    });

    expect(result.prices[0].price).toBe('92');
    expect(result.conversions[0].method).toBe('INDIRECT');
    expect(result.conversions[0].components).toHaveLength(2);
  });

  it('preserves independent source dates for indirect FX components', () => {
    const result = convertBenchmarkPrices({
      prices: [{ date: '2025-01-12', price: '80' }],
      currencyFrom: 'GBP',
      currencyTo: 'EUR',
      fxQuotes: [
        {
          currencyFrom: 'USD',
          currencyTo: 'GBP',
          date: '2025-01-10',
          rate: '0.8'
        },
        {
          currencyFrom: 'USD',
          currencyTo: 'EUR',
          date: '2025-01-09',
          rate: '0.92'
        }
      ]
    });

    expect(result.conversions[0].components).toEqual([
      {
        pair: 'USDGBP',
        sourceDate: '2025-01-10',
        ageInDays: 2,
        rate: '0.8',
        kind: 'MARKET'
      },
      {
        pair: 'USDEUR',
        sourceDate: '2025-01-09',
        ageInDays: 3,
        rate: '0.92',
        kind: 'MARKET'
      }
    ]);
  });

  it('rejects an indirect conversion with one stale component', () => {
    expect(() =>
      convertBenchmarkPrices({
        prices: [{ date: '2025-01-18', price: '80' }],
        currencyFrom: 'GBP',
        currencyTo: 'EUR',
        fxQuotes: [
          {
            currencyFrom: 'USD',
            currencyTo: 'GBP',
            date: '2025-01-10',
            rate: '0.8'
          },
          {
            currencyFrom: 'USD',
            currencyTo: 'EUR',
            date: '2025-01-17',
            rate: '0.92'
          }
        ]
      })
    ).toThrow('Stale FX rate: USDGBP 2025-01-18');
  });

  it('converts a derived currency using its fixed factor', () => {
    const result = convertBenchmarkPrices({
      prices: [{ date: '2025-01-10', price: '125' }],
      currencyFrom: 'GBp',
      currencyTo: 'GBP',
      fxQuotes: []
    });

    expect(result.prices[0].price).toBe('1.25');
    expect(result.conversions[0].method).toBe('DERIVED');
    expect(result.conversions[0].components).toEqual([
      {
        pair: 'GBpGBP',
        rate: '0.01',
        kind: 'FIXED'
      }
    ]);
  });

  it('converts a derived currency through a market FX rate', () => {
    const result = convertBenchmarkPrices({
      prices: [{ date: '2025-01-10', price: '8000' }],
      currencyFrom: 'GBp',
      currencyTo: 'EUR',
      fxQuotes: [
        {
          currencyFrom: 'GBP',
          currencyTo: 'EUR',
          date: '2025-01-10',
          rate: '1.15'
        }
      ]
    });

    expect(result.prices[0].price).toBe('92');
    expect(result.conversions[0].method).toBe('DERIVED');
    expect(result.conversions[0].components).toEqual([
      {
        pair: 'GBpGBP',
        rate: '0.01',
        kind: 'FIXED'
      },
      {
        pair: 'GBPEUR',
        sourceDate: '2025-01-10',
        ageInDays: 0,
        rate: '1.15',
        kind: 'MARKET'
      }
    ]);
  });

  it('converts indirectly using an inverse USD leg', () => {
    const result = convertBenchmarkPrices({
      prices: [{ date: '2025-01-10', price: '80' }],
      currencyFrom: 'GBP',
      currencyTo: 'EUR',
      fxQuotes: [
        {
          currencyFrom: 'GBP',
          currencyTo: 'USD',
          date: '2025-01-10',
          rate: '1.25'
        },
        {
          currencyFrom: 'USD',
          currencyTo: 'EUR',
          date: '2025-01-10',
          rate: '0.92'
        }
      ]
    });

    expect(result.prices[0].price).toBe('92');
    expect(result.conversions[0].method).toBe('INDIRECT');
    expect(result.conversions[0].components.map(({ pair }) => pair)).toEqual([
      'GBPUSD',
      'USDEUR'
    ]);
  });

  it('converts from a root currency to its derived currency', () => {
    const result = convertBenchmarkPrices({
      prices: [{ date: '2025-01-10', price: '1.25' }],
      currencyFrom: 'GBP',
      currencyTo: 'GBp',
      fxQuotes: []
    });

    expect(result.prices[0].price).toBe('125');
    expect(result.conversions[0].method).toBe('DERIVED');
    expect(result.conversions[0].components).toEqual([
      {
        pair: 'GBPGBp',
        rate: '100',
        kind: 'FIXED'
      }
    ]);
  });

  it('converts through a market rate into a derived currency', () => {
    const result = convertBenchmarkPrices({
      prices: [{ date: '2025-01-10', price: '1' }],
      currencyFrom: 'EUR',
      currencyTo: 'GBp',
      fxQuotes: [
        {
          currencyFrom: 'EUR',
          currencyTo: 'GBP',
          date: '2025-01-10',
          rate: '0.8'
        }
      ]
    });

    expect(result.prices[0].price).toBe('80');
    expect(result.conversions[0].method).toBe('DERIVED');
    expect(result.conversions[0].components).toEqual([
      {
        pair: 'EURGBP',
        sourceDate: '2025-01-10',
        ageInDays: 0,
        rate: '0.8',
        kind: 'MARKET'
      },
      {
        pair: 'GBPGBp',
        rate: '100',
        kind: 'FIXED'
      }
    ]);
  });

  it('preserves identical currencies despite unrelated FX quotes', () => {
    const input = {
      prices: [{ date: '2025-01-10', price: '123.456789' }],
      currencyFrom: 'EUR',
      currencyTo: 'EUR',
      fxQuotes: [
        {
          currencyFrom: 'USD',
          currencyTo: 'GBP',
          date: '2025-01-10',
          rate: '0.8'
        }
      ]
    };

    const result = convertBenchmarkPrices(input);

    expect(result.prices).toEqual(input.prices);
    expect(result.conversions[0].method).toBe('IDENTITY');
    expect(result.conversions[0].rate).toBe('1');
  });

  it('preserves an identical derived currency', () => {
    const result = convertBenchmarkPrices({
      prices: [{ date: '2025-01-10', price: '125' }],
      currencyFrom: 'GBp',
      currencyTo: 'GBp',
      fxQuotes: []
    });

    expect(result.prices[0].price).toBe('125');
    expect(result.conversions[0].rate).toBe('1');
  });

  it('converts between derived currencies through their roots', () => {
    const result = convertBenchmarkPrices({
      prices: [{ date: '2025-01-10', price: '100' }],
      currencyFrom: 'GBp',
      currencyTo: 'ZAc',
      fxQuotes: [
        {
          currencyFrom: 'GBP',
          currencyTo: 'ZAR',
          date: '2025-01-10',
          rate: '24'
        }
      ]
    });

    expect(result.prices[0].price).toBe('2400');
    expect(result.conversions[0].method).toBe('DERIVED');
    expect(result.conversions[0].components.map(({ kind }) => kind)).toEqual([
      'FIXED',
      'MARKET',
      'FIXED'
    ]);
  });

  it('avoids a rounded reciprocal in indirect conversion', () => {
    const result = convertBenchmarkPrices({
      prices: [{ date: '2025-01-10', price: '92' }],
      currencyFrom: 'EUR',
      currencyTo: 'GBP',
      fxQuotes: [
        {
          currencyFrom: 'USD',
          currencyTo: 'EUR',
          date: '2025-01-10',
          rate: '0.92'
        },
        {
          currencyFrom: 'USD',
          currencyTo: 'GBP',
          date: '2025-01-10',
          rate: '0.8'
        }
      ]
    });

    expect(result.prices[0].price).toBe('80');
    expect(result.conversions[0].method).toBe('INDIRECT');
  });

  it.each(['0', '-1', 'NaN', 'Infinity', '-Infinity'])(
    'rejects invalid benchmark price %s',
    (price) => {
      expect(() =>
        convertBenchmarkPrices({
          prices: [{ date: '2025-01-10', price }],
          currencyFrom: 'USD',
          currencyTo: 'EUR',
          fxQuotes
        })
      ).toThrow('Invalid benchmark price');
    }
  );

  it.each(['2025-02-30', 'invalid', '2025-13-01'])(
    'rejects invalid benchmark date %s',
    (date) => {
      expect(() =>
        convertBenchmarkPrices({
          prices: [{ date, price: '100' }],
          currencyFrom: 'USD',
          currencyTo: 'EUR',
          fxQuotes
        })
      ).toThrow('Invalid FX date');
    }
  );

  it.each(['2025-02-30', 'invalid', '2025-13-01'])(
    'rejects invalid FX quotation date %s',
    (date) => {
      expect(() =>
        convertBenchmarkPrices({
          prices: [prices[0]],
          currencyFrom: 'USD',
          currencyTo: 'EUR',
          fxQuotes: [{ ...fxQuotes[0], date }]
        })
      ).toThrow('Invalid FX date');
    }
  );

  it.each([-1, 1.5, NaN, Infinity])(
    'rejects invalid FX age limit %s',
    (maxFxAgeDays) => {
      expect(() =>
        convertBenchmarkPrices({
          prices: [prices[0]],
          currencyFrom: 'USD',
          currencyTo: 'EUR',
          fxQuotes,
          maxFxAgeDays
        })
      ).toThrow('Invalid maximum price age');
    }
  );

  it('is independent of FX quote input order', () => {
    const quotes = [
      ...fxQuotes,
      {
        currencyFrom: 'USD',
        currencyTo: 'EUR',
        date: '2025-01-09',
        rate: '0.91'
      }
    ];

    const input = {
      prices,
      currencyFrom: 'USD',
      currencyTo: 'EUR',
      fxQuotes: quotes
    };

    expect(convertBenchmarkPrices(input)).toEqual(
      convertBenchmarkPrices({
        ...input,
        fxQuotes: [...quotes].reverse()
      })
    );
  });
});
