import {
  getPerformanceByDateRange,
  loadActivitiesFromExportFile,
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
import { getIntervalFromDateRange } from '@ghostfolio/common/calculation-helper';
import { parseDate } from '@ghostfolio/common/helper';
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

    currentRateService = new CurrentRateService(null, null, null);

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

      const { activities, userCurrency } = loadActivitiesFromExportFile(
        'btcusd-buy-and-sell-partially.json'
      );

      const portfolioCalculator = portfolioCalculatorFactory.createCalculator({
        activities,
        calculationType: PerformanceCalculationType.ROAI,
        currency: userCurrency,
        usePortfolioSnapshotCache: false,
        userId: userDummyData.id
      });

      const portfolioSnapshot = await portfolioCalculator.computeSnapshot();

      const performanceByDateRange = await getPerformanceByDateRange({
        portfolioCalculator,
        dateRanges: ['1d', '2017', 'max', 'ytd']
      });

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
            averageInvestment: new Big('623.73992504096715328467'),
            averageInvestmentWithCurrencyEffect: new Big(
              '636.79469348020066587024'
            ),
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
              '1d': new Big('-0.04016229506406263535'),
              '2017': new Big('43.14843430282283692638'),
              max: new Big('41.65910103572163194783'),
              ytd: new Big('-0.04016229506406263535')
            },
            netPerformanceWithCurrencyEffectMap: {
              '1d': new Big('-556.443324'),
              '2017': new Big('27081.23736'),
              max: new Big('26516.208701400000064086'),
              ytd: new Big('-556.443324')
            },
            quantity: new Big('1'),
            symbol: 'BTCUSD',
            tags: [],
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

      expect(performanceByDateRange).toMatchObject({
        '1d': {
          date: '2018-01-01',
          netPerformance: -486.0860160000011,
          netPerformanceInPercentage: -0.035263202509112565,
          netPerformanceInPercentageWithCurrencyEffect: -0.040162295064062624,
          netPerformanceWithCurrencyEffect: -556.4433239999998,
          totalInvestmentValueWithCurrencyEffect: 318.54266729999995,
          valueWithCurrencyEffect: 13298.425356
        },
        '2017': {
          date: '2017-12-31',
          netPerformance: 26957.033439,
          netPerformanceInPercentage: 44.10965416175681,
          netPerformanceInPercentageWithCurrencyEffect: 43.148434302822835,
          netPerformanceWithCurrencyEffect: 27081.23736,
          totalInvestmentValueWithCurrencyEffect: 318.54266729999995,
          valueWithCurrencyEffect: 13854.86868
        },
        max: {
          date: '2018-01-01',
          netPerformance: 26458.9121202,
          netPerformanceInPercentage: 42.43911719562077,
          netPerformanceInPercentageWithCurrencyEffect: 41.65910103572173,
          netPerformanceWithCurrencyEffect: 26516.2087014,
          totalInvestmentValueWithCurrencyEffect: 318.54266729999995,
          valueWithCurrencyEffect: 13298.425356
        },
        ytd: {
          date: '2018-01-01',
          netPerformance: -486.0860160000011,
          netPerformanceInPercentage: -0.035263202509112565,
          netPerformanceInPercentageWithCurrencyEffect: -0.040162295064062624,
          netPerformanceWithCurrencyEffect: -556.4433239999998,
          totalInvestmentValueWithCurrencyEffect: 318.54266729999995,
          valueWithCurrencyEffect: 13298.425356
        }
      });

      const { endDate, startDate } = getIntervalFromDateRange({
        dateRange: '2017'
      });

      const { chart } = await portfolioCalculator.getPerformance({
        end: endDate,
        start: startDate
      });

      expect(chart[0].date).toBe('2016-12-31');
    });

    it.only('with BTCUSD buy and sell partially and fewer chart items', async () => {
      jest.useFakeTimers().setSystemTime(parseDate('2018-01-01').getTime());

      const environmentConfigurationService = new ConfigurationService();

      // Fewer chart items give fewer chart dates, which must not change the
      // average investment. The range 2017 starts with a gross performance
      // and ends with the sell.
      jest.spyOn(configurationService, 'get').mockImplementation((key) => {
        return key === 'MAX_CHART_ITEMS'
          ? 50
          : environmentConfigurationService.get(key);
      });

      const { activities, userCurrency } = loadActivitiesFromExportFile(
        'btcusd-buy-and-sell-partially.json'
      );

      const portfolioCalculator = portfolioCalculatorFactory.createCalculator({
        activities,
        calculationType: PerformanceCalculationType.ROAI,
        currency: userCurrency,
        usePortfolioSnapshotCache: false,
        userId: userDummyData.id
      });

      const portfolioSnapshot = await portfolioCalculator.computeSnapshot();

      const performanceByDateRange = await getPerformanceByDateRange({
        portfolioCalculator,
        dateRanges: ['2017', 'max']
      });

      expect(
        portfolioSnapshot.positions[0]
          .netPerformancePercentageWithCurrencyEffectMap
      ).toMatchObject({
        '2017': new Big('43.14843430282283692638'),
        max: new Big('41.65910103572163194783')
      });

      // Other weights give another rounding of the floating point numbers
      expect(
        performanceByDateRange['2017'].netPerformanceInPercentage
      ).toBeCloseTo(44.10965416175681, 10);

      expect(
        performanceByDateRange['2017']
          .netPerformanceInPercentageWithCurrencyEffect
      ).toBeCloseTo(43.148434302822835, 10);

      expect(performanceByDateRange.max.netPerformanceInPercentage).toBeCloseTo(
        42.43911719562077,
        10
      );

      expect(
        performanceByDateRange.max.netPerformanceInPercentageWithCurrencyEffect
      ).toBeCloseTo(41.65910103572173, 10);
    });
  });
});
