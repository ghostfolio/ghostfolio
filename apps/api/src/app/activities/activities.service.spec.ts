import { AccountService } from '@ghostfolio/api/app/account/account.service';
import {
  activityDummyData,
  assetProfileDummyData
} from '@ghostfolio/api/app/portfolio/calculator/portfolio-calculator-test-utils';
import { WHERE_ACTIVITY_NOT_DRAFT } from '@ghostfolio/api/helper/activity.helper';
import { AssetProfileSplitService } from '@ghostfolio/api/services/asset-profile-split/asset-profile-split.service';
import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.service';
import { PrismaService } from '@ghostfolio/api/services/prisma/prisma.service';
import { SymbolProfileService } from '@ghostfolio/api/services/symbol-profile/symbol-profile.service';
import { TagService } from '@ghostfolio/api/services/tag/tag.service';
import {
  INVESTMENT_ACTIVITY_TYPES,
  NON_INVESTMENT_ACTIVITY_TYPES
} from '@ghostfolio/common/config';
import { parseDate } from '@ghostfolio/common/helper';
import { Activity, Filter } from '@ghostfolio/common/interfaces';

import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  AssetClass,
  AssetProfileSplit,
  AssetSubClass,
  DataSource,
  Prisma,
  Type as ActivityType
} from '@prisma/client';
import { Big } from 'big.js';

import { ActivitiesService } from './activities.service';

