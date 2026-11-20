import { Activity } from '@ghostfolio/common/interfaces';
import { AssetSubClass } from '@ghostfolio/prisma/browser';

import { utc } from '@date-fns/utc';
import { Big } from 'big.js';
import { format } from 'date-fns';

import { InvestmentProxyFlow } from './activity-matched-benchmark';

export interface ActivityFundingEvent {
  activityId: string;
  activityType: 'BUY' | 'SELL';
  amount: string;
  currency: string;
  date: string;
  source: 'ACTIVITY_PROXY';
}

export type ActivityFundingDiagnosticCode =
  | 'CASH_ACTIVITY_EXCLUDED'
  | 'UNSUPPORTED_ACTIVITY_TYPE'
  | 'INVALID_AMOUNT'
  | 'INVALID_DATE';

export interface ActivityFundingDiagnostic {
  activityId: string;
  code: ActivityFundingDiagnosticCode;
}

export interface ActivityFundingResult {
  canSimulate: boolean;
  diagnostics: ActivityFundingDiagnostic[];
  events: ActivityFundingEvent[];
  flows: InvestmentProxyFlow[];
}

export function createActivityFunding({
  activities,
  currency
}: {
  activities: Activity[];
  currency: string;
}): ActivityFundingResult {
  const diagnostics: ActivityFundingDiagnostic[] = [];
  const events: ActivityFundingEvent[] = [];
  let canSimulate = true;

  for (const activity of activities) {
    if (activity.assetProfile?.assetSubClass === AssetSubClass.CASH) {
      diagnostics.push({
        activityId: activity.id,
        code: 'CASH_ACTIVITY_EXCLUDED'
      });
      continue;
    }

    if (activity.type !== 'BUY' && activity.type !== 'SELL') {
      diagnostics.push({
        activityId: activity.id,
        code: 'UNSUPPORTED_ACTIVITY_TYPE'
      });
      continue;
    }

    let amount: Big;

    try {
      amount = new Big(activity.valueInBaseCurrency);

      if (!amount.gt(0)) {
        throw new Error('Non-positive activity value');
      }
    } catch {
      diagnostics.push({
        activityId: activity.id,
        code: 'INVALID_AMOUNT'
      });
      canSimulate = false;
      continue;
    }

    if (
      !(activity.date instanceof Date) ||
      !Number.isFinite(activity.date.getTime())
    ) {
      diagnostics.push({
        activityId: activity.id,
        code: 'INVALID_DATE'
      });
      canSimulate = false;
      continue;
    }

    events.push({
      activityId: activity.id,
      activityType: activity.type,
      amount: (activity.type === 'BUY' ? amount : amount.neg()).toString(),
      currency,
      date: format(activity.date, 'yyyy-MM-dd', { in: utc }),
      source: 'ACTIVITY_PROXY'
    });
  }

  return {
    canSimulate,
    diagnostics,
    events: canSimulate ? events : [],
    flows: canSimulate
      ? events.map(({ amount, date }) => ({ amount, date }))
      : []
  };
}
