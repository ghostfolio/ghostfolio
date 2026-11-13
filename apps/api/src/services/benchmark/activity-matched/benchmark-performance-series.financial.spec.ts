import {
  evaluateRange,
  InvestmentProxyFlow,
  simulateBenchmark
} from './activity-matched-benchmark';
import { createBenchmarkDisplayValuations } from './benchmark-display-valuation.adapter';
import { composeBenchmarkPerformanceSeries } from './benchmark-performance-series.adapter';

describe('Benchmark performance series financial characterization', () => {
  const dates = ['2025-01-10', '2025-01-15', '2025-01-20'];

  function characterize({
    flows,
    prices,
    method
  }: {
    flows: InvestmentProxyFlow[];
    prices: string[];
    method: 'ROI' | 'ROAI';
  }) {
    const points = simulateBenchmark({
      flows,
      prices: dates.map((date, index) => ({
        date,
        price: prices[index]
      })),
      valuationDates: dates
    });

    const expected = evaluateRange(points, method, dates[0], dates[2]).map(
      ({ date, returnFraction }) => ({
        date,
        value: returnFraction.mul(100).toNumber()
      })
    );

    const actual = composeBenchmarkPerformanceSeries({
      points,
      financialCurrency: 'EUR',
      displayValuations: [],
      valuationDates: dates,
      start: dates[0],
      end: dates[2],
      method
    });

    return { actual, expected, points };
  }

  describe('mixed financial and display observations', () => {
    it.each(['ROI', 'ROAI'] as const)(
      'preserves %s on financial dates when display dates are added',
      (method) => {
        const points = simulateBenchmark({
          flows: [
            { date: dates[0], amount: '100' },
            { date: dates[1], amount: '60' }
          ],
          prices: dates.map((date, index) => ({
            date,
            price: ['10', '12', '15'][index]
          })),
          valuationDates: [...dates, '2025-01-12', '2025-01-17']
        });

        const financialReference = evaluateRange(
          points,
          method,
          dates[0],
          dates[2]
        );

        const displayValuations = points
          .filter(({ displayOnly }) => displayOnly)
          .map(({ date, value }) => ({
            date,
            currency: 'EUR',
            value: value.toString(),
            benchmarkPriceSourceDate: date,
            fxComponents: [],
            valuationStatus: 'CURRENT' as const
          }));

        const actual = composeBenchmarkPerformanceSeries({
          points,
          financialCurrency: 'EUR',
          displayValuations,
          valuationDates: [...dates, '2025-01-12', '2025-01-17'],
          start: dates[0],
          end: dates[2],
          method
        });

        for (const reference of financialReference) {
          const observation = actual.find(
            ({ date }) => date === reference.date
          );

          expect(observation).toBeDefined();

          expect(observation.value).toBeCloseTo(
            reference.returnFraction.mul(100).toNumber(),
            10
          );
        }
      }
    );
  });

  describe('independent financial reference assertions', () => {
    const scenarios = [
      {
        name: 'additional BUY',
        flows: [
          { date: dates[0], amount: '100' },
          { date: dates[1], amount: '60' }
        ] as InvestmentProxyFlow[],
        expected: {
          ROI: {
            capital: ['100', '160', '160'],
            netPerformance: ['0', '20', '65'],
            percentages: [0, 12.5, 40.625]
          },
          ROAI: {
            capital: [100, 110, 132.72727272727272],
            netPerformance: ['0', '20', '65'],
            percentages: [0, 18.18181818181818, 48.97260273972603]
          }
        }
      },
      {
        name: 'partial SELL',
        flows: [
          { date: dates[0], amount: '100' },
          { date: dates[1], amount: '-60' }
        ] as InvestmentProxyFlow[],
        expected: {
          ROI: {
            capital: ['100', '100', '100'],
            netPerformance: ['0', '20', '35'],
            percentages: [0, 20, 35]
          },
          ROAI: {
            capital: [100, 91.66666666666667, 72.72727272727273],
            netPerformance: ['0', '20', '35'],
            percentages: [0, 21.81818181818182, 48.125]
          }
        }
      },
      {
        name: 'complete liquidation',
        flows: [
          { date: dates[0], amount: '100' },
          { date: dates[1], kind: 'liquidate' }
        ] as InvestmentProxyFlow[],
        expected: {
          ROI: {
            capital: ['100', '100', '100'],
            netPerformance: ['0', '20', '20'],
            percentages: [0, 20, 20]
          },
          ROAI: {
            capital: [100, 100, 100],
            netPerformance: ['0', '20', '20'],
            percentages: [0, 20, 20]
          }
        }
      }
    ];

    it.each(scenarios)(
      'preserves financial results after consecutive display projections for $name',
      ({ flows }) => {
        const requested = [
          ...dates,
          '2025-01-12',
          '2025-01-13',
          '2025-01-17'
        ].sort();
        const points = simulateBenchmark({
          flows,
          prices: dates.map((date, i) => ({
            date,
            price: ['10', '12', '15'][i]
          })),
          valuationDates: requested
        });
        const before = JSON.stringify(points);
        const displayValuations = points
          .filter(({ displayOnly }) => displayOnly)
          .map(({ date, value, units }) => ({
            date,
            currency: 'EUR',
            value: value.plus(units.gt(0) ? 7 : 0).toString(),
            benchmarkPriceSourceDate: date,
            fxComponents: [],
            valuationStatus: 'CURRENT' as const
          }));
        for (const method of ['ROI', 'ROAI'] as const) {
          const reference = evaluateRange(points, method, dates[0], dates[2]);
          const result = composeBenchmarkPerformanceSeries({
            points,
            financialCurrency: 'EUR',
            displayValuations,
            valuationDates: requested,
            start: dates[0],
            end: dates[2],
            method
          });
          expect(result.filter(({ date }) => dates.includes(date))).toEqual(
            reference.map(({ date, returnFraction }) => ({
              date,
              value: returnFraction.mul(100).toNumber()
            }))
          );
          expect(evaluateRange(points, method, dates[0], dates[2])).toEqual(
            reference
          );
        }
        expect(JSON.stringify(points)).toBe(before);
      }
    );

    it.each(scenarios)(
      'preserves characterized ROI and ROAI for $name',
      ({ flows, expected }) => {
        const points = simulateBenchmark({
          flows,
          prices: dates.map((date, index) => ({
            date,
            price: ['10', '12', '15'][index]
          })),
          valuationDates: dates
        });

        for (const method of ['ROI', 'ROAI'] as const) {
          const performance = evaluateRange(points, method, dates[0], dates[2]);

          const reference = expected[method];

          expect(performance.map(({ date }) => date)).toEqual(dates);

          expect(
            performance.map(({ netPerformance }) => netPerformance.toString())
          ).toEqual(reference.netPerformance);

          performance.forEach((result, index) => {
            expect(result.capital.toNumber()).toBeCloseTo(
              Number(reference.capital[index]),
              10
            );

            expect(result.returnFraction.mul(100).toNumber()).toBeCloseTo(
              reference.percentages[index],
              10
            );
          });
        }
      }
    );
  });

  it.each(['ROI', 'ROAI'] as const)(
    'matches %s after an additional BUY',
    (method) => {
      const { actual, expected } = characterize({
        flows: [
          { date: dates[0], amount: '100' },
          { date: dates[1], amount: '60' }
        ],
        prices: ['10', '12', '15'],
        method
      });

      expect(actual).toEqual(expected);
    }
  );

  it.each(['ROI', 'ROAI'] as const)(
    'matches %s after a partial SELL',
    (method) => {
      const { actual, expected, points } = characterize({
        flows: [
          { date: dates[0], amount: '100' },
          { date: dates[1], amount: '-60' }
        ],
        prices: ['10', '12', '15'],
        method
      });

      expect(points.at(-1)?.realizedGain.toString()).toBe('10');
      expect(actual).toEqual(expected);
    }
  );

  it.each(['ROI', 'ROAI'] as const)(
    'matches %s after complete liquidation',
    (method) => {
      const { actual, expected, points } = characterize({
        flows: [
          { date: dates[0], amount: '100' },
          { date: dates[1], kind: 'liquidate' }
        ],
        prices: ['10', '12', '15'],
        method
      });

      expect(points.at(-1)?.units.toString()).toBe('0');
      expect(points.at(-1)?.realizedGain.toString()).toBe('20');
      expect(actual).toEqual(expected);
    }
  );
});