describe('ActivitiesService', () => {
  let activitiesService: ActivitiesService;
  let getSplitsByUserId: jest.Mock;
  let accountService: { getCashDetails: jest.Mock };

  beforeEach(() => {
    getSplitsByUserId = jest.fn().mockResolvedValue([]);
    accountService = { getCashDetails: jest.fn() };

    activitiesService = new ActivitiesService(
      null,
      accountService as unknown as AccountService,
      { getSplitsByUserId } as unknown as AssetProfileSplitService,
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

  describe('getActivities', () => {
    it('returns the activities with the asset profile but without the relation to the symbol profile', async () => {
      const assetProfile = {
        ...assetProfileDummyData,
        currency: 'USD',
        dataSource: DataSource.YAHOO,
        name: 'Apple Inc.',
        symbol: 'AAPL'
      };

      const findMany = jest.fn().mockResolvedValue([
        {
          ...activityDummyData,
          account: null,
          currency: 'USD',
          date: parseDate('2021-01-01'),
          fee: 1,
          id: 'activity-id',
          quantity: 10,
          SymbolProfile: {
            currency: 'USD',
            dataSource: DataSource.YAHOO,
            symbol: 'AAPL'
          },
          tags: [],
          type: 'BUY',
          unitPrice: 100
        }
      ]);

      const service = new ActivitiesService(
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        {
          toCurrencyAtDate: jest.fn().mockResolvedValue(0)
        } as unknown as ExchangeRateDataService,
        null,
        {
          order: {
            findMany,
            count: jest.fn().mockResolvedValue(1)
          }
        } as unknown as PrismaService,
        {
          getSymbolProfiles: jest
            .fn()
            .mockResolvedValue([
              { ...assetProfile, dataSource: DataSource.MANUAL },
              assetProfile
            ])
        } as unknown as SymbolProfileService,
        null
      );

      const { activities } = await service.getActivities({
        userCurrency: 'USD',
        userId: 'user-id'
      });

      expect(findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({
            SymbolProfile: {
              select: { currency: true, dataSource: true, symbol: true }
            }
          })
        })
      );
      expect(activities).toHaveLength(1);
      expect(activities[0]).not.toHaveProperty('SymbolProfile');
      expect(activities[0].assetProfile).toBe(assetProfile);
    });
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
      getSplitsByUserId.mockResolvedValue([
        { ...split, symbolProfileId: 'YAHOO-MSFT-profile' },
        { ...split, symbolProfileId: 'MANUAL-AAPL-profile' }
      ]);

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
      getSplitsByUserId.mockResolvedValue([split]);

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
      expect(getSplitsByUserId).toHaveBeenCalledWith({ userId: 'user-id' });
      expect(result.activities[0]).toMatchObject({
        quantity: 20,
        unitPrice: 50,
        unitPriceInAssetProfileCurrency: 50
      });
    });

    it('includes excluded accounts and activities when requested', async () => {
      jest.spyOn(activitiesService, 'getActivities').mockResolvedValue({
        activities: [],
        count: 0
      });

      await activitiesService.getActivitiesForPortfolioCalculator({
        userCurrency: 'USD',
        userId: 'user-id',
        withExcludedAccountsAndActivities: true
      });

      expect(activitiesService.getActivities).toHaveBeenCalledWith({
        filters: undefined,
        userCurrency: 'USD',
        userId: 'user-id',
        withExcludedAccountsAndActivities: true
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
      getSplitsByUserId.mockResolvedValue([split]);

      const result =
        await activitiesService.getActivitiesForPortfolioCalculator({
          userCurrency: 'USD',
          userId: 'user-id',
          withCash: true
        });

      expect(getSplitsByUserId).toHaveBeenCalledWith({ userId: 'user-id' });
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
      getSplitsByUserId.mockResolvedValue(
        splits.map((split) => {
          return { ...split, symbolProfileId: activity.assetProfile.id };
        })
      );

      const result =
        await activitiesService.getActivitiesForPortfolioCalculator({
          userCurrency: 'USD',
          userId: 'user-id'
        });

      return result.activities[0];
    }
  });

  describe('getLatestActivity', () => {
    it('filters by type and unit price and excludes draft activities', async () => {
      const findFirst = jest.fn().mockResolvedValue(null);

      const service = new ActivitiesService(
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        { order: { findFirst } } as unknown as PrismaService,
        null,
        null
      );

      await service.getLatestActivity({
        dataSource: DataSource.YAHOO,
        symbol: 'AAPL',
        types: [ActivityType.BUY, ActivityType.SELL]
      });

      expect(findFirst).toHaveBeenCalledWith({
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
        where: {
          ...WHERE_ACTIVITY_NOT_DRAFT,
          SymbolProfile: { dataSource: DataSource.YAHOO, symbol: 'AAPL' },
          type: { in: [ActivityType.BUY, ActivityType.SELL] },
          unitPrice: { gt: 0 }
        }
      });
    });
  });

  describe('updateActivity', () => {
    it('updates the custom asset profile of the user', async () => {
      const data = await getUpdatedActivityData({ userId: 'user-id' });

      expect(data.SymbolProfile).toEqual({
        update: {
          assetClass: AssetClass.COMMODITY,
          assetSubClass: AssetSubClass.PRECIOUS_METAL
        }
      });
    });

    it.each([
      { owner: 'the admin', userId: null },
      { owner: 'another user', userId: 'other-user-id' }
    ])('does not update the asset profile of $owner', async ({ userId }) => {
      const data = await getUpdatedActivityData({ userId });

      expect(data).not.toHaveProperty('SymbolProfile');
    });

    async function getUpdatedActivityData({
      userId
    }: {
      userId: string | null;
    }) {
      const update = jest.fn().mockResolvedValue({ userId: 'user-id' });

      const service = new ActivitiesService(
        null,
        null,
        null,
        null,
        null,
        null,
        { emit: jest.fn() } as unknown as EventEmitter2,
        null,
        null,
        {
          order: {
            update,
            findUnique: jest
              .fn()
              .mockResolvedValue({ SymbolProfile: { userId } })
          }
        } as unknown as PrismaService,
        null,
        { validateTagIds: jest.fn() } as unknown as TagService
      );

      await service.updateActivity({
        data: {
          assetClass: AssetClass.COMMODITY,
          assetSubClass: AssetSubClass.PRECIOUS_METAL,
          date: parseDate('2024-01-01'),
          SymbolProfile: {
            connect: {
              dataSource_symbol: {
                dataSource: DataSource.MANUAL,
                symbol: 'GF_GOLD'
              }
            },
            update: {
              assetClass: AssetClass.COMMODITY,
              assetSubClass: AssetSubClass.PRECIOUS_METAL,
              name: 'GF_GOLD'
            }
          },
          type: 'BUY'
        },
        originalDate: parseDate('2024-01-01'),
        userId: 'user-id',
        where: { id: 'activity-id' }
      });

      return (update.mock.calls[0] as [Prisma.OrderUpdateArgs])[0].data;
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
    symbolProfileId: 'YAHOO-AAPL-profile',
    updatedAt: date
  };
}
