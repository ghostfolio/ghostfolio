import { Type as ActivityType } from '@prisma/client';

import { ActivityToImport } from './types/activity-to-import.type';

export function createActivity(
  overrides: Partial<ActivityToImport> = {}
): ActivityToImport {
  return {
    currency: 'USD',
    date: '2024-01-01',
    fee: 0,
    quantity: 1,
    symbol: 'AAPL',
    type: ActivityType.BUY,
    unitPrice: 100,
    ...overrides
  };
}
