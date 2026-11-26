import { Activity } from '@ghostfolio/common/interfaces';
import { AssetSubClass } from '@ghostfolio/prisma/browser';

import { Big } from 'big.js';

import { FinancialPoint } from './activity-matched-benchmark';
import { runActivityMatchedBenchmarkPipeline } from './activity-matched-benchmark.pipeline';
import {
  BenchmarkDisplayValuation,
  createBenchmarkDisplayValuations
} from './benchmark-display-valuation.adapter';
import { composeBenchmarkPerformanceSeries } from './benchmark-performance-series.adapter';

function point({
  date,
  value,
  costBasis = '100',
  realizedGain = '0',
  displayOnly = false
}: {
  date: string;
  value: string;
  costBasis?: string;
  realizedGain?: string;
  displayOnly?: boolean;
}): FinancialPoint {
  return {
    date,
    ...(displayOnly ? { displayOnly: true } : {}),
    units: new Big(10),
    costBasis: new Big(costBasis),
    realizedGain: new Big(realizedGain),
    contributions: new Big(100),
    withdrawals: new Big(0),
    value: new Big(value),
    netPerformance: new Big(value).minus(costBasis).plus(realizedGain)
  };
}

function display(date: string, value: string): BenchmarkDisplayValuation {
  return {
    date,
    value,
    currency: 'EUR',
    benchmarkPriceSourceDate: date,
    fxComponents: [],
    valuationStatus: 'CURRENT'
  };
}

describe('Benchmark performance series composition', () => {
  const points = [
    point({ date: '2025-01-10', value: '100' }),
    point({
      date: '2025-01-15',
      value: '100',
      displayOnly: true
    }),
    point({
      date: '2025-01-20',
      value: '120',
      displayOnly: true
    })
  ];

  it('normalizes ROI to a display baseline', () => {
    expect(
      composeBenchmarkPerformanceSeries({
        points,
        financialCurrency: 'EUR',
        displayValuations: [
          display('2025-01-15', '120'),
          display('2025-01-20', '132')
        ],
        valuationDates: ['2025-01-15', '2025-01-20'],
        start: '2025-01-15',
        end: '2025-01-20',
        method: 'ROI'
      })
    ).toEqual([
      { date: '2025-01-15', value: 0 },
      { date: '2025-01-20', value: 10 }
    ]);
  });

  it('normalizes ROAI to a display baseline with constant capital', () => {
    expect(
      composeBenchmarkPerformanceSeries({
        points,
        financialCurrency: 'EUR',
        displayValuations: [
          display('2025-01-15', '120'),
          display('2025-01-20', '132')
        ],
        valuationDates: ['2025-01-15', '2025-01-20'],
        start: '2025-01-15',
        end: '2025-01-20',
        method: 'ROAI'
      })
    ).toEqual([
      { date: '2025-01-15', value: 0 },
      { date: '2025-01-20', value: 10 }
    ]);
  });

  it('uses independent historical FX display valuations', () => {
    expect(
      composeBenchmarkPerformanceSeries({
        points,
        financialCurrency: 'EUR',
        displayValuations: [
          display('2025-01-15', '100'),
          display('2025-01-20', '110')
        ],
        valuationDates: ['2025-01-15', '2025-01-20'],
        start: '2025-01-15',
        end: '2025-01-20',
        method: 'ROI'
      })
    ).toEqual([
      { date: '2025-01-15', value: 0 },
      { date: '2025-01-20', value: 10 }
    ]);
  });
});

