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
import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';
import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.service';
import { ExchangeRateDataServiceMock } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.service.mock';
import { PortfolioSnapshotService } from '@ghostfolio/api/services/queues/portfolio-snapshot/portfolio-snapshot.service';
import { PortfolioSnapshotServiceMock } from '@ghostfolio/api/services/queues/portfolio-snapshot/portfolio-snapshot.service.mock';
import { parseDate } from '@ghostfolio/common/helper';
import { Activity } from '@ghostfolio/common/interfaces';
import { PerformanceCalculationType } from '@ghostfolio/common/types/performance-calculation-type.type';

import { Big } from 'big.js';

jest.mock('@ghostfolio/api/app/portfolio/current-rate.service', () => {
  return {
    CurrentRateService: jest.fn().mockImplementation(() => {
      return CurrentRateServiceMock;
    })
  };
});

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

describe('PortfolioCalculator', () => {
  let configurationService: ConfigurationService;
  let currentRateService: CurrentRateService;
  let exchangeRateDataService: ExchangeRateDataService;
  let portfolioCalculatorFactory: PortfolioCalculatorFactory;
  let portfolioSnapshotService: PortfolioSnapshotService;
  let redisCacheService: RedisCacheService;

  beforeEach(() => {
    PortfolioSnapshotServiceMock.reset();
    RedisCacheServiceMock.reset();

    configurationService = new ConfigurationService();

    currentRateService = new CurrentRateService(null, null, null, null);

    exchangeRateDataService = new ExchangeRateDataService(
      null,
      null,
      null,
      null
    );

    portfolioSnapshotService = new PortfolioSnapshotService(null, null);

    redisCacheService = new RedisCacheService(null, null);

    portfolioCalculatorFactory = new PortfolioCalculatorFactory(
      configurationService,
      currentRateService,
      exchangeRateDataService,
      portfolioSnapshotService,
      redisCacheService
    );
  });

  describe('get current positions', () => {
    it.only('with BTCUSD buy and sell partially', async () => {
      jest.useFakeTimers().setSystemTime(parseDate('2018-01-01').getTime());

      const activities: Activity[] = [
        {
          ...activityDummyData,
          assetProfile: {
            ...assetProfileDummyData,
            currency: 'USD',
            dataSource: 'YAHOO',
            name: 'Bitcoin USD',
            symbol: 'BTCUSD'
          },
          date: new Date('2015-01-01'),
          feeInAssetProfileCurrency: 0,
          feeInBaseCurrency: 0,
          quantity: 2,
          type: 'BUY',
          unitPriceInAssetProfileCurrency: 320.43
        },
        {
          ...activityDummyData,
          assetProfile: {
            ...assetProfileDummyData,
            currency: 'USD',
            dataSource: 'YAHOO',
            name: 'Bitcoin USD',
            symbol: 'BTCUSD'
          },
          date: new Date('2017-12-31'),
          feeInAssetProfileCurrency: 0,
          feeInBaseCurrency: 0,
          quantity: 1,
          type: 'SELL',
          unitPriceInAssetProfileCurrency: 14156.4
        }
      ];

      const portfolioCalculator = portfolioCalculatorFactory.createCalculator({
        activities,
        calculationType: PerformanceCalculationType.ROAI,
        currency: 'CHF',
        userId: userDummyData.id
      });

      const portfolioSnapshot = await portfolioCalculator.computeSnapshot();

      const investments = portfolioCalculator.getInvestments();

      const investmentsByMonth = portfolioCalculator.getInvestmentsByGroup({
        data: portfolioSnapshot.historicalData,
        groupBy: 'month'
      });

      const investmentsByYear = portfolioCalculator.getInvestmentsByGroup({
        data: portfolioSnapshot.historicalData,
        groupBy: 'year'
      });

      expect(portfolioSnapshot).toMatchObject({
        currentValueInBaseCurrency: new Big('13298.425356'),
        errors: [],
        hasErrors: false,
        positions: [
          {
            activitiesCount: 2,
            averagePrice: new Big('320.43'),
            currency: 'USD',
            dataSource: 'YAHOO',
            dateOfFirstActivity: '2015-01-01',
            dividend: new Big('0'),
            dividendInBaseCurrency: new Big('0'),
            fee: new Big('0'),
            feeInBaseCurrency: new Big('0'),
            grossPerformance: new Big('27172.74').mul(0.97373),
            grossPerformancePercentage: new Big('42.41978276196153750666'),
            grossPerformancePercentageWithCurrencyEffect: new Big(
              '41.6401219622042072686'
            ),
            grossPerformanceWithCurrencyEffect: new Big(
              '26516.208701400000064086'
            ),
            investment: new Big('320.43').mul(0.97373),
            investmentWithCurrencyEffect: new Big('318.542667299999967957'),
            marketPrice: 13657.2,
            marketPriceInBaseCurrency: 13298.425356,
            netPerformance: new Big('27172.74').mul(0.97373),
            netPerformancePercentage: new Big('42.41978276196153750666'),
            netPerformancePercentageWithCurrencyEffectMap: {
              max: new Big('41.72313811883729606471')
            },
            netPerformanceWithCurrencyEffectMap: {
              max: new Big('26516.208701400000064086')
            },
            quantity: new Big('1'),
            symbol: 'BTCUSD',
            tags: [],
            timeWeightedInvestment: new Big('623.73992504096715328467'),
            timeWeightedInvestmentWithCurrencyEffect: new Big(
              '636.79469348020066587024'
            ),
            valueInBaseCurrency: new Big('13298.425356')
          }
        ],
        totalFeesWithCurrencyEffect: new Big('0'),
        totalInterestWithCurrencyEffect: new Big('0'),
        totalInvestment: new Big('320.43').mul(0.97373),
        totalInvestmentWithCurrencyEffect: new Big('318.542667299999967957'),
        totalLiabilitiesWithCurrencyEffect: new Big('0')
      });

      expect(portfolioSnapshot.historicalData.at(-1)).toMatchObject(
        expect.objectContaining({
          netPerformance: new Big('27172.74').mul(0.97373).toNumber(),
          netPerformanceInPercentage: 42.419782761961535,
          netPerformanceInPercentageWithCurrencyEffect: 41.640121962204205,
          netPerformanceWithCurrencyEffect: 26516.2087014,
          totalInvestment: 312.0123039,
          totalInvestmentValueWithCurrencyEffect: 318.54266729999995
        })
      );

      expect(investments).toEqual([
        { date: '2015-01-01', investment: new Big('640.86') },
        { date: '2017-12-31', investment: new Big('320.43') }
      ]);

      expect(investmentsByMonth).toEqual([
        { date: '2014-12-01', investment: 0 },
        { date: '2015-01-01', investment: 637.0853345999999 },
        { date: '2015-02-01', investment: 0 },
        { date: '2015-03-01', investment: 0 },
        { date: '2015-04-01', investment: 0 },
        { date: '2015-05-01', investment: 0 },
        { date: '2015-06-01', investment: 0 },
        { date: '2015-07-01', investment: 0 },
        { date: '2015-08-01', investment: 0 },
        { date: '2015-09-01', investment: 0 },
        { date: '2015-10-01', investment: 0 },
        { date: '2015-11-01', investment: 0 },
        { date: '2015-12-01', investment: 0 },
        { date: '2016-01-01', investment: 0 },
        { date: '2016-02-01', investment: 0 },
        { date: '2016-03-01', investment: 0 },
        { date: '2016-04-01', investment: 0 },
        { date: '2016-05-01', investment: 0 },
        { date: '2016-06-01', investment: 0 },
        { date: '2016-07-01', investment: 0 },
        { date: '2016-08-01', investment: 0 },
        { date: '2016-09-01', investment: 0 },
        { date: '2016-10-01', investment: 0 },
        { date: '2016-11-01', investment: 0 },
        { date: '2016-12-01', investment: 0 },
        { date: '2017-01-01', investment: 0 },
        { date: '2017-02-01', investment: 0 },
        { date: '2017-03-01', investment: 0 },
        { date: '2017-04-01', investment: 0 },
        { date: '2017-05-01', investment: 0 },
        { date: '2017-06-01', investment: 0 },
        { date: '2017-07-01', investment: 0 },
        { date: '2017-08-01', investment: 0 },
        { date: '2017-09-01', investment: 0 },
        { date: '2017-10-01', investment: 0 },
        { date: '2017-11-01', investment: 0 },
        { date: '2017-12-01', investment: -318.54266729999995 },
        { date: '2018-01-01', investment: 0 }
      ]);

      expect(investmentsByYear).toEqual([
        { date: '2014-01-01', investment: 0 },
        { date: '2015-01-01', investment: 637.0853345999999 },
        { date: '2016-01-01', investment: 0 },
        { date: '2017-01-01', investment: -318.54266729999995 },
        { date: '2018-01-01', investment: 0 }
      ]);
    });
  });
});
