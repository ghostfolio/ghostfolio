import { AccountBalanceService } from '@ghostfolio/api/app/account-balance/account-balance.service';
import { AccountService } from '@ghostfolio/api/app/account/account.service';
import { ActivitiesService } from '@ghostfolio/api/app/activities/activities.service';
import {
  activityDummyData,
  assetProfileDummyData,
  userDummyData
} from '@ghostfolio/api/app/portfolio/calculator/portfolio-calculator-test-utils';
import { PortfolioCalculatorFactory } from '@ghostfolio/api/app/portfolio/calculator/portfolio-calculator.factory';
import { CurrentRateService } from '@ghostfolio/api/app/portfolio/current-rate.service';
import { CurrentRateServiceMock } from '@ghostfolio/api/app/portfolio/current-rate.service.mock';
import { RedisCacheService } from '@ghostfolio/api/app/redis-cache/redis-cache.service';
import { RedisCacheServiceMock } from '@ghostfolio/api/app/redis-cache/redis-cache.service.mock';
import { AssetProfileSplitService } from '@ghostfolio/api/services/asset-profile-split/asset-profile-split.service';
import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';
import { DataProviderService } from '@ghostfolio/api/services/data-provider/data-provider.service';
import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.service';
import { ExchangeRateDataServiceMock } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.service.mock';
import { PortfolioSnapshotService } from '@ghostfolio/api/services/queues/portfolio-snapshot/portfolio-snapshot.service';
import { PortfolioSnapshotServiceMock } from '@ghostfolio/api/services/queues/portfolio-snapshot/portfolio-snapshot.service.mock';
import { parseDate } from '@ghostfolio/common/helper';
import { PerformanceCalculationType } from '@ghostfolio/common/types/performance-calculation-type.type';

import { DataSource } from '@prisma/client';
import { Big } from 'big.js';
import { eachDayOfInterval } from 'date-fns';
import { randomUUID } from 'node:crypto';

jest.mock('@ghostfolio/api/app/portfolio/current-rate.service', () => {
  return {
    CurrentRateService: jest.fn().mockImplementation(() => {
      return CurrentRateServiceMock;
    })
  };
});

jest.mock(
  '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.service',
  () => {
    return {
      ExchangeRateDataService: jest.fn().mockImplementation(() => {
        return ExchangeRateDataServiceMock;
      })
    };
  }
);

jest.mock(
  '@ghostfolio/api/services/queues/portfolio-snapshot/portfolio-snapshot.service',
  () => {
    return {
      PortfolioSnapshotService: jest.fn().mockImplementation(() => {
        return PortfolioSnapshotServiceMock;
      })
    };
  }
);

jest.mock('@ghostfolio/api/app/redis-cache/redis-cache.service', () => {
  return {
    RedisCacheService: jest.fn().mockImplementation(() => {
      return RedisCacheServiceMock;
    })
  };
});

