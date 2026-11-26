import { Activity } from '@ghostfolio/common/interfaces';
import { AssetSubClass } from '@ghostfolio/prisma/browser';

import { Big } from 'big.js';

import { evaluateRange, FinancialPoint } from './activity-matched-benchmark';
import { runActivityMatchedBenchmarkPipeline } from './activity-matched-benchmark.pipeline';
import { createBenchmarkDisplayValuations } from './benchmark-display-valuation.adapter';
import { convertBenchmarkPrices } from './benchmark-fx.adapter';

describe('Benchmark display FX valuation staleness', () => {
  it('rejects a display valuation using an eight-day-old benchmark price', () => {
    const points = [
      {
        date: '2025-01-18',
        displayOnly: true,
        units: new Big(1)
      }
    ] as FinancialPoint[];

    expect(() =>
      createBenchmarkDisplayValuations({
        points,
        prices: [{ date: '2025-01-10', price: '100' }],
        fxQuotes: [],
        currencyFrom: 'EUR',
        currencyTo: 'EUR',
        maxPriceAgeDays: 7
      })
    ).toThrow('Stale display price: 2025-01-18');
  });
});

describe('Benchmark display FX valuation without holdings', () => {
  it('returns zero without requiring market data after liquidation', () => {
    const points = [
      {
        date: '2025-01-18',
        displayOnly: true,
        units: new Big(0)
      }
    ] as FinancialPoint[];

    const result = createBenchmarkDisplayValuations({
      points,
      prices: [],
      fxQuotes: [],
      currencyFrom: 'USD',
      currencyTo: 'EUR'
    });

    expect(result).toEqual([
      {
        date: '2025-01-18',
        currency: 'EUR',
        value: '0',
        benchmarkPriceSourceDate: '',
        fxComponents: [],
        valuationStatus: 'NOT_APPLICABLE'
      }
    ]);
  });
});

describe('Benchmark display FX provenance', () => {
  it('preserves both historical components of an indirect FX conversion', () => {
    const points = [
      {
        date: '2025-01-12',
        displayOnly: true,
        units: new Big(2)
      }
    ] as FinancialPoint[];

    const result = createBenchmarkDisplayValuations({
      points,
      prices: [{ date: '2025-01-10', price: '80' }],
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
          date: '2025-01-11',
          rate: '0.92'
        }
      ],
      currencyFrom: 'GBP',
      currencyTo: 'EUR'
    });

    expect(result).toHaveLength(1);
    expect(result[0].value).toBe('184');
    expect(result[0].benchmarkPriceSourceDate).toBe('2025-01-10');
    expect(result[0].valuationStatus).toBe('CARRIED_FORWARD');

    expect(result[0].fxComponents).toEqual([
      {
        pair: 'GBPUSD',
        sourceDate: '2025-01-10',
        ageInDays: 2,
        rate: '1.25',
        kind: 'MARKET'
      },
      {
        pair: 'USDEUR',
        sourceDate: '2025-01-11',
        ageInDays: 1,
        rate: '0.92',
        kind: 'MARKET'
      }
    ]);

    expect(result[0].fxSourceDate).toBeUndefined();
  });
});

describe('Benchmark display FX independent staleness', () => {
  it('rejects stale FX even when the benchmark price is recent', () => {
    const points = [
      {
        date: '2025-01-18',
        displayOnly: true,
        units: new Big(1)
      }
    ] as FinancialPoint[];

    expect(() =>
      createBenchmarkDisplayValuations({
        points,
        prices: [{ date: '2025-01-17', price: '100' }],
        fxQuotes: [
          {
            currencyFrom: 'USD',
            currencyTo: 'EUR',
            date: '2025-01-10',
            rate: '0.90'
          }
        ],
        currencyFrom: 'USD',
        currencyTo: 'EUR',
        maxPriceAgeDays: 7,
        maxFxAgeDays: 7
      })
    ).toThrow('Stale FX rate: USDEUR 2025-01-18');
  });
});

