import { Big } from 'big.js';

import {
  evaluateRange,
  simulateBenchmark,
  normalizeBenchmarkInput,
  simulateNormalizedBenchmark
} from './activity-matched-benchmark';

const dates = ['2024-01-01', '2024-01-02', '2024-01-03'];
function run(
  amounts: string[],
  prices: string[] = ['10', '10', '12'],
  chart = dates
) {
  return simulateBenchmark({
    flows: amounts.map((amount, index) => ({ date: dates[index], amount })),
    prices: prices.map((price, index) => ({ date: dates[index], price })),
    valuationDates: chart
  });
}
function result(
  points: ReturnType<typeof run>,
  method: 'ROI' | 'ROAI',
  start = dates[0]
) {
  return evaluateRange(points, method, start, dates[2]).at(-1);
}

describe('isolated Activity investment-proxy benchmark', () => {
  it.each([
    [['100'], ['10', '10', '12'], 20, 100, 100, 0.2, 0.2],
    [['100', '100'], ['10', '10', '12'], 40, 200, 500 / 3, 0.2, 0.24],
    [['100', '-50'], ['10', '10', '12'], 10, 100, 200 / 3, 0.1, 0.15],
    [['100', '-120'], ['10', '12', '12'], 20, 100, 100, 0.2, 0.2],
    // Sale at a profit removes 50 cost, not 60 proceeds.
    [['100', '-60'], ['10', '12', '14'], 30, 100, 200 / 3, 0.3, 0.45],
    [['100', '-80'], ['10', '8', '8'], -20, 100, 100, -0.2, -0.2],
    [
      ['100', '-120', '120'],
      ['10', '12', '12'],
      20,
      220,
      110,
      20 / 220,
      20 / 110
    ]
  ])(
    'calculates independent financial fixture %#',
    (amounts, prices, gain, roiCapital, roaiCapital, roi, roai) => {
      const points = run(amounts as string[], prices as string[]);
      expect(points.at(-1).netPerformance.toNumber()).toBeCloseTo(
        gain as number,
        12
      );
      expect(result(points, 'ROI').capital.toNumber()).toBeCloseTo(
        roiCapital as number,
        12
      );
      expect(result(points, 'ROAI').capital.toNumber()).toBeCloseTo(
        roaiCapital as number,
        12
      );
      expect(result(points, 'ROI').returnFraction.toNumber()).toBeCloseTo(
        roi as number,
        12
      );
      expect(result(points, 'ROAI').returnFraction.toNumber()).toBeCloseTo(
        roai as number,
        12
      );
    }
  );

  it('keeps units, average cost, realized gains and cumulative funding separate', () => {
    const point = run(['100', '-60'], ['10', '12', '14']).at(-1);
    expect(
      [
        point.units,
        point.costBasis,
        point.realizedGain,
        point.contributions,
        point.withdrawals,
        point.value
      ].map(String)
    ).toEqual(['5', '50', '10', '100', '60', '70']);
  });

  it('supports fractional units and clears complete withdrawals', () => {
    const points = simulateBenchmark({
      flows: [
        { date: dates[0], amount: '10' },
        { date: dates[1], kind: 'liquidate' }
      ],
      prices: dates.map((date, i) => ({ date, price: ['3', '3.6', '4'][i] })),
      valuationDates: dates
    });
    expect(points[0].units.toNumber()).toBeCloseTo(10 / 3, 14);
    expect(points.at(-1).units.eq(0)).toBe(true);
    expect(points.at(-1).costBasis.eq(0)).toBe(true);
  });

  it('nets same-day cost changes for ROI while retaining execution order', () => {
    const points = simulateBenchmark({
      flows: [
        { date: dates[0], amount: '100' },
        { date: dates[1], amount: '-120' },
        { date: dates[1], amount: '120' }
      ],
      prices: dates.map((date, index) => ({
        date,
        price: index ? '12' : '10'
      })),
      valuationDates: dates
    });
    expect(result(points, 'ROI').capital.toString()).toBe('120');
    expect(result(points, 'ROI').returnFraction.toNumber()).toBeCloseTo(
      1 / 6,
      14
    );
  });

  it('normalizes selected ranges to opening value and subtracts prior gains', () => {
    const points = run(['100'], ['10', '12', '13.2']);
    for (const method of ['ROI', 'ROAI'] as const) {
      const value = result(points, method, dates[1]);
      expect(value.capital.toString()).toBe('120');
      expect(value.netPerformance.toString()).toBe('12');
      expect(value.returnFraction.toString()).toBe('0.1');
    }
  });

  it('retains event dates between sparse chart dates', () => {
    const dense = run(['100', '100']);
    const sparse = run(
      ['100', '100'],
      ['10', '10', '12'],
      [dates[0], dates[2]]
    );
    expect(sparse).toEqual(dense);
    expect(result(sparse, 'ROAI').returnFraction.toString()).toBe('0.24');
  });

  it('matches upstream range weighting on irregular observations', () => {
    const points = simulateBenchmark({
      flows: [
        { date: dates[0], amount: '100' },
        { date: dates[2], amount: '100' }
      ],
      prices: [
        { date: dates[0], price: '10' },
        { date: dates[2], price: '10' },
        { date: '2024-01-06', price: '12' }
      ],
      valuationDates: ['2024-01-06']
    });
    const last = evaluateRange(points, 'ROAI', dates[0], '2024-01-06').at(-1);
    // (100 * 2 + 200 * 3 + 200) / 6
    expect(last.capital.toNumber()).toBeCloseTo(1000 / 6, 12);
    expect(last.returnFraction.toNumber()).toBeCloseTo(0.24, 12);
  });

  it('handles empty, flat and single-point ranges', () => {
    expect(evaluateRange([], 'ROI', dates[0], dates[2])).toEqual([]);
    const empty = simulateBenchmark({
      flows: [],
      prices: [],
      valuationDates: dates
    });
    expect(result(empty, 'ROAI').returnFraction.eq(0)).toBe(true);
    expect(result(run(['100']), 'ROI', dates[2]).returnFraction.eq(0)).toBe(
      true
    );
  });

  it('rejects missing execution quotes, excess withdrawals and invalid dates/prices', () => {
    expect(() => run(['100', '-101'])).toThrow('Insufficient capital');
    expect(() =>
      simulateBenchmark({
        flows: [{ date: dates[1], amount: '1' }],
        prices: [{ date: dates[0], price: '10' }],
        valuationDates: dates
      })
    ).toThrow('Missing execution');
    expect(() => run(['100'], ['0'])).toThrow('positive');
    expect(() =>
      simulateBenchmark({
        flows: [],
        prices: [],
        valuationDates: ['2024-02-30']
      })
    ).toThrow('Invalid date');
    expect(() =>
      evaluateRange(run(['100']), 'ROI', dates[2], dates[0])
    ).toThrow('Reversed');
  });

  it('uses preceding prices for valuation without looking ahead', () => {
    const points = simulateBenchmark({
      flows: [{ date: dates[0], amount: '100' }],
      prices: [
        { date: dates[0], price: '10' },
        { date: dates[2], price: '20' }
      ],
      valuationDates: dates
    });
    expect(points[1].value.eq(new Big(100))).toBe(true);
  });
});

