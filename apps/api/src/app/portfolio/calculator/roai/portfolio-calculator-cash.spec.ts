import { AccountBalanceService } from '@ghostfolio/api/app/account-balance/account-balance.service';
import { AccountService } from '@ghostfolio/api/app/account/account.service';
import { OrderService } from '@ghostfolio/api/app/order/order.service';
import { userDummyData } from '@ghostfolio/api/app/portfolio/calculator/portfolio-calculator-test-utils';
import { PortfolioCalculatorFactory } from '@ghostfolio/api/app/portfolio/calculator/portfolio-calculator.factory';
import { CurrentRateService } from '@ghostfolio/api/app/portfolio/current-rate.service';
import { CurrentRateServiceMock } from '@ghostfolio/api/app/portfolio/current-rate.service.mock';
import { RedisCacheService } from '@ghostfolio/api/app/redis-cache/redis-cache.service';
import { RedisCacheServiceMock } from '@ghostfolio/api/app/redis-cache/redis-cache.service.mock';
import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';
import { DataProviderService } from '@ghostfolio/api/services/data-provider/data-provider.service';
import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.service';
import { ExchangeRateDataServiceMock } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.service.mock';
import { PortfolioSnapshotService } from '@ghostfolio/api/services/queues/portfolio-snapshot/portfolio-snapshot.service';
import { PortfolioSnapshotServiceMock } from '@ghostfolio/api/services/queues/portfolio-snapshot/portfolio-snapshot.service.mock';
import { parseDate } from '@ghostfolio/common/helper';
import { HistoricalDataItem } from '@ghostfolio/common/interfaces';
import { PerformanceCalculationType } from '@ghostfolio/common/types/performance-calculation-type.type';

import { DataSource } from '@prisma/client';
import { Big } from 'big.js';
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