describe('Benchmark display FX batch parity', () => {
  it('preserves input order, independent FX dates and liquidated positions', () => {
    const points = [
      {
        date: '2025-01-12',
        displayOnly: true,
        units: new Big(2)
      },
      {
        date: '2025-01-14',
        displayOnly: true,
        units: new Big(0)
      },
      {
        date: '2025-01-11',
        displayOnly: true,
        units: new Big(1)
      }
    ] as FinancialPoint[];

    const result = createBenchmarkDisplayValuations({
      points,
      prices: [
        { date: '2025-01-10', price: '100' },
        { date: '2025-01-13', price: '110' }
      ],
      fxQuotes: [
        {
          currencyFrom: 'USD',
          currencyTo: 'EUR',
          date: '2025-01-10',
          rate: '0.90'
        },
        {
          currencyFrom: 'USD',
          currencyTo: 'EUR',
          date: '2025-01-11',
          rate: '0.91'
        },
        {
          currencyFrom: 'USD',
          currencyTo: 'EUR',
          date: '2025-01-12',
          rate: '0.92'
        }
      ],
      currencyFrom: 'USD',
      currencyTo: 'EUR'
    });

    expect(result.map(({ date, value }) => ({ date, value }))).toEqual([
      { date: '2025-01-12', value: '184' },
      { date: '2025-01-14', value: '0' },
      { date: '2025-01-11', value: '91' }
    ]);

    expect(
      result.map(({ benchmarkPriceSourceDate }) => benchmarkPriceSourceDate)
    ).toEqual(['2025-01-10', '', '2025-01-10']);

    expect(result.map(({ fxSourceDate }) => fxSourceDate)).toEqual([
      '2025-01-12',
      undefined,
      '2025-01-11'
    ]);

    expect(result[0].fxComponents).toEqual([
      {
        pair: 'USDEUR',
        sourceDate: '2025-01-12',
        ageInDays: 0,
        rate: '0.92',
        kind: 'MARKET'
      }
    ]);

    expect(result[1].fxComponents).toEqual([]);
    expect(result[1].valuationStatus).toBe('NOT_APPLICABLE');

    expect(result[2].fxComponents).toEqual([
      {
        pair: 'USDEUR',
        sourceDate: '2025-01-11',
        ageInDays: 0,
        rate: '0.91',
        kind: 'MARKET'
      }
    ]);

    expect(points.map(({ date }) => date)).toEqual([
      '2025-01-12',
      '2025-01-14',
      '2025-01-11'
    ]);
  });
});

describe('Benchmark display FX valuations', () => {
  it('updates display-only values using independent historical FX rates', () => {
    const activities = [
      {
        id: 'initial-buy',
        type: 'BUY',
        date: new Date('2025-01-10T00:00:00Z'),
        valueInBaseCurrency: 90,
        assetProfile: {
          assetSubClass: AssetSubClass.ETF
        }
      } as Activity
    ];

    const prices = [
      { date: '2025-01-10', price: '100' },
      { date: '2025-01-13', price: '110' }
    ];

    const fxQuotes = [
      {
        currencyFrom: 'USD',
        currencyTo: 'EUR',
        date: '2025-01-10',
        rate: '0.90'
      },
      {
        currencyFrom: 'USD',
        currencyTo: 'EUR',
        date: '2025-01-11',
        rate: '0.91'
      },
      {
        currencyFrom: 'USD',
        currencyTo: 'EUR',
        date: '2025-01-12',
        rate: '0.92'
      },
      {
        currencyFrom: 'USD',
        currencyTo: 'EUR',
        date: '2025-01-13',
        rate: '0.93'
      }
    ];

    const pipeline = runActivityMatchedBenchmarkPipeline({
      activities,
      currency: 'EUR',
      benchmarkCurrency: 'USD',
      prices,
      fxQuotes,
      valuationDates: ['2025-01-11', '2025-01-12'],
      start: '2025-01-10',
      end: '2025-01-13',
      method: 'ROI'
    });

    const originalValues = pipeline.points.map(({ value }) => value.toString());

    const originalPerformance = pipeline.performance.map(({ returnFraction }) =>
      returnFraction.toString()
    );

    const display = createBenchmarkDisplayValuations({
      points: pipeline.points,
      prices,
      fxQuotes,
      currencyFrom: 'USD',
      currencyTo: 'EUR'
    });

    expect(display.map(({ date, value }) => ({ date, value }))).toEqual([
      { date: '2025-01-11', value: '91' },
      { date: '2025-01-12', value: '92' }
    ]);

    expect(
      display.map(({ benchmarkPriceSourceDate }) => benchmarkPriceSourceDate)
    ).toEqual(['2025-01-10', '2025-01-10']);

    expect(display.map(({ fxSourceDate }) => fxSourceDate)).toEqual([
      '2025-01-11',
      '2025-01-12'
    ]);

    expect(
      display.every(
        ({ valuationStatus }) => valuationStatus === 'CARRIED_FORWARD'
      )
    ).toBe(true);

    expect(pipeline.points.map(({ value }) => value.toString())).toEqual(
      originalValues
    );

    expect(
      pipeline.performance.map(({ returnFraction }) =>
        returnFraction.toString()
      )
    ).toEqual(originalPerformance);
  });
});