describe('Non-mutating display performance projections', () => {
  const base = point({ date: '2025-01-10', value: '100' });
  const baseline = point({
    date: '2025-01-12',
    value: '100',
    displayOnly: true
  });
  const consecutive = point({
    date: '2025-01-13',
    value: '100',
    displayOnly: true
  });
  const data = (points: FinancialPoint[], method: 'ROI' | 'ROAI') => ({
    points,
    method,
    financialCurrency: 'EUR',
    displayValuations: [
      display('2025-01-12', '120'),
      display('2025-01-13', '130'),
      display('2025-01-17', '210')
    ],
    valuationDates: points
      .filter(({ date }) => date >= '2025-01-12')
      .map(({ date }) => date),
    start: '2025-01-10',
    end: '2025-01-20'
  });

  it.each([
    ['ROI', [0, 100 / 12, 0, 100 / 6, 25]],
    ['ROAI', [0, 100 / 12, 0, 20, 28.125]]
  ] as const)(
    'normalizes %s from display baseline through an additional BUY',
    (method, expected) => {
      const points = [
        base,
        baseline,
        consecutive,
        point({ date: '2025-01-15', value: '180', costBasis: '160' }),
        point({
          date: '2025-01-17',
          value: '180',
          costBasis: '160',
          displayOnly: true
        }),
        point({ date: '2025-01-20', value: '225', costBasis: '160' })
      ];
      const result = composeBenchmarkPerformanceSeries(data(points, method));
      result.forEach(({ value }, i) =>
        expect(value).toBeCloseTo(expected[i], 10)
      );
    }
  );

  it.each([
    ['ROI', 12.5],
    ['ROAI', (100 * 15) / (780 / 9)]
  ] as const)(
    'handles a partial SELL after a display baseline for %s',
    (method, expected) => {
      const points = [
        base,
        baseline,
        point({
          date: '2025-01-15',
          value: '60',
          costBasis: '50',
          realizedGain: '10'
        }),
        point({
          date: '2025-01-20',
          value: '75',
          costBasis: '50',
          realizedGain: '10'
        })
      ];
      const result = composeBenchmarkPerformanceSeries(data(points, method));
      expect(result.map(({ value }) => value).slice(0, 2)).toEqual([0, 0]);
      expect(result.at(-1)?.value).toBeCloseTo(expected, 10);
    }
  );

  it.each([
    ['ROI', 100 / 12],
    ['ROAI', 15]
  ] as const)(
    'preserves liquidation and excludes the zero-investment interval before reinvestment for %s',
    (method, expected) => {
      const points = [
        base,
        baseline,
        point({
          date: '2025-01-15',
          value: '0',
          costBasis: '0',
          realizedGain: '20'
        }),
        point({
          date: '2025-01-17',
          value: '0',
          costBasis: '0',
          realizedGain: '20',
          displayOnly: true
        }),
        point({
          date: '2025-01-18',
          value: '60',
          costBasis: '60',
          realizedGain: '20'
        }),
        point({
          date: '2025-01-20',
          value: '75',
          costBasis: '60',
          realizedGain: '20'
        })
      ];
      const input = data(points, method);
      input.displayValuations[2] = {
        ...display('2025-01-17', '0'),
        valuationStatus: 'NOT_APPLICABLE'
      };
      const result = composeBenchmarkPerformanceSeries(input);
      expect(result.slice(0, 4).map(({ value }) => value)).toEqual([
        0, 0, 0, 0
      ]);
      expect(result.at(-1)?.value).toBeCloseTo(expected, 10);
    }
  );

  it.each(['ROI', 'ROAI'] as const)(
    'processes unrequested financial events and preserves frozen inputs for %s',
    (method) => {
      const points = [
        base,
        baseline,
        point({ date: '2025-01-15', value: '180', costBasis: '160' }),
        point({
          date: '2025-01-17',
          value: '180',
          costBasis: '160',
          displayOnly: true
        }),
        point({ date: '2025-01-20', value: '225', costBasis: '160' })
      ];
      const input = data(points, method);
      input.valuationDates = ['2025-01-20', '2025-01-12', '2025-01-20'];
      const before = JSON.stringify(input);
      for (const array of [input.points, input.displayValuations]) {
        array.forEach(Object.freeze);
        Object.freeze(array);
      }
      Object.freeze(input.valuationDates);
      const result = composeBenchmarkPerformanceSeries(input);
      expect(result.map(({ date }) => date)).toEqual([
        '2025-01-12',
        '2025-01-20'
      ]);
      expect(result[1].value).toBeCloseTo(method === 'ROI' ? 25 : 28.125, 10);
      expect(composeBenchmarkPerformanceSeries(input)).toEqual(result);
      expect(JSON.stringify(input)).toBe(before);
    }
  );

  it('uses the financial point on a collision and ignores an unrelated display value', () => {
    const input = data(
      [base, point({ date: '2025-01-20', value: '120' })],
      'ROI'
    );
    input.valuationDates = ['2025-01-10', '2025-01-20'];
    input.displayValuations = [display('2025-01-20', '999')];
    expect(composeBenchmarkPerformanceSeries(input)).toEqual([
      { date: '2025-01-10', value: 0 },
      { date: '2025-01-20', value: 20 }
    ]);
  });

  it.each(['ROI', 'ROAI'] as const)(
    'preserves zero-capital convention for %s',
    (method) => {
      const points = [
        point({ date: '2025-01-10', value: '0', costBasis: '0' }),
        point({
          date: '2025-01-12',
          value: '0',
          costBasis: '0',
          displayOnly: true
        })
      ];
      const input = data(points, method);
      input.valuationDates = points.map(({ date }) => date);
      input.displayValuations = [
        { ...display('2025-01-12', '0'), valuationStatus: 'NOT_APPLICABLE' }
      ];
      expect(
        composeBenchmarkPerformanceSeries(input).map(({ value }) => value)
      ).toEqual([0, 0]);
      expect(
        composeBenchmarkPerformanceSeries({ ...input, valuationDates: [] })
      ).toEqual([]);
    }
  );

  it.each(['missing-point', 'missing-display', 'stale', 'currency'])(
    'rejects %s instead of silently substituting a valuation',
    (kind) => {
      const input = data([base, baseline], 'ROI');
      if (kind === 'missing-point') input.valuationDates = ['2025-01-11'];
      if (kind === 'missing-display') input.displayValuations = [];
      if (kind === 'stale')
        input.displayValuations[0].valuationStatus = 'STALE';
      if (kind === 'currency') input.displayValuations[0].currency = 'USD';
      expect(() => composeBenchmarkPerformanceSeries(input)).toThrow(
        kind === 'missing-point'
          ? 'Missing benchmark point: 2025-01-11'
          : kind === 'missing-display'
            ? 'Missing display valuation: 2025-01-12'
            : kind === 'stale'
              ? 'Stale display valuation: 2025-01-12'
              : 'Display currency mismatch: 2025-01-12'
      );
    }
  );
});

