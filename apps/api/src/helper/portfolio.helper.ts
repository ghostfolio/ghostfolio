import { getAssetProfileIdentifier } from '@ghostfolio/common/helper';
import { AssetProfileIdentifier } from '@ghostfolio/common/interfaces';

import { Type as ActivityType } from '@prisma/client';
import { Big } from 'big.js';
import { isBefore } from 'date-fns';

export function getFactor(activityType: ActivityType) {
  let factor: number;

  switch (activityType) {
    case 'BUY':
      factor = 1;
      break;
    case 'SELL':
      factor = -1;
      break;
    default:
      factor = 0;
      break;
  }

  return factor;
}

/**
 * Adjusts activities for splits so that their quantity and unit price are in
 * the same share basis as the (split-adjusted) market data of the data
 * providers.
 *
 * Activities dated strictly before a split are considered to be in pre-split
 * terms: their quantity is multiplied and their unit price is divided by the
 * split factor (shares after per 1 share before). Activities dated on or
 * after the split date are already in post-split terms. The value
 * (quantity × unit price) and the fee remain unchanged.
 */
export function applySplitAdjustments<
  T extends {
    date: Date;
    quantity: number;
    SymbolProfile: AssetProfileIdentifier;
    unitPrice: number;
    unitPriceInAssetProfileCurrency?: number;
  }
>({
  activities,
  splits
}: {
  activities: T[];
  splits: (AssetProfileIdentifier & { date: Date; factor: number })[];
}): T[] {
  if (splits.length === 0) {
    return activities;
  }

  const splitsByAssetProfile = new Map<
    string,
    { date: Date; factor: number }[]
  >();

  for (const split of splits) {
    const key = getAssetProfileIdentifier(split);

    if (!splitsByAssetProfile.has(key)) {
      splitsByAssetProfile.set(key, []);
    }

    splitsByAssetProfile.get(key).push(split);
  }

  return activities.map((activity) => {
    const splitsOfAssetProfile = activity.SymbolProfile
      ? splitsByAssetProfile.get(
          getAssetProfileIdentifier(activity.SymbolProfile)
        )
      : undefined;

    if (!splitsOfAssetProfile) {
      return activity;
    }

    let factor = new Big(1);

    for (const split of splitsOfAssetProfile) {
      if (isBefore(activity.date, split.date)) {
        factor = factor.mul(split.factor);
      }
    }

    if (factor.eq(1)) {
      return activity;
    }

    return {
      ...activity,
      quantity: factor.mul(activity.quantity).toNumber(),
      unitPrice: new Big(activity.unitPrice).div(factor).toNumber(),
      ...(activity.unitPriceInAssetProfileCurrency === undefined
        ? {}
        : {
            unitPriceInAssetProfileCurrency: new Big(
              activity.unitPriceInAssetProfileCurrency
            )
              .div(factor)
              .toNumber()
          })
    };
  });
}
