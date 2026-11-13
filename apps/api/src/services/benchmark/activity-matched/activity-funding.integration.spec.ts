import { Activity } from '@ghostfolio/common/interfaces';
import { AssetSubClass } from '@ghostfolio/prisma/browser';

import { createActivityFunding } from './activity-cash-flow.provider';
import { evaluateRange, simulateBenchmark } from './activity-matched-benchmark';

const dates = ['2025-01-10', '2025-01-11', '2025-01-12', '2025-01-13'];

function activity({
  id,
  index,
  type,
  value
}: {
  id: string;
  index: number;
  type: 'BUY' | 'SELL';
  value: number;
}): Activity {
  return {
    id,
    type,
    date: new Date(`${dates[index]}T12:00:00Z`),
    valueInBaseCurrency: value,
    assetProfile: { assetSubClass: AssetSubClass.ETF }
  } as Activity;
}

describe('Activity funding and benchmark integration', () => {
  it('simulates activity-matched ROI and ROAI', () => {
    const funding = createActivityFunding({
      activities: [
        activity({ id: 'buy-1', index: 0, type: 'BUY', value: 100 }),
        activity({ id: 'sell-1', index: 1, type: 'SELL', value: 60 }),
        activity({ id: 'buy-2', index: 2, type: 'BUY', value: 100 }),
        activity({ id: 'sell-2', index: 3, type: 'SELL', value: 100 })
      ],
      currency: 'EUR'
    });

    expect(funding.canSimulate).toBe(true);
    expect(funding.diagnostics).toEqual([]);

    const points = simulateBenchmark({
      flows: funding.flows,
      prices: dates.map((date, index) => ({
        date,
        price: String([10, 12, 20, 20][index])
      })),
      valuationDates: dates
    });

    const last = points.at(-1);

    expect(last.costBasis.toNumber()).toBeCloseTo(75, 10);
    expect(last.realizedGain.toNumber()).toBeCloseTo(35, 10);
    expect(last.value.toNumber()).toBeCloseTo(100, 10);
    expect(last.netPerformance.toNumber()).toBeCloseTo(60, 10);

    for (const method of ['ROI', 'ROAI'] as const) {
      const result = evaluateRange(points, method, dates[0], dates.at(-1));

      expect(result).toHaveLength(dates.length);
      expect(result.at(-1).netPerformance.toNumber()).toBeCloseTo(60, 10);
      expect(Number.isFinite(result.at(-1).returnFraction.toNumber())).toBe(
        true
      );
    }
  });

  it('does not expose partial flows after invalid activities', () => {
    const funding = createActivityFunding({
      activities: [
        activity({ id: 'valid', index: 0, type: 'BUY', value: 100 }),
        activity({ id: 'invalid', index: 1, type: 'SELL', value: NaN })
      ],
      currency: 'EUR'
    });

    expect(funding.canSimulate).toBe(false);
    expect(funding.events).toEqual([]);
    expect(funding.flows).toEqual([]);
    expect(funding.diagnostics).toEqual([
      { activityId: 'invalid', code: 'INVALID_AMOUNT' }
    ]);
  });
});
