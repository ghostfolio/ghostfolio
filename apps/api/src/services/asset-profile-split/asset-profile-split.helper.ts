import { INVESTMENT_ACTIVITY_TYPES } from '@ghostfolio/common/config';
import { resetHours } from '@ghostfolio/common/helper';
import { Activity } from '@ghostfolio/common/interfaces';

import { AssetProfileSplit } from '@prisma/client';
import { Big } from 'big.js';
import { isBefore } from 'date-fns';

export function adjustActivityBySplits(
  activity: Activity,
  splits: AssetProfileSplit[]
): Activity {
  if (!INVESTMENT_ACTIVITY_TYPES.includes(activity.type)) {
    return activity;
  }

  const activityDate = resetHours(activity.date);

  // Accumulate both parts of the ratio and divide only once, so that the
  // cumulative split factor of consecutive splits stays exact
  let denominator = new Big(1);
  let numerator = new Big(1);

  for (const split of splits) {
    // Skip malformed splits to not break the portfolio calculation of every
    // user holding this asset profile
    if (split.denominator <= 0 || split.numerator <= 0) {
      continue;
    }

    if (isBefore(activityDate, split.date)) {
      denominator = denominator.mul(split.denominator);
      numerator = numerator.mul(split.numerator);
    }
  }

  if (numerator.eq(denominator)) {
    return activity;
  }

  return {
    ...activity,
    quantity: new Big(activity.quantity)
      .mul(numerator)
      .div(denominator)
      .toNumber(),
    unitPrice: new Big(activity.unitPrice)
      .mul(denominator)
      .div(numerator)
      .toNumber(),
    unitPriceInAssetProfileCurrency: new Big(
      activity.unitPriceInAssetProfileCurrency
    )
      .mul(denominator)
      .div(numerator)
      .toNumber()
  };
}
