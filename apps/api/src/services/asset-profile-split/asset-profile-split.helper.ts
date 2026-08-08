import { resetHours } from '@ghostfolio/common/helper';
import { Activity } from '@ghostfolio/common/interfaces';

import { AssetProfileSplit } from '@prisma/client';
import { Big } from 'big.js';
import { isBefore } from 'date-fns';

export function adjustActivityBySplits(
  activity: Activity,
  splits: AssetProfileSplit[]
): Activity {
  const activityDate = resetHours(activity.date);
  let splitFactor = new Big(1);

  for (const split of splits) {
    if (isBefore(activityDate, resetHours(split.date))) {
      splitFactor = splitFactor.mul(split.numerator).div(split.denominator);
    }
  }

  if (splitFactor.eq(1)) {
    return { ...activity };
  }

  return {
    ...activity,
    quantity: new Big(activity.quantity).mul(splitFactor).toNumber(),
    unitPrice: new Big(activity.unitPrice).div(splitFactor).toNumber(),
    unitPriceInAssetProfileCurrency: new Big(
      activity.unitPriceInAssetProfileCurrency
    )
      .div(splitFactor)
      .toNumber()
  };
}
