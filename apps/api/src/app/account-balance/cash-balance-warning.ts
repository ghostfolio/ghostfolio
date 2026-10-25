import { Big } from 'big.js';

import {
  CashBalanceEvent,
  CashOpeningBalance,
  calculateCashBalances
} from './cash-balance-calculator';

/** Finds a new or worsened deficit, including intermediate same-day balances. */
export function findNewCashDeficit({
  openingBalance,
  previousEvents,
  events
}: {
  openingBalance: CashOpeningBalance;
  previousEvents: CashBalanceEvent[];
  events: CashBalanceEvent[];
}): { date: string; sequence: number; value: string } | null {
  calculateCashBalances({ openingBalance, events: previousEvents });
  calculateCashBalances({ openingBalance, events });

  const key = ({ date, sequence }: { date: string; sequence: number }) =>
    `${date}/${sequence}`;
  const before = new Map(previousEvents.map((event) => [key(event), event]));
  const after = new Map(events.map((event) => [key(event), event]));
  const positions = [
    ...new Map(
      [...previousEvents, ...events].map((event) => [key(event), event])
    ).values()
  ].sort(
    (left, right) =>
      left.date.localeCompare(right.date) || left.sequence - right.sequence
  );
  let previousValue = new Big(openingBalance.balance);
  let value = previousValue;

  for (const position of positions) {
    const previousEvent = before.get(key(position));
    const event = after.get(key(position));

    if (previousEvent) {
      previousValue =
        previousEvent.type === 'CHECKPOINT'
          ? new Big(previousEvent.balance)
          : previousValue.plus(previousEvent.amount);
    }

    if (event) {
      value =
        event.type === 'CHECKPOINT'
          ? new Big(event.balance)
          : value.plus(event.amount);
    }

    if (value.lt(0) && value.lt(previousValue)) {
      return {
        date: position.date,
        sequence: position.sequence,
        value: value.toString()
      };
    }
  }

  return null;
}
