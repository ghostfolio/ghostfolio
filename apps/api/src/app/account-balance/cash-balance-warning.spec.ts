import { findNewCashDeficit } from './cash-balance-warning';

const openingBalance = { date: '2026-10-01', sequence: 0, balance: '50' };
const movement = (amount: string, sequence: number, date = '2026-10-02') => ({
  type: 'MOVEMENT' as const,
  date,
  sequence,
  amount
});

describe('Cash deficit confirmation', () => {
  it('finds an intermediate same-day deficit despite a positive closing balance', () => {
    expect(
      findNewCashDeficit({
        openingBalance,
        previousEvents: [],
        events: [movement('-100', 1), movement('200', 2)]
      })
    ).toEqual({ date: '2026-10-02', sequence: 1, value: '-50' });
  });

  it('does not ask again for a historical deficit that a deposit improves', () => {
    const previousEvents = [movement('-100', 1)];
    expect(
      findNewCashDeficit({
        openingBalance,
        previousEvents,
        events: [...previousEvents, movement('10', 2)]
      })
    ).toBeNull();
  });

  it('detects a new deficit even when an older confirmed deficit was larger', () => {
    const previousEvents = [movement('-150', 1), movement('200', 2)];
    expect(
      findNewCashDeficit({
        openingBalance,
        previousEvents,
        events: [...previousEvents, movement('-150', 3, '2026-10-03')]
      })
    ).toEqual({ date: '2026-10-03', sequence: 3, value: '-50' });
  });

  it('warns when deleting a deposit makes a later withdrawal negative', () => {
    const previousEvents = [movement('100', 1), movement('-100', 2)];
    expect(
      findNewCashDeficit({
        openingBalance,
        previousEvents,
        events: [previousEvents[1]]
      })?.value
    ).toBe('-50');
  });

  it('respects a reconciliation when earlier history changes', () => {
    const previousEvents = [
      movement('100', 1),
      {
        type: 'CHECKPOINT' as const,
        date: '2026-10-03',
        sequence: 2,
        balance: '500'
      },
      movement('-100', 3, '2026-10-04')
    ];
    expect(
      findNewCashDeficit({
        openingBalance,
        previousEvents,
        events: previousEvents.slice(1)
      })
    ).toBeNull();
  });
});
