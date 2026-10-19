import { Type as ActivityType } from '@prisma/client';

import { ActivityRow } from './types/activity-row.type';

export function createActivityRow(
  overrides: Partial<ActivityRow> = {}
): ActivityRow {
  return {
    accountName: 'Brokerage',
    currency: 'USD',
    date: '2026-01-15',
    fee: 1,
    isin: 'US0378331005',
    name: 'Apple Inc.',
    quantity: 10,
    symbol: 'AAPL',
    tax: 0,
    type: ActivityType.BUY,
    unitPrice: 230,
    ...overrides
  };
}