describe('PortfolioCalculator', () => {
  let accountBalanceService: AccountBalanceService;
  let accountService: AccountService;
  let configurationService: ConfigurationService;
  let currentRateService: CurrentRateService;
  let dataProviderService: DataProviderService;
  let exchangeRateDataService: ExchangeRateDataService;
  let orderService: OrderService;
  let portfolioCalculatorFactory: PortfolioCalculatorFactory;
  let portfolioSnapshotService: PortfolioSnapshotService;
  let redisCacheService: RedisCacheService;

  beforeEach(() => {
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
      dataProviderService,
      null,
      null,
      null
    );

    orderService = new OrderService(
      accountBalanceService,
      accountService,
      null,
      dataProviderService,
      null,
      exchangeRateDataService,
      null,
      null
    );

    portfolioSnapshotService = new PortfolioSnapshotService(null);

    portfolioCalculatorFactory = new PortfolioCalculatorFactory(
      configurationService,
      currentRateService,
      exchangeRateDataService,
      portfolioSnapshotService,
      redisCacheService
    );
  });

  describe('Cash Performance', () => {
    it('should calculate performance for cash assets in CHF default currency', async () => {
      jest.useFakeTimers().setSystemTime(parseDate('2025-01-01').getTime());

      const accountId = randomUUID();

      jest
        .spyOn(accountBalanceService, 'getAccountBalances')
        .mockResolvedValue({
          balances: [
            {
              accountId,
              id: randomUUID(),
              date: parseDate('2023-12-31'),
              value: 1000,
              valueInBaseCurrency: 850
            },
            {
              accountId,
              id: randomUUID(),
              date: parseDate('2024-12-31'),
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
            isExcluded: false,
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

      jest.spyOn(orderService, 'getOrders').mockResolvedValue({
        activities: [],
        count: 0
      });

      const { activities } = await orderService.getOrdersForPortfolioCalculator(
        {
          userCurrency: 'CHF',
          userId: userDummyData.id
        }
      );

      jest.spyOn(currentRateService, 'getValues').mockResolvedValue({
        dataProviderInfos: [],
        errors: [],
        values: []
      });

      const portfolioCalculator = portfolioCalculatorFactory.createCalculator({
        activities,
        calculationType: PerformanceCalculationType.ROAI,
        currency: 'CHF',
        userId: userDummyData.id
      });

      const portfolioSnapshot = await portfolioCalculator.computeSnapshot();

      const historicalData20231231 = portfolioSnapshot.historicalData.find(
        ({ date }) => {
          return date === '2023-12-31';
        }
      );
      const historicalData20240101 = portfolioSnapshot.historicalData.find(
        ({ date }) => {
          return date === '2024-01-01';
        }
      );
      const historicalData20241231 = portfolioSnapshot.historicalData.find(
        ({ date }) => {
          return date === '2024-12-31';
        }
      );

      /**
       * Investment value with currency effect: 1000 USD * 0.85 = 850 CHF
       * Total investment: 1000 USD * 0.91 = 910 CHF
       * Value (current): 1000 USD * 0.91 = 910 CHF
       * Value with currency effect: 1000 USD * 0.85 = 850 CHF
       */
      expect(historicalData20231231).toMatchObject({
        date: '2023-12-31',
        investmentValueWithCurrencyEffect: 850,
        netPerformance: 0,
        netPerformanceInPercentage: 0,
        netPerformanceInPercentageWithCurrencyEffect: 0,
        netPerformanceWithCurrencyEffect: 0,
        netWorth: 850,
        totalAccountBalance: 0,
        totalInvestment: 910,
        totalInvestmentValueWithCurrencyEffect: 850,
        value: 910,
        valueWithCurrencyEffect: 850
      });

      /**
       * Net performance with currency effect: (1000 * 0.86) - (1000 * 0.85) = 10 CHF
       * Total investment: 1000 USD * 0.91 = 910 CHF
       * Total investment value with currency effect: 1000 USD * 0.85 = 850 CHF
       * Value (current): 1000 USD * 0.91 = 910 CHF
       * Value with currency effect: 1000 USD * 0.86 = 860 CHF
       */
      expect(historicalData20240101).toMatchObject({
        date: '2024-01-01',
        investmentValueWithCurrencyEffect: 0,
        netPerformance: 0,
        netPerformanceInPercentage: 0,
        netPerformanceInPercentageWithCurrencyEffect: 0.011764705882352941,
        netPerformanceWithCurrencyEffect: 10,
        netWorth: 860,
        totalAccountBalance: 0,
        totalInvestment: 910,
        totalInvestmentValueWithCurrencyEffect: 850,
        value: 910,
        valueWithCurrencyEffect: 860
      });

      /**
       * Investment value with currency effect: 1000 USD * 0.90 = 900 CHF
       * Net performance: (1000 USD * 1.0) - (1000 USD * 1.0) = 0 CHF
       * Net performance with currency effect: (1000 USD * 0.9) - (1000 USD * 0.85) = 50 CHF
       * Total investment: 2000 USD * 0.91 = 1820 CHF
       * Total investment value with currency effect: (1000 USD * 0.85) + (1000 USD * 0.90) = 1750 CHF
       * Value (current): 2000 USD * 0.91 = 1820 CHF
       * Value with currency effect: 2000 USD * 0.9 = 1800 CHF
       */
      expect(historicalData20241231).toMatchObject<HistoricalDataItem>({
        date: '2024-12-31',
        investmentValueWithCurrencyEffect: 900,
        netPerformance: 0,
        netPerformanceInPercentage: 0,
        netPerformanceInPercentageWithCurrencyEffect: 0.058823529411764705,
        netPerformanceWithCurrencyEffect: 50,
        netWorth: 1800,
        totalAccountBalance: 0,
        totalInvestment: 1820,
        totalInvestmentValueWithCurrencyEffect: 1750,
        value: 1820,
        valueWithCurrencyEffect: 1800
      });

      expect(portfolioSnapshot).toMatchObject({
        hasErrors: false,
        totalFeesWithCurrencyEffect: new Big('0'),
        totalInterestWithCurrencyEffect: new Big('0'),
        totalLiabilitiesWithCurrencyEffect: new Big('0')
      });
    });
  });
});
