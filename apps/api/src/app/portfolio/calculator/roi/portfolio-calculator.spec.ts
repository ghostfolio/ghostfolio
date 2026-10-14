import { userDummyData } from '@ghostfolio/api/app/portfolio/calculator/portfolio-calculator-test-utils';
import { PortfolioCalculatorFactory } from '@ghostfolio/api/app/portfolio/calculator/portfolio-calculator.factory';
import { CurrentRateService } from '@ghostfolio/api/app/portfolio/current-rate.service';
import { CurrentRateServiceMock } from '@ghostfolio/api/app/portfolio/current-rate.service.mock';
import { AccumulatedValues } from '@ghostfolio/api/app/portfolio/interfaces/accumulated-values.interface';
import { RedisCacheService } from '@ghostfolio/api/app/redis-cache/redis-cache.service';
import { RedisCacheServiceMock } from '@ghostfolio/api/app/redis-cache/redis-cache.service.mock';
import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';
import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.service';
import { PortfolioSnapshotService } from '@ghostfolio/api/services/queues/portfolio-snapshot/portfolio-snapshot.service';
import { PortfolioSnapshotServiceMock } from '@ghostfolio/api/services/queues/portfolio-snapshot/portfolio-snapshot.service.mock';
import { HistoricalDataItem } from '@ghostfolio/common/interfaces';
import { PerformanceCalculationType } from '@ghostfolio/common/types/performance-calculation-type.type';

import { Big } from 'big.js';

import { PortfolioCalculator } from '../portfolio-calculator';

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

function getAccumulatedValues({
  totalBuyValue,
  totalDividendValue = 0,
  totalNetPerformanceValue
}: {
  totalBuyValue: number;
  totalDividendValue?: number;
  totalNetPerformanceValue: number;
}): AccumulatedValues {
  return {
    investmentValueWithCurrencyEffect: new Big(0),
    totalAverageInvestmentValue: new Big(0),
    totalAverageInvestmentValueWithCurrencyEffect: new Big(0),
    totalBuyValue: new Big(totalBuyValue),
    totalBuyValueWithCurrencyEffect: new Big(totalBuyValue),
    totalCashValueWithCurrencyEffect: new Big(0),
    totalCurrentValue: new Big(0),
    totalCurrentValueWithCurrencyEffect: new Big(0),
    totalDividendValueWithCurrencyEffect: new Big(totalDividendValue),
    totalInvestmentValue: new Big(0),
    totalInvestmentValueWithCurrencyEffect: new Big(0),
    totalNetPerformanceValue: new Big(totalNetPerformanceValue),
    totalNetPerformanceValueWithCurrencyEffect: new Big(
      totalNetPerformanceValue
    ),
    totalNetWorthValueWithCurrencyEffect: new Big(0)
  };
}

function getHistoricalDataItem({
  date,
  dividendInBaseCurrency = 0,
  netPerformance,
  netPerformanceWithCurrencyEffect = netPerformance,
  totalBuyValue,
  totalBuyValueWithCurrencyEffect = totalBuyValue,
  value,
  valueWithCurrencyEffect = value
}: {
  date: string;
  dividendInBaseCurrency?: number;
  netPerformance: number;
  netPerformanceWithCurrencyEffect?: number;
  totalBuyValue: number;
  totalBuyValueWithCurrencyEffect?: number;
  value: number;
  valueWithCurrencyEffect?: number;
}): HistoricalDataItem {
  return {
    date,
    dividendInBaseCurrency,
    netPerformance,
    netPerformanceWithCurrencyEffect,
    totalBuyValue,
    totalBuyValueWithCurrencyEffect,
    value,
    valueWithCurrencyEffect
  };
}

