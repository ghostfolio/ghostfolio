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
import { PortfolioSnapshotService } from '@ghostfolio/api/services/queues/portfolio-snapshot/portfolio-snapshot.service';
import { PortfolioSnapshotServiceMock } from '@ghostfolio/api/services/queues/portfolio-snapshot/portfolio-snapshot.service.mock';
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

describe('PortfolioCalculator tax', () => {
  let portfolioCalculatorFactory: PortfolioCalculatorFactory;

  beforeEach(() => {
    PortfolioSnapshotServiceMock.reset();
    RedisCacheServiceMock.reset();

    portfolioCalculatorFactory = new PortfolioCalculatorFactory(
      new ConfigurationService(),
      new CurrentRateService(null, null, null),
      new ExchangeRateDataService(null, null, null, null),
      new PortfolioSnapshotService(null, null),
      new RedisCacheService(null, null)
    );
  });

  it('subtracts taxes from net performance while preserving gross performance and gross dividends', async () => {
    jest.useFakeTimers().setSystemTime(parseDate('2023-07-10').getTime());

    const { activities, userCurrency } = loadActivitiesFromExportFile(
      'msft-buy-with-dividend.json'
    );

    const activitiesWithTax = activities.map((activity) => {
      const tax =
        activity.type === 'BUY' ? 5 : activity.type === 'DIVIDEND' ? 0.2 : 0;

      return {
        ...activity,
        tax,
        taxInAssetProfileCurrency: tax,
        taxInBaseCurrency: tax
      };
    });

    const portfolioCalculator = portfolioCalculatorFactory.createCalculator({
      activities: activitiesWithTax,
      calculationType: PerformanceCalculationType.ROAI,
      currency: userCurrency,
      usePortfolioSnapshotCache: false,
      userId: userDummyData.id
    });

    const portfolioSnapshot = await portfolioCalculator.computeSnapshot();

    const performanceByDateRange = await getPerformanceByDateRange({
      portfolioCalculator,
      dateRanges: ['max', 'ytd']
    });

    expect(portfolioSnapshot).toMatchObject({
      positions: [
        expect.objectContaining({
          dividend: new Big('0.62'),
          dividendInBaseCurrency: new Big('0.62'),
          fee: new Big('19'),
          grossPerformance: new Big('33.87'),
          grossPerformanceWithCurrencyEffect: new Big('33.87'),
          netPerformance: new Big('9.67'),
          tax: new Big('5.2'),
          taxInBaseCurrency: new Big('5.2')
        })
      ]
    });

    expect(performanceByDateRange.max).toMatchObject({
      dividendInBaseCurrency: 0.62,
      netPerformance: expect.closeTo(9.67, 10),
      netPerformanceWithCurrencyEffect: expect.closeTo(9.67, 10)
    });

    // Both taxes occurred before the YTD range and must therefore be part of
    // the starting baseline instead of reducing the performance of this range.
    expect(performanceByDateRange.ytd).toMatchObject({
      dividendInBaseCurrency: 0,
      netPerformance: expect.closeTo(-7.68, 10),
      netPerformanceWithCurrencyEffect: expect.closeTo(-7.68, 10)
    });
  });
});