describe('RoiPortfolioCalculator', () => {
  let accountBalanceService: AccountBalanceService;
  let accountService: AccountService;
  let activitiesService: ActivitiesService;
  let configurationService: ConfigurationService;
  let currentRateService: CurrentRateService;
  let dataProviderService: DataProviderService;
  let exchangeRateDataService: ExchangeRateDataService;
  let portfolioCalculatorFactory: PortfolioCalculatorFactory;
  let portfolioSnapshotService: PortfolioSnapshotService;
  let redisCacheService: RedisCacheService;

  beforeEach(() => {
    PortfolioSnapshotServiceMock.reset();
    RedisCacheServiceMock.reset();

    configurationService = new ConfigurationService();

    exchangeRateDataService = new ExchangeRateDataService(
      null,
      null,
      null,
      null
    );

    accountBalanceService = new AccountBalanceService(
      null,
      exchangeRateDataService,
      null
    );

    accountService = new AccountService(
      accountBalanceService,
      null,
      exchangeRateDataService,
      null,
      null
    );

    redisCacheService = new RedisCacheService(null, configurationService);

    dataProviderService = new DataProviderService(
      configurationService,
      null,
      null,
      null,
      null,
      redisCacheService
    );

    currentRateService = new CurrentRateService(
      null,
      dataProviderService,
      null
    );

    activitiesService = new ActivitiesService(
      accountBalanceService,
      accountService,
      {
        getSplitsByUserId: jest.fn().mockResolvedValue([])
      } as unknown as AssetProfileSplitService,
      null,
      null,
      dataProviderService,
      null,
      exchangeRateDataService,
      null,
      null,
      null,
      null
    );

    portfolioSnapshotService = new PortfolioSnapshotService(null, null);

    portfolioCalculatorFactory = new PortfolioCalculatorFactory(
      configurationService,
      currentRateService,
      exchangeRateDataService,
      portfolioSnapshotService,
      redisCacheService
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Cash Performance', () => {
    it('should exclude cash in a foreign currency from the total buy value', async () => {
      jest.useFakeTimers().setSystemTime(parseDate('2025-01-01').getTime());

      const accountId = randomUUID();

      jest
        .spyOn(accountBalanceService, 'getAccountBalances')
        .mockResolvedValue({
          balances: [
            {
              accountId,
              date: parseDate('2023-12-31'),
              id: randomUUID(),
              value: 1000,
              valueInBaseCurrency: 850
            },
            {
              accountId,
              date: parseDate('2024-12-31'),
              id: randomUUID(),
              value: 2000,
              valueInBaseCurrency: 1800
            }
          ]
        });

      jest.spyOn(accountService, 'getCashDetails').mockResolvedValue({
        accounts: [
          {
            balance: 2000,
            comment: null,
            createdAt: parseDate('2023-12-31'),
            currency: 'USD',
            id: accountId,
            name: 'USD',
            platformId: null,
            updatedAt: parseDate('2023-12-31'),
            userId: userDummyData.id
          }
        ],
        balanceInBaseCurrency: 1820
      });

      jest
        .spyOn(dataProviderService, 'getDataSourceForExchangeRates')
        .mockReturnValue(DataSource.YAHOO);

      jest.spyOn(activitiesService, 'getActivities').mockResolvedValue({
        activities: [
          {
            ...activityDummyData,
            assetProfile: {
              ...assetProfileDummyData,
              currency: 'CHF',
              dataSource: 'YAHOO',
              name: 'Novartis AG',
              symbol: 'NOVN.SW'
            },
            date: parseDate('2023-12-31'),
            feeInAssetProfileCurrency: 0,
            feeInBaseCurrency: 0,
            quantity: 2,
            type: 'BUY',
            unitPriceInAssetProfileCurrency: 100
          }
        ],
        count: 1
      });

      const { activities } =
        await activitiesService.getActivitiesForPortfolioCalculator({
          userCurrency: 'CHF',
          userId: userDummyData.id,
          withCash: true
        });

      // The cash symbol has no market data, the holding is quoted at a
      // constant price so that it does not generate any performance on its own
      jest
        .spyOn(currentRateService, 'getValues')
        .mockImplementation(({ dataGatheringItems, dateQuery }) => {
          const values = [];

          for (const date of eachDayOfInterval({
            end: dateQuery.lt,
            start: dateQuery.gte
          })) {
            for (const { dataSource, symbol } of dataGatheringItems) {
              if (symbol === 'NOVN.SW') {
                values.push({ date, dataSource, marketPrice: 100, symbol });
              }
            }
          }

          return Promise.resolve({
            values,
            dataProviderInfos: [],
            errors: []
          });
        });

      const accountBalanceItems =
        await accountBalanceService.getAccountBalanceItems({
          userCurrency: 'CHF',
          userId: userDummyData.id
        });

      const portfolioCalculator = portfolioCalculatorFactory.createCalculator({
        accountBalanceItems,
        activities,
        calculationType: PerformanceCalculationType.ROI,
        currency: 'CHF',
        userId: userDummyData.id
      });

      const portfolioSnapshot = await portfolioCalculator.computeSnapshot();

      const position = portfolioSnapshot.positions.find(({ symbol }) => {
        return symbol === 'USD';
      });

      /**
       * The cash holding itself keeps its buys (deposits)
       * Bought with currency effect: (1000 USD * 0.85) + (1000 USD * 0.90)
       * = 1750 CHF
       * Net performance with currency effect: 2000 USD * 0.91 - 1750 CHF
       * = 70 CHF
       * ROI with currency effect: 70 CHF / (0 CHF + 1750 CHF) = 0.04
       */
      expect(position).toMatchObject({
        netPerformancePercentageWithCurrencyEffectMap: {
          max: new Big('70').div('1750')
        },
        netPerformanceWithCurrencyEffectMap: {
          max: new Big('70')
        }
      });

      /**
       * Cash in every currency is excluded from the performance, it only
       * contributes to the net worth
       * Total buy value: 2 * 100 CHF = 200 CHF (only the security)
       * Net performance: 2 * 100 CHF - 200 CHF = 0 CHF
       * Net performance with currency effect: 0 CHF (the 70 CHF currency gain
       * of the USD cash is not counted)
       * ROI: 0 CHF / 200 CHF = 0
       * Value: 2 * 100 CHF = 200 CHF
       * Net worth: 200 CHF + 2000 USD * 0.91 = 2020 CHF
       */
      expect(portfolioSnapshot.historicalData.at(-1)).toMatchObject({
        date: '2025-01-01',
        netPerformance: 0,
        netPerformanceInPercentage: 0,
        netPerformanceInPercentageWithCurrencyEffect: 0,
        netPerformanceWithCurrencyEffect: 0,
        netWorth: 2020,
        totalBuyValue: 200,
        totalBuyValueWithCurrencyEffect: 200,
        totalCashInBaseCurrency: 1820,
        value: 200,
        valueWithCurrencyEffect: 200
      });
    });
  });
});
