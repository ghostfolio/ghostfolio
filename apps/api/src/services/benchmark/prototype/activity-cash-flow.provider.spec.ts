import { Activity } from '@ghostfolio/common/interfaces';
import { AssetSubClass } from '@ghostfolio/prisma/browser';

import { createActivityFunding } from './activity-cash-flow.provider';

function makeActivity({
  id,
  type = 'BUY',
  date = new Date('2025-01-10T12:00:00Z'),
  value = 100,
  assetSubClass = AssetSubClass.ETF
}: {
  id: string;
  type?: Activity['type'];
  date?: Date;
  value?: number;
  assetSubClass?: AssetSubClass;
}): Activity {
  return {
    id,
    type,
    date,
    valueInBaseCurrency: value,
    assetProfile: { assetSubClass }
  } as Activity;
}

describe('ActivityCashFlowProvider', () => {
  it('converts BUY and SELL into signed investment proxies', () => {
    const result = createActivityFunding({
      activities: [
        makeActivity({ id: 'buy', value: 100.25 }),
        makeActivity({ id: 'sell', type: 'SELL', value: 40.1 })
      ],
      currency: 'EUR'
    });

    expect(result.canSimulate).toBe(true);
    expect(result.diagnostics).toEqual([]);
    expect(result.flows).toEqual([
      { date: '2025-01-10', amount: '100.25' },
      { date: '2025-01-10', amount: '-40.1' }
    ]);
    expect(result.events.map(({ activityId }) => activityId)).toEqual([
      'buy',
      'sell'
    ]);
  });

  it('excludes synthetic CASH activities', () => {
    const result = createActivityFunding({
      activities: [
        makeActivity({
          id: 'cash',
          assetSubClass: AssetSubClass.CASH
        })
      ],
      currency: 'EUR'
    });

    expect(result.canSimulate).toBe(true);
    expect(result.flows).toEqual([]);
    expect(result.diagnostics).toEqual([
      { activityId: 'cash', code: 'CASH_ACTIVITY_EXCLUDED' }
    ]);
  });

  it('does not treat dividends and fees as investment flows', () => {
    const result = createActivityFunding({
      activities: [
        makeActivity({ id: 'dividend', type: 'DIVIDEND' }),
        makeActivity({ id: 'fee', type: 'FEE' })
      ],
      currency: 'EUR'
    });

    expect(result.canSimulate).toBe(true);
    expect(result.flows).toEqual([]);
    expect(result.diagnostics).toHaveLength(2);
    expect(
      result.diagnostics.every(
        ({ code }) => code === 'UNSUPPORTED_ACTIVITY_TYPE'
      )
    ).toBe(true);
  });

  it.each([0, -1, NaN, Infinity])('rejects invalid BUY value %s', (value) => {
    const result = createActivityFunding({
      activities: [makeActivity({ id: 'invalid', value })],
      currency: 'EUR'
    });

    expect(result.canSimulate).toBe(false);
    expect(result.events).toEqual([]);
    expect(result.flows).toEqual([]);
    expect(result.diagnostics).toEqual([
      { activityId: 'invalid', code: 'INVALID_AMOUNT' }
    ]);
  });

  it('rejects invalid dates without throwing', () => {
    const result = createActivityFunding({
      activities: [
        makeActivity({
          id: 'invalid-date',
          date: new Date(NaN)
        })
      ],
      currency: 'EUR'
    });

    expect(result.canSimulate).toBe(false);
    expect(result.flows).toEqual([]);
    expect(result.diagnostics).toEqual([
      { activityId: 'invalid-date', code: 'INVALID_DATE' }
    ]);
  });

  it('never returns partial flows after a blocking error', () => {
    const result = createActivityFunding({
      activities: [
        makeActivity({ id: 'valid' }),
        makeActivity({ id: 'invalid', value: NaN })
      ],
      currency: 'EUR'
    });

    expect(result.canSimulate).toBe(false);
    expect(result.events).toEqual([]);
    expect(result.flows).toEqual([]);
  });

  it('preserves same-day ordering and does not mutate activities', () => {
    const activities = [
      makeActivity({ id: 'sell', type: 'SELL', value: 25 }),
      makeActivity({ id: 'buy', value: 50 })
    ];
    const original = activities.map(({ id, valueInBaseCurrency }) => ({
      id,
      valueInBaseCurrency
    }));

    const result = createActivityFunding({
      activities,
      currency: 'EUR'
    });

    expect(result.events.map(({ activityId }) => activityId)).toEqual([
      'sell',
      'buy'
    ]);
    expect(
      activities.map(({ id, valueInBaseCurrency }) => ({
        id,
        valueInBaseCurrency
      }))
    ).toEqual(original);
  });
});