describe('liquidation precision and financial timeline hardening', () => {
  const input = (
    flows: Parameters<typeof simulateBenchmark>[0]['flows'],
    valuationDates = dates
  ) => ({
    flows,
    prices: dates.map((date) => ({ date, price: '1' })),
    valuationDates
  });

  it.each([0, 2, 20, 40])(
    'explicit liquidation closes fractional positions at Big.DP=%i',
    (precision) => {
      const saved = { DP: Big.DP, RM: Big.RM };
      try {
        Big.DP = precision;
        Big.RM = 0;
        const points = simulateBenchmark({
          flows: [
            { date: dates[0], amount: '10' },
            { date: dates[1], kind: 'liquidate' }
          ],
          prices: [
            { date: dates[0], price: '3' },
            { date: dates[1], price: '3.6' }
          ],
          valuationDates: []
        });
        const last = points.at(-1);
        const proceeds = points[0].units.mul('3.6');
        expect(last.units.toString()).toBe('0');
        expect(last.costBasis.toString()).toBe('0');
        expect(last.withdrawals.eq(proceeds)).toBe(true);
        expect(last.realizedGain.eq(proceeds.minus(10))).toBe(true);
        expect(
          last.netPerformance.eq(last.withdrawals.minus(last.contributions))
        ).toBe(true);
      } finally {
        Big.DP = saved.DP;
        Big.RM = saved.RM;
      }
    }
  );

  it('preserves a small partial residual without treating it as a full close', () => {
    const point = simulateBenchmark(
      input([
        { date: dates[0], amount: '1' },
        { date: dates[1], amount: '-0.9999999999999999999' }
      ])
    ).at(-1);
    expect(point.units.eq('1e-19')).toBe(true);
    expect(point.costBasis.eq('1e-19')).toBe(true);
    expect(point.withdrawals.eq('0.9999999999999999999')).toBe(true);
  });

  it.each(['-1.00000000000000000001', '-1.000000000000000001', '-1.01'])(
    'strictly rejects overspending %s, including the former tolerance window',
    (amount) => {
      expect(() =>
        simulateBenchmark(
          input([
            { date: dates[0], amount: '1' },
            { date: dates[1], amount }
          ])
        )
      ).toThrow('Insufficient capital');
    }
  );

  it('requires explicit full-close intent when nominal proceeds exceed rounded units', () => {
    expect(() => run(['10', '-12'], ['3', '3.6', '4'])).toThrow(
      'Insufficient capital'
    );
  });

  it.each([2, 20])(
    'rejects a partial sale lost to division rounding at DP=%i',
    (precision) => {
      const saved = Big.DP;
      try {
        Big.DP = precision;
        const amount = `-0.${'9'.repeat(precision + 2)}`;
        expect(() =>
          simulateBenchmark(
            input([
              { date: dates[0], amount: '1' },
              { date: dates[1], amount }
            ])
          )
        ).toThrow('Insufficient division precision');
      } finally {
        Big.DP = saved;
      }
    }
  );

  it('rejects contradictory liquidation instructions and permits closing an empty position', () => {
    expect(() =>
      simulateBenchmark(
        input([{ date: dates[0], kind: 'liquidate', amount: '-1' } as never])
      )
    ).toThrow('must not specify');
    expect(
      simulateBenchmark(input([{ date: dates[0], kind: 'liquidate' }]))
        .at(-1)
        .withdrawals.eq(0)
    ).toBe(true);
  });

  it('cannot silently lose a purchase at insufficient division precision', () => {
    const saved = Big.DP;
    try {
      Big.DP = 0;
      expect(() =>
        simulateBenchmark({
          flows: [{ date: dates[0], amount: '1' }],
          prices: [{ date: dates[0], price: '100' }],
          valuationDates: []
        })
      ).toThrow('Insufficient division precision');
    } finally {
      Big.DP = saved;
    }
  });

  it('uses canonical prices and events for identical sparse/dense selected ranges', () => {
    const day = (n: number) => `2024-01-${String(n).padStart(2, '0')}`;
    const flows = [
      { date: day(1), amount: '100' },
      { date: day(4), amount: '-40' },
      { date: day(4), amount: '20' },
      { date: day(8), amount: '60' }
    ];
    const prices = [1, 4, 7, 8, 12].map((n) => ({
      date: day(n),
      price: String(10 + n)
    }));
    const dense = simulateBenchmark({
      flows,
      prices,
      valuationDates: Array.from({ length: 12 }, (_, i) => day(i + 1))
    });
    const sparse = simulateBenchmark({
      flows,
      prices,
      valuationDates: [day(1), day(12)]
    });
    expect(dense.filter((point) => !point.displayOnly)).toEqual(sparse);
    expect(dense.at(-1).contributions.toString()).toBe('180');
    expect(dense.at(-1).withdrawals.toString()).toBe('40');
    for (const method of ['ROI', 'ROAI'] as const) {
      for (const [start, end] of [
        [1, 12],
        [2, 11],
        [5, 12],
        [7, 7]
      ]) {
        expect(evaluateRange(dense, method, day(start), day(end))).toEqual(
          evaluateRange(sparse, method, day(start), day(end))
        );
      }
    }
    // First available financial observation in [Jan 5, Jan 12] is Jan 7.
    expect(evaluateRange(dense, 'ROAI', day(5), day(12))[0].date).toBe(day(7));
  });

  it('retains irregular positive-investment days around full liquidation and reinvestment', () => {
    const points = simulateBenchmark({
      flows: [
        { date: '2024-01-01', amount: '100' },
        { date: '2024-01-04', kind: 'liquidate' },
        { date: '2024-01-10', amount: '200' }
      ],
      prices: [
        { date: '2024-01-01', price: '10' },
        { date: '2024-01-04', price: '12' },
        { date: '2024-01-10', price: '10' },
        { date: '2024-01-12', price: '11' }
      ],
      valuationDates: ['2024-01-06']
    });
    const last = evaluateRange(points, 'ROAI', '2024-01-01', '2024-01-12').at(
      -1
    );
    // Three days at 100, two at 200 and one endpoint day at 200;
    // six liquidated days are excluded: (300+400+200)/6 = 150.
    expect(last.capital.toString()).toBe('150');
    expect(last.netPerformance.toString()).toBe('40');
    expect(last.returnFraction.toNumber()).toBeCloseTo(40 / 150, 14);
  });
});

