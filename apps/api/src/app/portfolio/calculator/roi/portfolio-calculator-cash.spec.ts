import { AccountBalanceService } from '@ghostfolio/api/app/account-balance/account-balance.service';
import { AccountService } from '@ghostfolio/api/app/account/account.service';
import { ActivitiesService } from '@ghostfolio/api/app/activities/activities.service';
import {
  activityDummyData,
  assetProfileDummyData,
  getPerformanceByDateRange,
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
import { PortfolioSnapshotHolding } from '@ghostfolio/common/models';
import { PerformanceCalculationType } from '@ghostfolio/common/types/performance-calculation-type.type';

import { DataSource } from '@prisma/client';
import { Big } from 'big.js';
import { eachDayOfInterval, isSameDay } from 'date-fns';
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

describe('PortfolioCalculator (ROI)', () => {
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

  describe('Cash Performance', () => {
    it('should count a buy with cash in a foreign currency only once in the invested capital', async () => {
      jest.useFakeTimers().setSystemTime(parseDate('2025-01-01').getTime());

      const accountId = randomUUID();

      // The account balance goes back to 0 USD with the buy of MSFT
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
              value: 0,
              valueInBaseCurrency: 0
            }
          ]
        });

      jest.spyOn(accountService, 'getCashDetails').mockResolvedValue({
        accounts: [
          {
            balance: 0,
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
        balanceInBaseCurrency: 0
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
              currency: 'USD',
              dataSource: 'YAHOO',
              name: 'Microsoft Inc.',
              symbol: 'MSFT'
            },
            date: parseDate('2024-12-31'),
            feeInAssetProfileCurrency: 0,
            feeInBaseCurrency: 0,
            quantity: 10,
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

      // The cash symbol has no market data. The holding is quoted at 100 USD
      // and at 110 USD on the last day.
      jest
        .spyOn(currentRateService, 'getValues')
        .mockImplementation(({ dataGatheringItems, dateQuery }) => {
          const values = [];

          for (const date of eachDayOfInterval({
            end: dateQuery.lt,
            start: dateQuery.gte
          })) {
            for (const { dataSource, symbol } of dataGatheringItems) {
              if (symbol === 'MSFT') {
                values.push({
                  date,
                  dataSource,
                  symbol,
                  marketPrice: isSameDay(parseDate('2025-01-01'), date)
                    ? 110
                    : 100
                });
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
        usePortfolioSnapshotCache: false,
        userId: userDummyData.id
      });

      const portfolioSnapshot = await portfolioCalculator.computeSnapshot();

      const performanceByDateRange = await getPerformanceByDateRange({
        portfolioCalculator,
        dateRanges: ['max']
      });

      /**
       * The invested capital of each holding is the sum of its buy amounts:
       * 1000 USD * 0.91 = 910 CHF (850 CHF with currency effect) for the cash
       * and 10 * 100 USD * 0.91 = 910 CHF (900 CHF with currency effect) for
       * MSFT
       */
      expect(
        portfolioSnapshot.positions.find(({ symbol }) => {
          return symbol === 'USD';
        })
      ).toMatchObject<Partial<PortfolioSnapshotHolding>>({
        averageInvestment: new Big(910),
        averageInvestmentWithCurrencyEffect: new Big(850),
        grossPerformanceWithCurrencyEffect: new Big(50),
        investment: new Big(0),
        quantity: new Big(0)
      });

      expect(
        portfolioSnapshot.positions.find(({ symbol }) => {
          return symbol === 'MSFT';
        })
      ).toMatchObject<Partial<PortfolioSnapshotHolding>>({
        averageInvestment: new Big(910),
        averageInvestmentWithCurrencyEffect: new Big(900),
        grossPerformanceWithCurrencyEffect: new Big(101),
        investment: new Big(910),
        quantity: new Big(10)
      });

      expect(portfolioSnapshot).toMatchObject({
        currentValueInBaseCurrency: new Big(1001),
        hasErrors: false,
        totalInvestment: new Big(910),
        totalInvestmentWithCurrencyEffect: new Big(900)
      });

      /**
       * The buy of MSFT with the cash moves the money from one holding to the
       * other. Thus the invested capital of the portfolio is not the sum of
       * the invested capital of the holdings.
       *
       * Invested capital: 1000 USD * 0.91 = 910 CHF
       * Invested capital with currency effect: 1000 USD * 0.85 = 850 CHF plus
       * the currency gain of 50 CHF which goes into the buy = 900 CHF
       * Net performance: 10 * (110 USD - 100 USD) * 0.91 = 91 CHF
       * Net performance in percentage: 91 CHF / 910 CHF = 10 %
       * Net performance with currency effect: 50 CHF + 101 CHF = 151 CHF
       * Net performance in percentage with currency effect:
       * 151 CHF / 900 CHF ≈ 16.78 %
       */
      expect(portfolioSnapshot.historicalData.at(-1)).toMatchObject(
        expect.objectContaining({
          date: '2025-01-01',
          netPerformance: 91,
          netPerformanceInPercentage: 0.1,
          netPerformanceInPercentageWithCurrencyEffect: 0.16777777777777778,
          netPerformanceWithCurrencyEffect: 151,
          totalInvestment: 910,
          totalInvestmentValueWithCurrencyEffect: 900
        })
      );

      expect(performanceByDateRange.max).toMatchObject({
        date: '2025-01-01',
        netPerformance: 91,
        netPerformanceInPercentage: 0.1,
        netPerformanceInPercentageWithCurrencyEffect: 0.16777777777777778,
        netPerformanceWithCurrencyEffect: 151
      });
    });
  });
});