describe('Benchmark display validation and batch contract', () => {
  const point = (date = '2025-01-18', units = '1') =>
    ({ date, units: new Big(units), displayOnly: true }) as FinancialPoint;
  const input = () => ({
    points: [point()],
    prices: [{ date: '2025-01-17', price: '100', sourceDate: '2025-01-10' }],
    fxQuotes: [
      {
        currencyFrom: 'USD',
        currencyTo: 'EUR',
        date: '2025-01-18',
        rate: '0.92'
      }
    ],
    currencyFrom: 'USD',
    currencyTo: 'EUR',
    maxPriceAgeDays: 7
  });

  it('rejects an original source price older than the limit', () => {
    expect(() => createBenchmarkDisplayValuations(input())).toThrow(
      'Stale display price: 2025-01-18'
    );
  });

  it.each(['2025-02-30', 'bad-date', '2025-01-18'])(
    'rejects invalid or future source date %s',
    (sourceDate) => {
      const data = input();
      data.prices[0].sourceDate = sourceDate;
      expect(() => createBenchmarkDisplayValuations(data)).toThrow(
        sourceDate === '2025-01-18'
          ? 'Invalid benchmark source date: 2025-01-18'
          : `Invalid benchmark date: ${sourceDate}`
      );
    }
  );

  it('uses original age at the inclusive limit and on the quotation day', () => {
    const data = input();
    data.points = [point('2025-01-17')];
    data.fxQuotes[0].date = '2025-01-17';
    expect(createBenchmarkDisplayValuations(data)[0]).toMatchObject({
      value: '92',
      benchmarkPriceSourceDate: '2025-01-10',
      valuationStatus: 'CARRIED_FORWARD'
    });
  });

  it('uses quotation date when no source date is provided', () => {
    const data = {
      ...input(),
      prices: [{ date: '2025-01-18', price: '0.1234567890123456789' }]
    };
    expect(createBenchmarkDisplayValuations(data)[0]).toMatchObject({
      value: '0.113580245891358024588',
      benchmarkPriceSourceDate: '2025-01-18',
      valuationStatus: 'CURRENT'
    });
  });

  it('rejects duplicate benchmark dates rather than choosing an arbitrary price', () => {
    const data = {
      ...input(),
      prices: [
        { date: '2025-01-18', price: '100' },
        { date: '2025-01-18', price: '101' }
      ]
    };
    expect(() => createBenchmarkDisplayValuations(data)).toThrow(
      'Duplicate benchmark price: 2025-01-18'
    );
  });

  it.each(['0', '-1', 'NaN', 'invalid'])(
    'rejects invalid selected benchmark price %s',
    (price) => {
      expect(() =>
        createBenchmarkDisplayValuations({
          ...input(),
          prices: [{ date: '2025-01-18', price }]
        })
      ).toThrow('Invalid benchmark price: 2025-01-18');
    }
  );

  it('rejects invalid quotation dates', () => {
    expect(() =>
      createBenchmarkDisplayValuations({
        ...input(),
        prices: [{ date: '2025-02-30', price: '100' }]
      })
    ).toThrow('Invalid benchmark date: 2025-02-30');
  });

  it('rejects invalid display dates', () => {
    expect(() =>
      createBenchmarkDisplayValuations({
        ...input(),
        points: [point('2025-02-30')]
      })
    ).toThrow('Invalid benchmark date: 2025-02-30');
  });

  it('rejects missing historical benchmark data', () => {
    expect(() =>
      createBenchmarkDisplayValuations({
        ...input(),
        points: [point('2025-01-09')]
      })
    ).toThrow('Missing display price: 2025-01-09');
  });

  it.each(['invalid', 'duplicate', 'missing'])('rejects %s FX data', (kind) => {
    const data = { ...input(), prices: [{ date: '2025-01-18', price: '100' }] };
    if (kind === 'invalid') data.fxQuotes[0].date = '2025-02-30';
    if (kind === 'duplicate') data.fxQuotes.push({ ...data.fxQuotes[0] });
    if (kind === 'missing') data.fxQuotes = [];
    expect(() => createBenchmarkDisplayValuations(data)).toThrow(
      kind === 'invalid'
        ? 'Invalid FX date: 2025-02-30'
        : kind === 'duplicate'
          ? 'Duplicate FX rate: USDEUR 2025-01-18'
          : 'Missing FX rate: USDEUR 2025-01-18'
    );
  });

  it('preserves unsorted duplicate display points and does not mutate caller data', () => {
    const data = {
      ...input(),
      prices: [{ date: '2025-01-17', price: '100' }],
      points: [
        point(),
        point('2025-01-17', '2'),
        point(),
        point('2025-01-19', '0')
      ]
    };
    data.fxQuotes.push({
      ...data.fxQuotes[0],
      date: '2025-01-17',
      rate: '0.9'
    });
    const before = JSON.stringify(data);
    for (const array of [data.points, data.prices, data.fxQuotes]) {
      array.forEach(Object.freeze);
      Object.freeze(array);
    }
    const batch = createBenchmarkDisplayValuations(data);
    expect(batch).toEqual(
      data.points.flatMap((p) =>
        createBenchmarkDisplayValuations({ ...data, points: [p] })
      )
    );
    expect(batch.map(({ value }) => value)).toEqual(['92', '180', '92', '0']);
    expect(JSON.stringify(data)).toBe(before);
  });

  it('returns empty for empty or exclusively financial points', () => {
    expect(
      createBenchmarkDisplayValuations({ ...input(), points: [] })
    ).toEqual([]);
    expect(
      createBenchmarkDisplayValuations({
        ...input(),
        points: [{ ...point(), displayOnly: false }]
      })
    ).toEqual([]);
  });

  it('does not require FX or prices for exclusively zero holdings', () => {
    expect(
      createBenchmarkDisplayValuations({
        ...input(),
        points: [point('2025-01-18', '0')],
        prices: [],
        fxQuotes: []
      })[0].valuationStatus
    ).toBe('NOT_APPLICABLE');
  });

  it('reports benchmark preparation errors before batch FX errors', () => {
    const data = {
      ...input(),
      prices: [{ date: '2025-01-17', price: '100' }],
      points: [point('2025-01-18'), point('2025-02-01')],
      fxQuotes: []
    };
    expect(() => createBenchmarkDisplayValuations(data)).toThrow(
      'Stale display price: 2025-02-01'
    );
  });
});