describe('normalization stage and precision boundaries', () => {
  it('reuses normalized input without changing financial results or input order', () => {
    const input = {
      flows: [
        { date: dates[1], amount: '-1' },
        { date: dates[0], amount: '10' }
      ],
      prices: [
        { date: dates[2], price: '4' },
        { date: dates[0], price: '3' },
        { date: dates[1], price: '3.6' }
      ],
      valuationDates: [dates[2], dates[0]]
    };
    const original = JSON.stringify(input);
    const normalized = normalizeBenchmarkInput(input);
    const first = simulateNormalizedBenchmark(normalized);
    expect(simulateNormalizedBenchmark(normalized)).toEqual(first);
    expect(simulateBenchmark(input)).toEqual(first);
    expect(JSON.stringify(input)).toBe(original);
  });

  it.each([0, 1, 2, 3] as const)(
    'explicit close uses actual units under rounding mode %i',
    (rounding) => {
      const saved = { DP: Big.DP, RM: Big.RM };
      try {
        Big.DP = 2;
        Big.RM = rounding;
        const points = simulateBenchmark({
          flows: [
            { date: dates[0], amount: '1' },
            { date: dates[1], kind: 'liquidate' }
          ],
          prices: [
            { date: dates[0], price: '3' },
            { date: dates[1], price: '3.7' }
          ],
          valuationDates: []
        });
        expect(points.at(-1).withdrawals.eq(points[0].units.mul('3.7'))).toBe(
          true
        );
        expect(points.at(-1).units.eq(0)).toBe(true);
        expect(points.at(-1).costBasis.eq(0)).toBe(true);
      } finally {
        Big.DP = saved.DP;
        Big.RM = saved.RM;
      }
    }
  );
});
