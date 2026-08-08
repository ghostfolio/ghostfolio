import {
  activityDummyData,
  assetProfileDummyData
} from '@ghostfolio/api/app/portfolio/calculator/portfolio-calculator-test-utils';
import { parseDate } from '@ghostfolio/common/helper';
import { Activity } from '@ghostfolio/common/interfaces';

import { AssetProfileSplit, DataSource } from '@prisma/client';
import { Big } from 'big.js';

import { adjustActivityBySplits } from './asset-profile-split.helper';

describe('adjustActivityBySplits', () => {
  it('adjusts quantity and prices using the cumulative split factor', () => {
    const activity = createActivity('2020-01-01');
    const splits = [
      createSplit('2021-01-01', 2, 1),
      createSplit('2022-01-01', 1, 3)
    ];

    const adjustedActivity = adjustActivityBySplits(activity, splits);

    expect(adjustedActivity).not.toBe(activity);
    expect(adjustedActivity).toMatchObject({
      quantity: 20 / 3,
      unitPrice: 150,
      unitPriceInAssetProfileCurrency: 150,
      value: 1000,
      valueInBaseCurrency: 1000
    });
    expect(new Big(adjustedActivity.quantity).toFixed(15)).toBe(
      new Big(20).div(3).toFixed(15)
    );
    expect(activity).toMatchObject({
      quantity: 10,
      unitPrice: 100,
      unitPriceInAssetProfileCurrency: 100
    });
  });

  it('only adjusts activities before the split calendar date', () => {
    const split = createSplit('2024-06-15T12:00:00Z', 2, 1);
    const activityOnSplitDate = createActivity('2024-06-15T18:00:00Z');
    const activityAfterSplit = createActivity('2024-06-16T00:00:00Z');

    const adjustedActivityOnSplitDate = adjustActivityBySplits(
      activityOnSplitDate,
      [split]
    );
    const adjustedActivityAfterSplit = adjustActivityBySplits(
      activityAfterSplit,
      [split]
    );

    expect(adjustedActivityOnSplitDate).toEqual(activityOnSplitDate);
    expect(adjustedActivityOnSplitDate).not.toBe(activityOnSplitDate);
    expect(adjustedActivityAfterSplit).toEqual(activityAfterSplit);
    expect(adjustedActivityAfterSplit).not.toBe(activityAfterSplit);
  });
});

function createActivity(date: string): Activity {
  return {
    ...activityDummyData,
    assetProfile: {
      ...assetProfileDummyData,
      dataSource: DataSource.YAHOO,
      symbol: 'AAPL'
    },
    date: parseDate(date),
    quantity: 10,
    type: 'BUY',
    unitPrice: 100,
    unitPriceInAssetProfileCurrency: 100,
    value: 1000,
    valueInBaseCurrency: 1000
  } as Activity;
}

function createSplit(
  date: string,
  numerator: number,
  denominator: number
): AssetProfileSplit {
  const splitDate = new Date(date);

  return {
    createdAt: splitDate,
    date: splitDate,
    denominator,
    id: `${date}-${numerator}-${denominator}`,
    numerator,
    symbolProfileId: 'aapl-profile',
    updatedAt: splitDate
  };
}
