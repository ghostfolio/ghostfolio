import { AccountService } from '@ghostfolio/api/app/account/account.service';
import {
  activityDummyData,
  assetProfileDummyData
} from '@ghostfolio/api/app/portfolio/calculator/portfolio-calculator-test-utils';
import { AssetProfileSplitService } from '@ghostfolio/api/services/asset-profile-split/asset-profile-split.service';
import {
  INVESTMENT_ACTIVITY_TYPES,
  NON_INVESTMENT_ACTIVITY_TYPES
} from '@ghostfolio/common/config';
import { parseDate } from '@ghostfolio/common/helper';
import { Activity, Filter } from '@ghostfolio/common/interfaces';

import { AssetProfileSplit, DataSource } from '@prisma/client';
import { Big } from 'big.js';

import { ActivitiesService } from './activities.service';

describe('ActivitiesService', () => {
  let activitiesService: ActivitiesService;
  let getSplitsBySymbolProfileIds: jest.Mock;
  let accountService: { getCashDetails: jest.Mock };

  beforeEach(() => {
    getSplitsBySymbolProfileIds = jest.fn();
    accountService = { getCashDetails: jest.fn() };

    activitiesService = new ActivitiesService(
      null,
      accountService as unknown as AccountService,
      { getSplitsBySymbolProfileIds } as unknown as AssetProfileSplitService,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null
    );
  });

  describe('getActivitiesForPortfolioCalculator', () => {
    it('leaves an activity unchanged when no splits exist', async () => {
      const activity = createActivity({ symbol: 'AAPL' });

      const result = await getAdjustedActivity(activity, []);

      expect(result).toEqual(activity);
      expect(result).toBe(activity);
    });

    it.each([
      { denominator: 1, expectedPrice: 50, expectedQuantity: 20, numerator: 2 },
      {
        denominator: 10,
        expectedPrice: 1000,
        expectedQuantity: 1,
        numerator: 1
      }
    ])(
      'applies a $numerator:$denominator split to quantity and price',
      async ({ denominator, expectedPrice, expectedQuantity, numerator }) => {
        const result = await getAdjustedActivity(
          createActivity({ symbol: 'AAPL' }),
          [createSplit('2021-01-01', numerator, denominator)]
        );

        expect(result.quantity).toBe(expectedQuantity);
        expect(result.unitPrice).toBe(expectedPrice);
        expect(result.unitPriceInAssetProfileCurrency).toBe(expectedPrice);
      }
    );

    it('adjusts only activities before the split calendar date', async () => {
      const split = createSplit('2021-01-01', 2, 1);
      const activityBeforeSplit = createActivity({
        date: '2020-12-31T23:00:00.000Z',
        symbol: 'AAPL'
      });
      const activityOnSplitDate = createActivity({
        date: '2021-01-01T23:00:00.000Z',
        symbol: 'AAPL'
      });
      const activityAfterSplit = createActivity({
        date: '2021-01-02T00:00:00.000Z',
        symbol: 'AAPL'
      });

      expect(
        (await getAdjustedActivity(activityBeforeSplit, [split])).quantity
      ).toBe(20);
      expect(
        (await getAdjustedActivity(activityOnSplitDate, [split])).quantity
      ).toBe(10);
      expect(
        (await getAdjustedActivity(activityAfterSplit, [split])).quantity
      ).toBe(10);
    });

    it('applies multiple splits cumulatively with exact ratio arithmetic', async () => {
      const result = await getAdjustedActivity(
        createActivity({ symbol: 'AAPL' }),
        [createSplit('2021-01-01', 2, 1), createSplit('2022-01-01', 1, 3)]
      );

      expect(new Big(result.quantity).toFixed(15)).toBe(
        new Big(20).div(3).toFixed(15)
      );
      expect(result.unitPrice).toBe(150);
    });

    it('preserves fees and total activity value', async () => {
      const activity = createActivity({ symbol: 'AAPL' });
      activity.feeInAssetProfileCurrency = 12;
      activity.feeInBaseCurrency = 15;

      const result = await getAdjustedActivity(activity, [
        createSplit('2021-01-01', 2, 1)
      ]);

      expect(result).toMatchObject({
        feeInAssetProfileCurrency: 12,
        feeInBaseCurrency: 15,
        value: 1000,
        valueInBaseCurrency: 1000
      });
      expect(result.quantity * result.unitPrice).toBe(1000);
    });

    it('does not apply splits from another symbol or data source', async () => {
      const activity = createActivity({ symbol: 'AAPL' });
      const split = createSplit('2021-01-01', 2, 1);

      jest.spyOn(activitiesService, 'getActivities').mockResolvedValue({
        activities: [activity],
        count: 1
      });
      getSplitsBySymbolProfileIds.mockResolvedValue(
        new Map([
          ['YAHOO-MSFT-profile', [split]],
          ['MANUAL-AAPL-profile', [split]]
        ])
      );

      const result =
        await activitiesService.getActivitiesForPortfolioCalculator({
          userCurrency: 'USD',
          userId: 'user-id'
        });

      expect(result.activities[0].quantity).toBe(10);
      expect(result.activities[0].unitPrice).toBe(100);
    });

    it.each(INVESTMENT_ACTIVITY_TYPES)(
      'adjusts %s activities',
      async (type) => {
        const activity = createActivity({ symbol: 'AAPL' });
        activity.type = type as Activity['type'];

        const result = await getAdjustedActivity(activity, [
          createSplit('2021-01-01', 2, 1)
        ]);

        expect(result.quantity).toBe(20);
        expect(result.unitPrice).toBe(50);
        expect(result.quantity * result.unitPrice).toBe(1000);
      }
    );

    it.each(NON_INVESTMENT_ACTIVITY_TYPES)(
      'leaves %s activities unchanged',
      async (type) => {
        const activity = createActivity({ symbol: 'AAPL' });
        activity.type = type as Activity['type'];

        const result = await getAdjustedActivity(activity, [
          createSplit('2021-01-01', 2, 1)
        ]);

        expect(result).toBe(activity);
        expect(result.quantity).toBe(10);
        expect(result.unitPrice).toBe(100);
      }
    );

    it('loads and applies splits to standard activities while preserving filters', async () => {
      const activity = createActivity({ symbol: 'AAPL' });
      const filters = [{ id: 'AAPL', type: 'SYMBOL' }] as Filter[];
      const split = createSplit();

      jest.spyOn(activitiesService, 'getActivities').mockResolvedValue({
        activities: [activity],
        count: 1
      });
      getSplitsBySymbolProfileIds.mockResolvedValue(
        new Map([['YAHOO-AAPL-profile', [split]]])
      );

      const result =
        await activitiesService.getActivitiesForPortfolioCalculator({
          filters,
          userCurrency: 'USD',
          userId: 'user-id'
        });

      expect(activitiesService.getActivities).toHaveBeenCalledWith({
        filters,
        userCurrency: 'USD',
        userId: 'user-id',
        withExcludedAccountsAndActivities: false
      });
      expect(getSplitsBySymbolProfileIds).toHaveBeenCalledWith([
        'YAHOO-AAPL-profile'
      ]);
      expect(result.activities[0]).toMatchObject({
        quantity: 20,
        unitPrice: 50,
        unitPriceInAssetProfileCurrency: 50
      });
    });

    it('does not adjust synthetic cash activities', async () => {
      const activity = createActivity({ symbol: 'AAPL' });
      const cashActivity = createActivity({
        assetSubClass: 'CASH',
        currency: 'USD',
        dataSource: DataSource.YAHOO,
        quantity: 100,
        symbol: 'USD',
        unitPrice: 1
      });
      const split = createSplit();

      jest.spyOn(activitiesService, 'getActivities').mockResolvedValue({
        activities: [activity],
        count: 1
      });
      jest.spyOn(activitiesService, 'getCashActivities').mockResolvedValue({
        activities: [cashActivity],
        count: 1
      });
      accountService.getCashDetails.mockResolvedValue({ accounts: [] });
      getSplitsBySymbolProfileIds.mockResolvedValue(
        new Map([['YAHOO-AAPL-profile', [split]]])
      );

      const result =
        await activitiesService.getActivitiesForPortfolioCalculator({
          userCurrency: 'USD',
          userId: 'user-id',
          withCash: true
        });

      expect(getSplitsBySymbolProfileIds).toHaveBeenCalledWith([
        'YAHOO-AAPL-profile'
      ]);
      expect(result.activities).toEqual([
        expect.objectContaining({
          assetProfile: expect.objectContaining({ symbol: 'AAPL' }),
          quantity: 20
        }),
        cashActivity
      ]);
    });

    async function getAdjustedActivity(
      activity: Activity,
      splits: AssetProfileSplit[]
    ) {
      jest.spyOn(activitiesService, 'getActivities').mockResolvedValue({
        activities: [activity],
        count: 1
      });
      getSplitsBySymbolProfileIds.mockResolvedValue(
        new Map([[activity.assetProfile.id, splits]])
      );

      const result =
        await activitiesService.getActivitiesForPortfolioCalculator({
          userCurrency: 'USD',
          userId: 'user-id'
        });

      return result.activities[0];
    }
  });
});

function createActivity({
  assetSubClass,
  currency,
  dataSource = DataSource.YAHOO,
  date = '2020-01-01',
  quantity = 10,
  symbol,
  unitPrice = 100
}: {
  assetSubClass?: string;
  currency?: string;
  dataSource?: DataSource;
  date?: string;
  quantity?: number;
  symbol: string;
  unitPrice?: number;
}): Activity {
  return {
    ...activityDummyData,
    assetProfile: {
      ...assetProfileDummyData,
      assetSubClass,
      currency,
      dataSource,
      id: `${dataSource}-${symbol}-profile`,
      symbol
    },
    date: parseDate(date),
    quantity,
    type: 'BUY',
    unitPrice,
    unitPriceInAssetProfileCurrency: unitPrice,
    value: quantity * unitPrice,
    valueInBaseCurrency: quantity * unitPrice
  } as Activity;
}

function createSplit(
  dateString = '2021-01-01',
  numerator = 2,
  denominator = 1
): AssetProfileSplit {
  const date = parseDate(dateString);

  return {
    createdAt: date,
    date,
    denominator,
    id: `${dateString}-${numerator}-${denominator}`,
    numerator,
    symbolProfileId: 'aapl-profile',
    updatedAt: date
  };
}
