import { Big } from 'big.js';

/** A civil date and an explicit ordering within that date. */
export interface CashBalancePosition {
  readonly date: string;
  readonly sequence: number;
}

/** The declared balance at the boundary where cash management starts. */
export interface CashOpeningBalance extends CashBalancePosition {
  readonly balance: string;
}

export type CashBalanceEvent = CashBalancePosition &
  (
    | {
        readonly amount: string;
        readonly type: 'MOVEMENT';
      }
    | {
        readonly balance: string;
        readonly type: 'CHECKPOINT';
      }
  );

export interface CashBalanceCalculation {
  balances: { date: string; value: Big }[];
  minimumBalance: CashBalancePosition & { value: Big };
}

/**
 * Rebuilds one account's balances from its complete set of managed events.
 * All amounts must already be expressed in the account's currency, as decimal
 * strings. No currency conversion or rounding takes place here.
 *
 * Positions use valid YYYY-MM-DD dates and non-negative safe integer sequences.
 * Events must have unique positions strictly after the opening balance. The
 * caller must keep legacy history outside this managed interval.
 *
 * Movements add a signed amount. Checkpoints establish an absolute balance,
 * so earlier changes propagate only as far as the next checkpoint. Rebuilding
 * after an edit or deletion uses the same function with the updated event list.
 *
 * The projection contains the last balance on each opening/event date, without
 * filling gaps or filtering future dates. The minimum also considers intermediate
 * balances within a date, retaining the earliest position when values tie.
 */
export function calculateCashBalances({
  openingBalance,
  events
}: {
  openingBalance: CashOpeningBalance;
  events: readonly CashBalanceEvent[];
}): CashBalanceCalculation {
  validatePosition(openingBalance);

  let currentBalance = parseValue(openingBalance.balance, 'Opening balance');
  let minimumBalance: CashBalanceCalculation['minimumBalance'] = {
    date: openingBalance.date,
    sequence: openingBalance.sequence,
    value: currentBalance
  };
  const balances: CashBalanceCalculation['balances'] = [
    { date: openingBalance.date, value: currentBalance }
  ];
  const sortedEvents = events
    .map((event) => {
      validatePosition(event);

      let value: Big;

      switch (event.type) {
        case 'MOVEMENT':
          value = parseValue(event.amount, 'Movement amount');
          break;
        case 'CHECKPOINT':
          value = parseValue(event.balance, 'Checkpoint balance');
          break;
        default:
          throw new TypeError('Unsupported cash balance event type');
      }

      return {
        date: event.date,
        sequence: event.sequence,
        type: event.type,
        value
      };
    })
    .sort(comparePositions);

  let previousPosition: CashBalancePosition = openingBalance;

  for (const event of sortedEvents) {
    if (comparePositions(event, previousPosition) <= 0) {
      throw new RangeError(
        'Cash balance events must have unique positions strictly after opening'
      );
    }

    currentBalance =
      event.type === 'MOVEMENT'
        ? currentBalance.plus(event.value)
        : event.value;

    if (currentBalance.lt(minimumBalance.value)) {
      minimumBalance = {
        date: event.date,
        sequence: event.sequence,
        value: currentBalance
      };
    }

    const dailyBalance = { date: event.date, value: currentBalance };

    if (balances[balances.length - 1].date === event.date) {
      balances[balances.length - 1] = dailyBalance;
    } else {
      balances.push(dailyBalance);
    }

    previousPosition = event;
  }

  return { balances, minimumBalance };
}

function comparePositions(
  left: CashBalancePosition,
  right: CashBalancePosition
): number {
  if (left.date !== right.date) {
    return left.date < right.date ? -1 : 1;
  }

  return left.sequence - right.sequence;
}

function parseValue(value: string, label: string): Big {
  if (typeof value !== 'string') {
    throw new TypeError(`${label} must be a decimal string`);
  }

  try {
    return new Big(value);
  } catch {
    throw new TypeError(`${label} must be a finite decimal string`);
  }
}

function validatePosition({ date, sequence }: CashBalancePosition): void {
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new TypeError('Cash balance dates must use YYYY-MM-DD');
  }

  // Parse only an explicit UTC date. Comparing the result rejects dates that
  // JavaScript would otherwise normalize, such as February 30.
  const parsedDate = new Date(`${date}T00:00:00.000Z`);

  if (
    !Number.isFinite(parsedDate.getTime()) ||
    parsedDate.toISOString().slice(0, 10) !== date
  ) {
    throw new RangeError('Cash balance dates must be valid calendar dates');
  }

  if (!Number.isSafeInteger(sequence) || sequence < 0) {
    throw new RangeError(
      'Cash balance sequences must be non-negative safe integers'
    );
  }
}