describe('Financial qualification of display baselines', () => {
  function fixture({
    flows,
    prices,
    dates,
    displayRates
  }: {
    flows: InvestmentProxyFlow[];
    prices: { date: string; price: string }[];
    dates: string[];
    displayRates: { date: string; rate: string }[];
  }) {
    // At financial dates USD/EUR = 1, so these execution prices are also EUR.
    // Independent display prices use the last USD quote and historical FX;
    // no new price dates or economic events are inserted into financial history.
    const points = simulateBenchmark({ flows, prices, valuationDates: dates });
    const displayValuations = createBenchmarkDisplayValuations({
      points,
      prices,
      currencyFrom: 'USD',
      currencyTo: 'EUR',
      fxQuotes: [
        ...prices.map(({ date }) => ({ date, rate: '1' })),
        ...displayRates
      ].map((quote) => ({ ...quote, currencyFrom: 'USD', currencyTo: 'EUR' }))
    });
    return { points, displayValuations };
  }

  function state(points: ReturnType<typeof simulateBenchmark>, date: string) {
    const point = points.find((point) => point.date === date);
    expect(point).toBeDefined();
    return {
      units: point.units.toString(),
      costBasis: point.costBasis.toString(),
      realizedGain: point.realizedGain.toString(),
      contributions: point.contributions.toString(),
      withdrawals: point.withdrawals.toString()
    };
  }

  function verifyIsolation(
    dense: ReturnType<typeof fixture>,
    sparse: ReturnType<typeof fixture>,
    dates: string[],
    method: 'ROI' | 'ROAI'
  ) {
    const input = {
      ...dense,
      financialCurrency: 'EUR',
      valuationDates: dates,
      start: dates[0],
      end: dates[dates.length - 1],
      method
    };
    const before = JSON.stringify(input);
    for (const array of [input.points, input.displayValuations]) {
      array.forEach(Object.freeze);
      Object.freeze(array);
    }
    Object.freeze(input.valuationDates);
    const financial = evaluateRange(
      dense.points,
      method,
      input.start,
      input.end
    );
    const result = composeBenchmarkPerformanceSeries(input);
    expect(composeBenchmarkPerformanceSeries(input)).toEqual(result);
    const sparseDates = dates.filter((date) =>
      sparse.points.some((point) => point.date === date)
    );
    const sparseResult = composeBenchmarkPerformanceSeries({
      ...input,
      ...sparse,
      valuationDates: sparseDates
    });
    expect(result.filter(({ date }) => sparseDates.includes(date))).toEqual(
      sparseResult
    );
    expect(dense.points.filter(({ displayOnly }) => !displayOnly)).toEqual(
      sparse.points.filter(({ displayOnly }) => !displayOnly)
    );
    // This is an additional invariance oracle, not the oracle for display returns.
    expect(evaluateRange(dense.points, method, input.start, input.end)).toEqual(
      financial
    );
    expect(
      evaluateRange(sparse.points, method, input.start, input.end)
    ).toEqual(financial);
    const financialDates = dense.points
      .filter(
        ({ displayOnly, date }) =>
          !displayOnly && date >= input.start && date <= input.end
      )
      .map(({ date }) => date);
    expect(
      composeBenchmarkPerformanceSeries({
        ...input,
        valuationDates: financialDates
      })
    ).toEqual(
      financial.map(({ date, returnFraction }) => ({
        date,
        value: returnFraction.mul(100).toNumber()
      }))
    );
    expect(JSON.stringify(input)).toBe(before);
    return result;
  }

  it.each(['ROI', 'ROAI'] as const)(
    'qualifies scenario A: realized gains before a partial-liquidation display baseline (%s)',
    (method) => {
      const flows: InvestmentProxyFlow[] = [
        { date: '2025-01-01', amount: '100' },
        { date: '2025-01-03', amount: '-60' },
        { date: '2025-01-08', amount: '-30' }
      ];
      const prices = [
        { date: '2025-01-01', price: '10' },
        { date: '2025-01-03', price: '12' },
        { date: '2025-01-08', price: '15' },
        { date: '2025-01-10', price: '16' }
      ];
      const dates = [
        '2025-01-04',
        '2025-01-05',
        '2025-01-06',
        '2025-01-08',
        '2025-01-10'
      ];
      const displayRates = [
        { date: dates[0], rate: '1.1' },
        { date: dates[1], rate: '1.15' },
        { date: dates[2], rate: '1.2' }
      ];
      const dense = fixture({ flows, prices, dates, displayRates });
      const sparse = fixture({
        flows,
        prices,
        dates: dates.filter((date) => date !== '2025-01-05'),
        displayRates
      });
      expect(state(dense.points, '2025-01-01')).toEqual({
        units: '10',
        costBasis: '100',
        realizedGain: '0',
        contributions: '100',
        withdrawals: '0'
      });
      const afterSale = {
        units: '5',
        costBasis: '50',
        realizedGain: '10',
        contributions: '100',
        withdrawals: '60'
      };
      expect(state(dense.points, '2025-01-03')).toEqual(afterSale);
      for (const date of dates.slice(0, 3))
        expect(state(dense.points, date)).toEqual(afterSale);
      expect(state(dense.points, '2025-01-08')).toEqual({
        units: '3',
        costBasis: '30',
        realizedGain: '20',
        contributions: '100',
        withdrawals: '90'
      });
      expect(dense.displayValuations.map(({ value }) => value)).toEqual([
        '66',
        '69',
        '72'
      ]);
      expect(
        dense.points.find(({ date }) => date === dates[0])?.displayOnly
      ).toBe(true);
      const result = verifyIsolation(dense, sparse, dates, method);
      expect(result.map(({ date }) => date)).toEqual(dates);
      expect(result[0].value).toBe(0);
      // Before the range: 10 units bought for 100; sell 5 at 12 => realized 10.
      // Baseline V=66, C=50, R=10: opening cumulative gain is 26 (not 16).
      // Period gains at Jan 5/6/8/10 are 3/6/9/12, excluding that entire 26.
      // ROI capital remains 66 after the second sale.
      // ROAI: openingGain=16; Jan 8 capital=(4*66+46)/5=62;
      // Jan 10 capital=(4*66+2*46+46)/7=402/7, endpoint day included.
      const expected =
        method === 'ROI'
          ? [0, 50 / 11, 100 / 11, 150 / 11, 200 / 11]
          : [0, 50 / 11, 100 / 11, 450 / 31, 1400 / 67];
      // Compare percentages to 10 decimal places (absolute tolerance 5e-11
      // percentage points); the displayed fractions above are repeating decimals.
      result.forEach(({ value }, i) =>
        expect(value).toBeCloseTo(expected[i], 10)
      );
    }
  );

  it.each(['ROI', 'ROAI'] as const)(
    'qualifies scenario B: zero-capital display baseline followed by reinvestment (%s)',
    (method) => {
      const flows: InvestmentProxyFlow[] = [
        { date: '2025-01-01', amount: '100' },
        { date: '2025-01-03', kind: 'liquidate' },
        { date: '2025-01-08', amount: '60' },
        { date: '2025-01-13', amount: '-30' }
      ];
      const prices = [
        { date: '2025-01-01', price: '10' },
        { date: '2025-01-03', price: '12' },
        { date: '2025-01-08', price: '12' },
        { date: '2025-01-13', price: '15' },
        { date: '2025-01-15', price: '16' }
      ];
      const dates = [
        '2025-01-04',
        '2025-01-05',
        '2025-01-08',
        '2025-01-09',
        '2025-01-10',
        '2025-01-11',
        '2025-01-13',
        '2025-01-15'
      ];
      const displayRates = [
        { date: '2025-01-09', rate: '1.1' },
        { date: '2025-01-10', rate: '1.15' },
        { date: '2025-01-11', rate: '1.2' }
      ];
      const dense = fixture({ flows, prices, dates, displayRates });
      const sparse = fixture({
        flows,
        prices,
        dates: dates.filter(
          (date) => !['2025-01-05', '2025-01-10'].includes(date)
        ),
        displayRates
      });
      expect(state(dense.points, '2025-01-01')).toEqual({
        units: '10',
        costBasis: '100',
        realizedGain: '0',
        contributions: '100',
        withdrawals: '0'
      });
      const liquidated = {
        units: '0',
        costBasis: '0',
        realizedGain: '20',
        contributions: '100',
        withdrawals: '120'
      };
      for (const date of ['2025-01-03', '2025-01-04', '2025-01-05'])
        expect(state(dense.points, date)).toEqual(liquidated);
      const reinvested = {
        units: '5',
        costBasis: '60',
        realizedGain: '20',
        contributions: '160',
        withdrawals: '120'
      };
      for (const date of [
        '2025-01-08',
        '2025-01-09',
        '2025-01-10',
        '2025-01-11'
      ])
        expect(state(dense.points, date)).toEqual(reinvested);
      expect(state(dense.points, '2025-01-13')).toEqual({
        units: '3',
        costBasis: '36',
        realizedGain: '26',
        contributions: '160',
        withdrawals: '150'
      });
      expect(dense.displayValuations.map(({ value }) => value)).toEqual([
        '0',
        '0',
        '66',
        '69',
        '72'
      ]);
      expect(
        dense.displayValuations
          .slice(0, 2)
          .every(({ valuationStatus }) => valuationStatus === 'NOT_APPLICABLE')
      ).toBe(true);
      const result = verifyIsolation(dense, sparse, dates, method);
      expect(result.map(({ date }) => date)).toEqual(dates);
      // Baseline V=C=0, R=20: opening cumulative gain=20, openingGain=0.
      // Existing zero-capital convention applies only until reinvestment.
      // New BUY adds 60 to ROI capital; ROAI excludes Jan 4-8 entirely.
      // Period gains Jan 9/10/11 are 6/9/12 over capital 60 => 10/15/20%.
      // Jan 13 SELL: remaining basis=36, realized=26, V=45 => period gain=15.
      // ROAI capital=(5*60+36)/6=56; Jan 15=(5*60+2*36+36)/8=51.
      expect(result.slice(0, 6).map(({ value }) => value)).toEqual([
        0, 0, 0, 10, 15, 20
      ]);
      if (method === 'ROI') {
        expect(result.slice(6).map(({ value }) => value)).toEqual([25, 30]);
      } else {
        // Repeating percentages: absolute tolerance 5e-11 percentage points.
        expect(result[6].value).toBeCloseTo(375 / 14, 10);
        expect(result[7].value).toBeCloseTo(600 / 17, 10);
      }
    }
  );
});