describe('Benchmark display conversion provenance across a batch', () => {
  it.each([
    [
      'USD',
      'EUR',
      [
        {
          currencyFrom: 'USD',
          currencyTo: 'EUR',
          date: '2025-01-10',
          rate: '0.92'
        }
      ],
      '184'
    ],
    [
      'EUR',
      'USD',
      [
        {
          currencyFrom: 'USD',
          currencyTo: 'EUR',
          date: '2025-01-10',
          rate: '0.8'
        }
      ],
      '250'
    ],
    [
      'GBP',
      'EUR',
      [
        {
          currencyFrom: 'GBP',
          currencyTo: 'USD',
          date: '2025-01-10',
          rate: '1.25'
        },
        {
          currencyFrom: 'USD',
          currencyTo: 'EUR',
          date: '2025-01-11',
          rate: '0.92'
        }
      ],
      '230'
    ],
    ['GBp', 'GBP', [], '2'],
    ['GBP', 'GBp', [], '20000'],
    [
      'GBp',
      'EUR',
      [
        {
          currencyFrom: 'GBP',
          currencyTo: 'EUR',
          date: '2025-01-10',
          rate: '1.2'
        }
      ],
      '2.4'
    ],
    [
      'EUR',
      'GBp',
      [
        {
          currencyFrom: 'EUR',
          currencyTo: 'GBP',
          date: '2025-01-10',
          rate: '0.8'
        }
      ],
      '16000'
    ]
  ])(
    'retains every component for %s to %s',
    (currencyFrom, currencyTo, fxQuotes, value) => {
      const dates = ['2025-01-12', '2025-01-11', '2025-01-12'];
      const prices = [{ date: '2025-01-10', price: '100' }];
      const points = dates.map((date) => ({
        date,
        displayOnly: true,
        units: new Big(2)
      })) as FinancialPoint[];
      const data = { points, prices, fxQuotes, currencyFrom, currencyTo };
      const batch = createBenchmarkDisplayValuations(data);
      expect(batch).toEqual(
        points.flatMap((point) =>
          createBenchmarkDisplayValuations({ ...data, points: [point] })
        )
      );
      for (const [i, result] of batch.entries()) {
        const conversion = convertBenchmarkPrices({
          prices: [{ date: dates[i], price: '100' }],
          fxQuotes,
          currencyFrom,
          currencyTo
        }).conversions[0];
        const market = conversion.components.filter(
          ({ kind }) => kind === 'MARKET'
        );
        expect(result.value).toBe(value);
        expect(result.fxComponents).toEqual(conversion.components);
        expect(result.fxSourceDate).toBe(
          market.length === 1 ? market[0].sourceDate : undefined
        );
      }
    }
  );
});

