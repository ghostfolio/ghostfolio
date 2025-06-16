import { Activity } from '@ghostfolio/api/app/order/interfaces/activities.interface';
import {
  activityDummyData,
  symbolProfileDummyData,
  userDummyData
} from '@ghostfolio/api/app/portfolio/calculator/portfolio-calculator-test-utils';
import { PortfolioCalculatorFactory } from '@ghostfolio/api/app/portfolio/calculator/portfolio-calculator.factory';
import { CurrentRateService } from '@ghostfolio/api/app/portfolio/current-rate.service';
import { CurrentRateServiceMock } from '@ghostfolio/api/app/portfolio/current-rate.service.mock';
import { RedisCacheService } from '@ghostfolio/api/app/redis-cache/redis-cache.service';
import { RedisCacheServiceMock } from '@ghostfolio/api/app/redis-cache/redis-cache.service.mock';
import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';
import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.service';
import { ExchangeRateDataServiceMock } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.service.mock';
import { PortfolioSnapshotService } from '@ghostfolio/api/services/queues/portfolio-snapshot/portfolio-snapshot.service';
import { PortfolioSnapshotServiceMock } from '@ghostfolio/api/services/queues/portfolio-snapshot/portfolio-snapshot.service.mock';
import { parseDate } from '@ghostfolio/common/helper';
import { PerformanceCalculationType } from '@ghostfolio/common/types/performance-calculation-type.type';

import { Big } from 'big.js';

jest.mock('@ghostfolio/api/app/portfolio/current-rate.service', () => {
  return {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    CurrentRateService: jest.fn().mockImplementation(() => {
      return CurrentRateServiceMock;
    })
  };
});

jest.mock(
  '@ghostfolio/api/services/queues/portfolio-snapshot/portfolio-snapshot.service',
  () => {
    return {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      PortfolioSnapshotService: jest.fn().mockImplementation(() => {
        return PortfolioSnapshotServiceMock;
      })
    };
  }
);

jest.mock('@ghostfolio/api/app/redis-cache/redis-cache.service', () => {
  return {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    RedisCacheService: jest.fn().mockImplementation(() => {
      return RedisCacheServiceMock;
    })
  };
});

jest.mock(
  '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.service',
  () => {
    return {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      ExchangeRateDataService: jest.fn().mockImplementation(() => {
        return ExchangeRateDataServiceMock;
      })
    };
  }
);

describe('PortfolioCalculator', () => {
  let configurationService: ConfigurationService;
  let currentRateService: CurrentRateService;
  let exchangeRateDataService: ExchangeRateDataService;
  let portfolioCalculatorFactory: PortfolioCalculatorFactory;
  let portfolioSnapshotService: PortfolioSnapshotService;
  let redisCacheService: RedisCacheService;

  beforeEach(() => {
    configurationService = new ConfigurationService();

    currentRateService = new CurrentRateService(null, null, null, null);

    exchangeRateDataService = new ExchangeRateDataService(
      null,
      null,
      null,
      null
    );

    portfolioSnapshotService = new PortfolioSnapshotService(null);

    redisCacheService = new RedisCacheService(null, null);

    portfolioCalculatorFactory = new PortfolioCalculatorFactory(
      configurationService,
      currentRateService,
      exchangeRateDataService,
      portfolioSnapshotService,
      redisCacheService,
      null
    );
  });

  describe('get current positions', () => {
    it.only('with GOOGL buy', async () => {
      jest.useFakeTimers().setSystemTime(parseDate('2023-07-10').getTime());

      const activities: Activity[] = [
        {
          ...activityDummyData,
          date: new Date('2023-01-03'),
          feeInAssetProfileCurrency: 1,
          quantity: 1,
          SymbolProfile: {
            ...symbolProfileDummyData,
            currency: 'USD',
            dataSource: 'YAHOO',
            name: 'Alphabet Inc.',
            symbol: 'GOOGL'
          },
          type: 'BUY',
          unitPriceInAssetProfileCurrency: 89.12
        }
      ];

      const portfolioCalculator = portfolioCalculatorFactory.createCalculator({
        activities,
        calculationType: PerformanceCalculationType.ROI,
        currency: 'CHF',
        userId: userDummyData.id
      });

      const portfolioSnapshot = await portfolioCalculator.computeSnapshot();

      const investments = portfolioCalculator.getInvestments();

      const investmentsByMonth = portfolioCalculator.getInvestmentsByGroup({
        data: portfolioSnapshot.historicalData,
        groupBy: 'month'
      });

      expect(portfolioSnapshot).toMatchObject({
        currentValueInBaseCurrency: new Big('103.10483'),
        errors: [],
        hasErrors: false,
        positions: [
          {
            averagePrice: new Big('89.12'),
            currency: 'USD',
            dataSource: 'YAHOO',
            dividend: new Big('0'),
            dividendInBaseCurrency: new Big('0'),
            fee: new Big('1'),
            feeInBaseCurrency: new Big('0.9238'),
            firstBuyDate: '2023-01-03',
            grossPerformance: new Big('27.33').mul(0.8854),
            grossPerformancePercentage: new Big('0.3066651705565529623'),
            grossPerformancePercentageWithCurrencyEffect: new Big(
              '0.25235044599563974109'
            ),
            grossPerformanceWithCurrencyEffect: new Big('20.775774'),
            investment: new Big('89.12').mul(0.8854),
            investmentWithCurrencyEffect: new Big('82.329056'),
            netPerformance: new Big('26.33').mul(0.8854),
            netPerformancePercentage: new Big('0.29544434470377019749'),
            netPerformancePercentageWithCurrencyEffectMap: {
              max: new Big('0.24112962014285697628')
            },
            netPerformanceWithCurrencyEffectMap: { max: new Big('19.851974') },
            marketPrice: 116.45,
            marketPriceInBaseCurrency: 103.10483,
            quantity: new Big('1'),
            symbol: 'GOOGL',
            tags: [],
            timeWeightedInvestment: new Big('89.12').mul(0.8854),
            timeWeightedInvestmentWithCurrencyEffect: new Big('82.329056'),
            transactionCount: 1,
            valueInBaseCurrency: new Big('103.10483')
          }
        ],
        totalFeesWithCurrencyEffect: new Big('0.9238'),
        totalInterestWithCurrencyEffect: new Big('0'),
        totalInvestment: new Big('89.12').mul(0.8854),
        totalInvestmentWithCurrencyEffect: new Big('82.329056'),
        totalLiabilitiesWithCurrencyEffect: new Big('0'),
        totalValuablesWithCurrencyEffect: new Big('0')
      });

      expect(portfolioSnapshot.historicalData.at(-1)).toMatchObject(
        expect.objectContaining({
          netPerformance: new Big('26.33').mul(0.8854).toNumber(),
          netPerformanceInPercentage: 0.29544434470377019749,
          netPerformanceInPercentageWithCurrencyEffect: 0.24112962014285697628,
          netPerformanceWithCurrencyEffect: 19.851974,
          totalInvestmentValueWithCurrencyEffect: 82.329056
        })
      );

      expect(investments).toEqual([
        { date: '2023-01-03', investment: new Big('89.12') }
      ]);

      expect(investmentsByMonth).toEqual([
        { date: '2023-01-01', investment: 82.329056 },
        { date: '2023-02-01', investment: 0 },
        { date: '2023-03-01', investment: 0 },
        { date: '2023-04-01', investment: 0 },
        { date: '2023-05-01', investment: 0 },
        { date: '2023-06-01', investment: 0 },
        { date: '2023-07-01', investment: 0 }
      ]);
    });
  });
});
