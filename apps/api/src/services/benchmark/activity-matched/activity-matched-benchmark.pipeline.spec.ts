import { Activity } from '@ghostfolio/common/interfaces';
import { AssetSubClass } from '@ghostfolio/prisma/browser';

import { runActivityMatchedBenchmarkPipeline } from './activity-matched-benchmark.pipeline';

function makeActivity({
  id,
  date,
  value,
  type = 'BUY'
}: {
  id: string;
  date: string;
  value: number;
  type?: Activity['type'];
}): Activity {
  return {
    id,
    type,
    date: new Date(`${date}T00:00:00Z`),
    valueInBaseCurrency: value,
    assetProfile: {
      assetSubClass: AssetSubClass.ETF
    }
  } as Activity;
}

describe('Activity-matched benchmark pipeline', () => {
  it('evaluates ROAI over a partial range with constant invested capital', () => {
    const result = runActivityMatchedBenchmarkPipeline({
      activities: [
        makeActivity({
          id: 'buy-before-range',
          date: '2025-01-10',
          value: 100
        })
      ],
      currency: 'EUR',
      benchmarkCurrency: 'EUR',
      prices: [
        { date: '2025-01-10', price: '10' },
        { date: '2025-01-20', price: '12' },
        { date: '2025-01-30', price: '15' }
      ],
      fxQuotes: [],
      valuationDates: ['2025-01-20', '2025-01-30'],
      start: '2025-01-20',
      end: '2025-01-30',
      method: 'ROAI'
    });

    expect(result.performance.map(({ date }) => date)).toEqual([
      '2025-01-20',
      '2025-01-30'
    ]);

    expect(result.performance[0].returnFraction.toString()).toBe('0');
    expect(result.performance[1].netPerformance.toString()).toBe('30');
    expect(result.performance[1].capital.toString()).toBe('120');
    expect(result.performance[1].returnFraction.toString()).toBe('0.25');
  });

  it.each([
    ['ROI', '180', '0.25'],
    ['ROAI', '152.72727272727272727273', '0.29464285714285714286']
  ] as const)(
    'evaluates %s with an additional investment inside the range',
    (method, expectedCapital, expectedReturn) => {
      const result = runActivityMatchedBenchmarkPipeline({
        activities: [
          makeActivity({
            id: 'initial-buy',
            date: '2025-01-10',
            value: 100
          }),
          makeActivity({
            id: 'additional-buy',
            date: '2025-01-25',
            value: 60
          })
        ],
        currency: 'EUR',
        benchmarkCurrency: 'EUR',
        prices: [
          { date: '2025-01-10', price: '10' },
          { date: '2025-01-20', price: '12' },
          { date: '2025-01-25', price: '12' },
          { date: '2025-01-30', price: '15' }
        ],
        fxQuotes: [],
        valuationDates: ['2025-01-20', '2025-01-30'],
        start: '2025-01-20',
        end: '2025-01-30',
        method
      });

      const finalPoint = result.points.find(
        ({ date }) => date === '2025-01-30'
      );

      expect(finalPoint?.units.toString()).toBe('15');
      expect(finalPoint?.value.toString()).toBe('225');

      const finalPerformance = result.performance.at(-1);

      expect(finalPerformance?.date).toBe('2025-01-30');
      expect(finalPerformance?.netPerformance.toString()).toBe('45');

      expect(finalPerformance?.capital.toNumber()).toBeCloseTo(
        Number(expectedCapital),
        12
      );

      expect(finalPerformance?.returnFraction.toNumber()).toBeCloseTo(
        Number(expectedReturn),
        12
      );
    }
  );

  it('preserves average cost and realized gains after a SELL', () => {
    const result = runActivityMatchedBenchmarkPipeline({
      activities: [
        makeActivity({
          id: 'buy',
          date: '2025-01-10',
          value: 100
        }),
        makeActivity({
          id: 'sell',
          date: '2025-01-20',
          value: 60,
          type: 'SELL'
        })
      ],
      currency: 'EUR',
      benchmarkCurrency: 'EUR',
      prices: [
        { date: '2025-01-10', price: '10' },
        { date: '2025-01-20', price: '12' },
        { date: '2025-01-30', price: '15' }
      ],
      fxQuotes: [],
      valuationDates: ['2025-01-30'],
      start: '2025-01-10',
      end: '2025-01-30',
      method: 'ROI'
    });

    const finalPoint = result.points.at(-1);

    expect(finalPoint?.units.toString()).toBe('5');
    expect(finalPoint?.costBasis.toString()).toBe('50');
    expect(finalPoint?.realizedGain.toString()).toBe('10');
    expect(finalPoint?.withdrawals.toString()).toBe('60');
    expect(finalPoint?.value.toString()).toBe('75');
    expect(finalPoint?.netPerformance.toString()).toBe('35');

    expect(result.funding.flows).toEqual([
      { date: '2025-01-10', amount: '100' },
      { date: '2025-01-20', amount: '-60' }
    ]);
  });

  it('uses Sunday FX with Friday benchmark price', () => {
    const result = runActivityMatchedBenchmarkPipeline({
      activities: [
        makeActivity({
          id: 'weekend-buy',
          date: '2025-01-12',
          value: 90
        })
      ],
      currency: 'EUR',
      benchmarkCurrency: 'USD',
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
          date: '2025-01-12',
          rate: '0.92'
        },
        {
          currencyFrom: 'USD',
          currencyTo: 'EUR',
          date: '2025-01-13',
          rate: '0.93'
        }
      ],
      valuationDates: ['2025-01-13'],
      start: '2025-01-12',
      end: '2025-01-13',
      method: 'ROI'
    });

    expect(result.preparedPrices.carriedForward).toEqual([
      {
        date: '2025-01-12',
        sourceDate: '2025-01-10',
        ageInDays: 2
      }
    ]);

    const sourceExecutionPrice = result.preparedPrices.prices.find(
      ({ date }) => date === '2025-01-12'
    );

    expect(sourceExecutionPrice).toEqual({
      date: '2025-01-12',
      price: '100',
      sourceDate: '2025-01-10'
    });

    const executionConversion = result.fx.conversions.find(
      ({ date }) => date === '2025-01-12'
    );

    expect(executionConversion?.method).toBe('DIRECT');
    expect(executionConversion?.rate).toBe('0.92');
    expect(executionConversion?.components).toEqual([
      {
        pair: 'USDEUR',
        sourceDate: '2025-01-12',
        ageInDays: 0,
        rate: '0.92',
        kind: 'MARKET'
      }
    ]);

    const executionPrice = result.fx.prices.find(
      ({ date }) => date === '2025-01-12'
    );

    expect(executionPrice?.price).toBe('92');
    expect(executionPrice?.sourceDate).toBe('2025-01-10');

    expect(
      result.points.find(({ date }) => date === '2025-01-12')?.units.toNumber()
    ).toBeCloseTo(90 / 92, 12);
  });

  it('currently retains the last converted price on display-only dates', () => {
    const result = runActivityMatchedBenchmarkPipeline({
      activities: [
        makeActivity({
          id: 'initial-buy',
          date: '2025-01-10',
          value: 90
        })
      ],
      currency: 'EUR',
      benchmarkCurrency: 'USD',
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
        },
        {
          currencyFrom: 'USD',
          currencyTo: 'EUR',
          date: '2025-01-13',
          rate: '0.93'
        }
      ],
      valuationDates: ['2025-01-11', '2025-01-12'],
      start: '2025-01-10',
      end: '2025-01-13',
      method: 'ROI'
    });

    const friday = result.points.find(({ date }) => date === '2025-01-10');

    const saturday = result.points.find(({ date }) => date === '2025-01-11');

    const sunday = result.points.find(({ date }) => date === '2025-01-12');

    const monday = result.points.find(({ date }) => date === '2025-01-13');

    expect(friday?.value.toString()).toBe('90');
    expect(friday?.displayOnly).toBeUndefined();

    expect(saturday?.displayOnly).toBe(true);
    expect(saturday?.value.toString()).toBe('90');

    expect(sunday?.displayOnly).toBe(true);
    expect(sunday?.value.toString()).toBe('90');

    expect(monday?.displayOnly).toBeUndefined();
    expect(monday?.value.toString()).toBe('102.3');

    expect(result.performance.map(({ date }) => date)).toEqual([
      '2025-01-10',
      '2025-01-13'
    ]);

    expect(result.performance.at(-1)?.netPerformance.toString()).toBe('12.3');
  });

  it('preserves investments preceding the requested ROI range', () => {
    const activities = [
      makeActivity({
        id: 'buy-before-range',
        date: '2025-01-10',
        value: 100
      })
    ];

    const prices = [
      { date: '2025-01-10', price: '10' },
      { date: '2025-01-20', price: '12' },
      { date: '2025-01-30', price: '15' }
    ];

    const result = runActivityMatchedBenchmarkPipeline({
      activities,
      currency: 'EUR',
      benchmarkCurrency: 'EUR',
      prices,
      fxQuotes: [],
      valuationDates: ['2025-01-20', '2025-01-30'],
      start: '2025-01-20',
      end: '2025-01-30',
      method: 'ROI'
    });

    expect(result.funding.canSimulate).toBe(true);
    expect(result.funding.flows).toEqual([
      { date: '2025-01-10', amount: '100' }
    ]);

    expect(
      result.points.find(({ date }) => date === '2025-01-20')?.units.toString()
    ).toBe('10');

    expect(
      result.points.find(({ date }) => date === '2025-01-20')?.value.toString()
    ).toBe('120');

    expect(
      result.points.find(({ date }) => date === '2025-01-30')?.value.toString()
    ).toBe('150');

    expect(result.performance.map(({ date }) => date)).toEqual([
      '2025-01-20',
      '2025-01-30'
    ]);

    expect(result.performance[0].returnFraction.toString()).toBe('0');
    expect(result.performance[1].netPerformance.toString()).toBe('30');
    expect(result.performance[1].capital.toString()).toBe('120');
    expect(result.performance[1].returnFraction.toString()).toBe('0.25');

    expect(activities[0].valueInBaseCurrency).toBe(100);
    expect(prices[0].price).toBe('10');
  });
});