describe('Benchmark display financial isolation', () => {
  it.each(['ROI', 'ROAI'] as const)(
    'preserves all financial state and %s through partial and full liquidation',
    (method) => {
      const activities = [
        {
          id: 'buy',
          type: 'BUY',
          date: new Date('2025-01-10T00:00:00Z'),
          valueInBaseCurrency: 100
        },
        {
          id: 'partial',
          type: 'SELL',
          date: new Date('2025-01-13T00:00:00Z'),
          valueInBaseCurrency: 60
        },
        {
          id: 'liquidate',
          type: 'SELL',
          date: new Date('2025-01-16T00:00:00Z'),
          valueInBaseCurrency: 75
        }
      ].map((activity) => ({
        ...activity,
        assetProfile: { assetSubClass: AssetSubClass.ETF }
      })) as Activity[];
      const prices = [
        { date: '2025-01-10', price: '10' },
        { date: '2025-01-13', price: '12' },
        { date: '2025-01-16', price: '15' }
      ];
      const pipeline = runActivityMatchedBenchmarkPipeline({
        activities,
        currency: 'EUR',
        benchmarkCurrency: 'EUR',
        prices,
        fxQuotes: [],
        valuationDates: ['2025-01-11', '2025-01-14', '2025-01-17'],
        start: '2025-01-10',
        end: '2025-01-17',
        method
      });
      const before = JSON.stringify(pipeline);
      const performance = evaluateRange(
        pipeline.points,
        method,
        '2025-01-10',
        '2025-01-17'
      );
      pipeline.points.forEach(Object.freeze);
      Object.freeze(pipeline.points);
      const display = createBenchmarkDisplayValuations({
        points: pipeline.points,
        prices,
        fxQuotes: [
          {
            currencyFrom: 'EUR',
            currencyTo: 'USD',
            date: '2025-01-10',
            rate: '2'
          }
        ],
        currencyFrom: 'EUR',
        currencyTo: 'USD'
      });
      expect(display.map(({ value }) => value)).toEqual(['200', '120', '0']);
      expect(display.at(-1)?.valuationStatus).toBe('NOT_APPLICABLE');
      expect(pipeline.points.at(-1)?.units.toString()).toBe('0');
      expect(JSON.stringify(pipeline)).toBe(before);
      expect(
        evaluateRange(pipeline.points, method, '2025-01-10', '2025-01-17')
      ).toEqual(performance);
      expect(pipeline.performance).toEqual(performance);
    }
  );
});