describe('RoiPortfolioCalculator', () => {
  let portfolioCalculator: PortfolioCalculator;

  beforeEach(() => {
    PortfolioSnapshotServiceMock.reset();
    RedisCacheServiceMock.reset();

    const portfolioCalculatorFactory = new PortfolioCalculatorFactory(
      new ConfigurationService(),
      new CurrentRateService(null, null, null),
      new ExchangeRateDataService(null, null, null, null),
      new PortfolioSnapshotService(null, null),
      new RedisCacheService(null, null)
    );

    portfolioCalculator = portfolioCalculatorFactory.createCalculator({
      activities: [],
      calculationType: PerformanceCalculationType.ROI,
      currency: 'CHF',
      userId: userDummyData.id
    });
  });

  describe('calculate performance percentages', () => {
    it('divides the net performance by the total buy value', () => {
      const performancePercentagesByDate = portfolioCalculator[
        'calculatePerformancePercentages'
      ]({
        accumulatedValuesByDate: {
          '2024-12-31': getAccumulatedValues({
            totalBuyValue: 10000,
            totalDividendValue: 100,
            totalNetPerformanceValue: 500
          })
        }
      });

      expect(performancePercentagesByDate['2024-12-31']).toEqual({
        dividendInPercentageWithCurrencyEffect: 0.01,
        netPerformanceInPercentage: 0.05,
        netPerformanceInPercentageWithCurrencyEffect: 0.05
      });
    });

    it('returns 0 without a buy', () => {
      const performancePercentagesByDate = portfolioCalculator[
        'calculatePerformancePercentages'
      ]({
        accumulatedValuesByDate: {
          '2024-12-31': getAccumulatedValues({
            totalBuyValue: 0,
            totalNetPerformanceValue: 0
          })
        }
      });

      expect(performancePercentagesByDate['2024-12-31']).toEqual({
        dividendInPercentageWithCurrencyEffect: 0,
        netPerformanceInPercentage: 0,
        netPerformanceInPercentageWithCurrencyEffect: 0
      });
    });
  });

  describe('calculate performance percentages for date range', () => {
    it('with buys only within the date range', () => {
      const performancePercentagesByDate = portfolioCalculator[
        'calculatePerformancePercentagesForDateRange'
      ]({
        historicalDataItems: [
          getHistoricalDataItem({
            date: '2023-12-31',
            netPerformance: 0,
            totalBuyValue: 0,
            value: 0
          }),
          getHistoricalDataItem({
            date: '2024-01-01',
            netPerformance: 0,
            totalBuyValue: 1000,
            value: 1000
          }),
          getHistoricalDataItem({
            date: '2024-12-31',
            netPerformance: 500,
            totalBuyValue: 10000,
            value: 10500
          })
        ]
      });

      // 500 / (0 + 10000 - 0) = 0.05
      expect(
        performancePercentagesByDate['2024-12-31'].netPerformanceInPercentage
      ).toBeCloseTo(0.05, 10);

      expect(
        performancePercentagesByDate['2024-12-31']
          .netPerformanceInPercentageWithCurrencyEffect
      ).toBeCloseTo(0.05, 10);
    });

    it('with a value at the start date of the date range', () => {
      const performancePercentagesByDate = portfolioCalculator[
        'calculatePerformancePercentagesForDateRange'
      ]({
        historicalDataItems: [
          // The netPerformance is already rebased to the start date
          getHistoricalDataItem({
            date: '2024-01-01',
            netPerformance: 0,
            netPerformanceWithCurrencyEffect: 0,
            totalBuyValue: 1000,
            totalBuyValueWithCurrencyEffect: 900,
            value: 2000,
            valueWithCurrencyEffect: 1800
          }),
          getHistoricalDataItem({
            date: '2024-12-31',
            dividendInBaseCurrency: 27,
            netPerformance: 300,
            netPerformanceWithCurrencyEffect: 540,
            totalBuyValue: 2000,
            totalBuyValueWithCurrencyEffect: 1800,
            value: 3300,
            valueWithCurrencyEffect: 3240
          })
        ]
      });

      // 300 / (2000 + 2000 - 1000) = 0.1
      expect(
        performancePercentagesByDate['2024-12-31'].netPerformanceInPercentage
      ).toBeCloseTo(0.1, 10);

      // 540 / (1800 + 1800 - 900) = 0.2
      expect(
        performancePercentagesByDate['2024-12-31']
          .netPerformanceInPercentageWithCurrencyEffect
      ).toBeCloseTo(0.2, 10);

      // 27 / (1800 + 1800 - 900) = 0.01
      expect(
        performancePercentagesByDate['2024-12-31']
          .dividendInPercentageWithCurrencyEffect
      ).toBeCloseTo(0.01, 10);
    });

    it('returns 0 without a value and without a buy', () => {
      const performancePercentagesByDate = portfolioCalculator[
        'calculatePerformancePercentagesForDateRange'
      ]({
        historicalDataItems: [
          getHistoricalDataItem({
            date: '2024-01-01',
            netPerformance: 0,
            totalBuyValue: 0,
            value: 0
          }),
          getHistoricalDataItem({
            date: '2024-12-31',
            netPerformance: 0,
            totalBuyValue: 0,
            value: 0
          })
        ]
      });

      expect(performancePercentagesByDate['2024-12-31']).toEqual({
        dividendInPercentageWithCurrencyEffect: 0,
        netPerformanceInPercentage: 0,
        netPerformanceInPercentageWithCurrencyEffect: 0
      });
    });
  });

  describe('get additional historical data item values', () => {
    it('returns the total buy values', () => {
      expect(
        portfolioCalculator['getAdditionalHistoricalDataItemValues'](
          getAccumulatedValues({
            totalBuyValue: 10000,
            totalNetPerformanceValue: 500
          })
        )
      ).toEqual({
        totalBuyValue: 10000,
        totalBuyValueWithCurrencyEffect: 10000
      });
    });
  });
});
