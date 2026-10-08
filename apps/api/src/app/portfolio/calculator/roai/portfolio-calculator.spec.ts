import { PortfolioCalculator } from '@ghostfolio/api/app/portfolio/calculator/portfolio-calculator';
import { userDummyData } from '@ghostfolio/api/app/portfolio/calculator/portfolio-calculator-test-utils';
import { PortfolioCalculatorFactory } from '@ghostfolio/api/app/portfolio/calculator/portfolio-calculator.factory';
import { CurrentRateService } from '@ghostfolio/api/app/portfolio/current-rate.service';
import { CurrentRateServiceMock } from '@ghostfolio/api/app/portfolio/current-rate.service.mock';
import { RedisCacheService } from '@ghostfolio/api/app/redis-cache/redis-cache.service';
import { RedisCacheServiceMock } from '@ghostfolio/api/app/redis-cache/redis-cache.service.mock';
import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';
import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.service';
import { PortfolioSnapshotService } from '@ghostfolio/api/services/queues/portfolio-snapshot/portfolio-snapshot.service';
import { PortfolioSnapshotServiceMock } from '@ghostfolio/api/services/queues/portfolio-snapshot/portfolio-snapshot.service.mock';
import { getIntervalFromDateRange } from '@ghostfolio/common/calculation-helper';
import { HistoricalDataItem } from '@ghostfolio/common/interfaces';
import { PerformanceCalculationType } from '@ghostfolio/common/types/performance-calculation-type.type';

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

function getHistoricalDataItem({
  date,
  investment,
  netPerformance
}: {
  date: string;
  investment: number;
  netPerformance: number;
}): HistoricalDataItem {
  return {
    date,
    netPerformance,
    dividendInBaseCurrency: 0,
    netPerformanceWithCurrencyEffect: netPerformance,
    totalInvestment: investment,
    totalInvestmentValueWithCurrencyEffect: investment,
    value: investment + netPerformance,
    valueWithCurrencyEffect: investment + netPerformance
  };
}

describe('PortfolioCalculator', () => {
  let configurationService: ConfigurationService;
  let currentRateService: CurrentRateService;
  let exchangeRateDataService: ExchangeRateDataService;
  let portfolioCalculator: PortfolioCalculator;
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

    portfolioCalculator = portfolioCalculatorFactory.createCalculator({
      activities: [],
      calculationType: PerformanceCalculationType.ROAI,
      currency: 'USD',
      userId: userDummyData.id
    });
  });

  describe('calculate performance percentages for date range', () => {
    it('with a buy followed by a gap between chart dates', () => {
      const performancePercentagesByDate = portfolioCalculator[
        'calculatePerformancePercentagesForDateRange'
      ]({
        historicalDataItems: [
          getHistoricalDataItem({
            date: '2017-01-01',
            investment: 100,
            netPerformance: 0
          }),
          // Buy, followed by a gap of 21 days until the next chart date
          getHistoricalDataItem({
            date: '2017-01-02',
            investment: 200,
            netPerformance: 0
          }),
          // Sell
          getHistoricalDataItem({
            date: '2017-01-23',
            investment: 100,
            netPerformance: 44
          })
        ]
      });

      // The investment of each chart date applies to each day until the next
      // chart date. The investment of the last chart date counts for this day
      // only: (1 * 100 + 21 * 200 + 1 * 100) / 23 = 4400 / 23
      expect(
        performancePercentagesByDate['2017-01-23'].netPerformanceInPercentage
      ).toBeCloseTo(0.23, 10);

      expect(
        performancePercentagesByDate['2017-01-23']
          .netPerformanceInPercentageWithCurrencyEffect
      ).toBeCloseTo(0.23, 10);
    });

    it('with an additional chart date of the same investment', () => {
      const performancePercentagesByDate = portfolioCalculator[
        'calculatePerformancePercentagesForDateRange'
      ]({
        historicalDataItems: [
          getHistoricalDataItem({
            date: '2017-01-01',
            investment: 100,
            netPerformance: 0
          }),
          getHistoricalDataItem({
            date: '2017-01-02',
            investment: 200,
            netPerformance: 0
          }),
          // An additional chart date splits the gap but must not change the
          // average investment
          getHistoricalDataItem({
            date: '2017-01-12',
            investment: 200,
            netPerformance: 20
          }),
          getHistoricalDataItem({
            date: '2017-01-23',
            investment: 100,
            netPerformance: 44
          })
        ]
      });

      expect(
        performancePercentagesByDate['2017-01-23'].netPerformanceInPercentage
      ).toBeCloseTo(0.23, 10);

      expect(
        performancePercentagesByDate['2017-01-23']
          .netPerformanceInPercentageWithCurrencyEffect
      ).toBeCloseTo(0.23, 10);
    });
  });

  describe('get performance', () => {
    // The chart items are dated at midnight in UTC, but a calendar year date
    // range ends at the end of 31 December in the time zone of the instance.
    // Hence this test must give the same result with the instance in any time
    // zone. Set TEST_TZ to run it with the instance in another time zone.
    it('with a calendar year date range', async () => {
      const snapshot = await portfolioCalculator.getSnapshot();

      snapshot.historicalData = [
        getHistoricalDataItem({
          date: '2016-12-31',
          investment: 100,
          netPerformance: 0
        }),
        getHistoricalDataItem({
          date: '2017-12-31',
          investment: 100,
          netPerformance: 10
        }),
        getHistoricalDataItem({
          date: '2018-01-01',
          investment: 100,
          netPerformance: 20
        })
      ];

      const { endDate, startDate } = getIntervalFromDateRange({
        dateRange: '2017'
      });

      const { chart } = await portfolioCalculator.getPerformance({
        end: endDate,
        start: startDate
      });

      expect(
        chart.map(({ date }) => {
          return date;
        })
      ).toEqual(['2016-12-31', '2017-12-31']);
    });
  });
});