describe('Historical FX display projections on a real pipeline', () => {
  it.each(['ROI', 'ROAI'] as const)(
    'keeps pipeline state intact while FX changes with a constant benchmark price for %s',
    (method) => {
      const prices = [
        { date: '2025-01-10', price: '100' },
        { date: '2025-01-15', price: '100' }
      ];
      const fxQuotes = [
        { date: '2025-01-10', rate: '1' },
        { date: '2025-01-12', rate: '1.2' },
        { date: '2025-01-13', rate: '1.32' },
        { date: '2025-01-15', rate: '1.4' }
      ].map((quote) => ({ ...quote, currencyFrom: 'USD', currencyTo: 'EUR' }));
      const pipeline = runActivityMatchedBenchmarkPipeline({
        activities: [
          {
            id: 'buy',
            type: 'BUY',
            date: new Date('2025-01-10T00:00:00Z'),
            valueInBaseCurrency: 100,
            assetProfile: { assetSubClass: AssetSubClass.ETF }
          } as Activity
        ],
        prices,
        fxQuotes,
        currency: 'EUR',
        benchmarkCurrency: 'USD',
        valuationDates: ['2025-01-12', '2025-01-13'],
        start: '2025-01-10',
        end: '2025-01-15',
        method
      });
      const before = JSON.stringify(pipeline);
      const displayValuations = createBenchmarkDisplayValuations({
        points: pipeline.points,
        prices,
        fxQuotes,
        currencyFrom: 'USD',
        currencyTo: 'EUR'
      });
      const result = composeBenchmarkPerformanceSeries({
        points: pipeline.points,
        financialCurrency: 'EUR',
        displayValuations,
        valuationDates: ['2025-01-12', '2025-01-13', '2025-01-15'],
        start: '2025-01-12',
        end: '2025-01-15',
        method
      });
      expect(result.map(({ date }) => date)).toEqual([
        '2025-01-12',
        '2025-01-13',
        '2025-01-15'
      ]);
      expect(result[0].value).toBe(0);
      expect(result[1].value).toBe(10);
      expect(result[2].value).toBeCloseTo(100 / 6, 10);
      expect(pipeline.performance.at(-1)?.returnFraction.toString()).toBe(
        '0.4'
      );
      expect(JSON.stringify(pipeline)).toBe(before);
      expect(displayValuations.map(({ currency }) => currency)).toEqual([
        'EUR',
        'EUR'
      ]);
      const wrongCurrency = createBenchmarkDisplayValuations({
        points: pipeline.points,
        prices,
        fxQuotes,
        currencyFrom: 'USD',
        currencyTo: 'USD'
      });
      expect(() =>
        composeBenchmarkPerformanceSeries({
          points: pipeline.points,
          financialCurrency: 'EUR',
          displayValuations: wrongCurrency,
          valuationDates: ['2025-01-12'],
          start: '2025-01-12',
          end: '2025-01-15',
          method
        })
      ).toThrow('Display currency mismatch');
    }
  );
});

describe('Display history validation', () => {
  it('requires financial history before projecting an active position', () => {
    expect(() =>
      composeBenchmarkPerformanceSeries({
        points: [
          point({ date: '2025-01-12', value: '100', displayOnly: true })
        ],
        financialCurrency: 'EUR',
        displayValuations: [display('2025-01-12', '120')],
        valuationDates: ['2025-01-12'],
        start: '2025-01-12',
        end: '2025-01-12',
        method: 'ROI'
      })
    ).toThrow('Missing financial baseline: 2025-01-12');
  });

  it.each(['bad', '-1'])('rejects invalid display value %s', (value) => {
    expect(() =>
      composeBenchmarkPerformanceSeries({
        points: [
          point({ date: '2025-01-10', value: '100' }),
          point({ date: '2025-01-12', value: '100', displayOnly: true })
        ],
        financialCurrency: 'EUR',
        displayValuations: [display('2025-01-12', value)],
        valuationDates: ['2025-01-12'],
        start: '2025-01-10',
        end: '2025-01-12',
        method: 'ROI'
      })
    ).toThrow('Invalid display value: 2025-01-12');
  });
});
