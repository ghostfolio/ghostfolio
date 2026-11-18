import {
  activityDummyData,
  assetProfileDummyData,
  userDummyData
} from '@ghostfolio/api/app/portfolio/calculator/portfolio-calculator-test-utils';
import { PortfolioCalculatorFactory } from '@ghostfolio/api/app/portfolio/calculator/portfolio-calculator.factory';
import { CurrentRateService } from '@ghostfolio/api/app/portfolio/current-rate.service';
import { CurrentRateServiceMock } from '@ghostfolio/api/app/portfolio/current-rate.service.mock';
import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';
import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.service';
import { PortfolioSnapshotService } from '@ghostfolio/api/services/queues/portfolio-snapshot/portfolio-snapshot.service';
import { PortfolioSnapshotServiceMock } from '@ghostfolio/api/services/queues/portfolio-snapshot/portfolio-snapshot.service.mock';
import { RedisCacheService } from '@ghostfolio/api/services/redis-cache/redis-cache.service';
import { RedisCacheServiceMock } from '@ghostfolio/api/services/redis-cache/redis-cache.service.mock';
import { parseDate } from '@ghostfolio/common/helper';
import { Activity } from '@ghostfolio/common/interfaces';
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

jest.mock('@ghostfolio/api/services/redis-cache/redis-cache.service', () => {
  return {
    RedisCacheService: jest.fn().mockImplementation(() => {
      return RedisCacheServiceMock;
    })
  };
});

describe('PortfolioCalculator missing FX conversions (#6482)', () => {
  let portfolioCalculatorFactory: PortfolioCalculatorFactory;

  beforeEach(() => {
    PortfolioSnapshotServiceMock.reset();
    RedisCacheServiceMock.reset();

    process.env.ACCESS_TOKEN_SALT = process.env.ACCESS_TOKEN_SALT || 'test-salt';
    process.env.JWT_SECRET_KEY = process.env.JWT_SECRET_KEY || 'test-jwt';
    process.env.DATABASE_URL =
      process.env.DATABASE_URL ||
      'postgresql://user:pass@localhost:5432/ghostfolio-db';

    portfolioCalculatorFactory = new PortfolioCalculatorFactory(
      new ConfigurationService(),
      new CurrentRateService(null, null, null),
      new ExchangeRateDataService(null, null, null, null),
      new PortfolioSnapshotService(null, null),
      new RedisCacheService(null, null)
    );
  });

  it('does not throw when activity FX fields are undefined', () => {
    const activities: Activity[] = [
      {
        ...activityDummyData,
        assetProfile: {
          ...assetProfileDummyData,
          currency: 'USD',
          dataSource: 'YAHOO',
          name: 'Test',
          symbol: 'TEST'
        },
        currency: 'USD',
        date: parseDate('2021-04-15'),
        fee: 1,
        // Simulates toCurrencyAtDate() returning undefined before the fix
        feeInAssetProfileCurrency: undefined,
        feeInBaseCurrency: undefined,
        quantity: 1,
        type: 'BUY',
        unitPrice: 100,
        unitPriceInAssetProfileCurrency: undefined,
        value: 100,
        valueInBaseCurrency: undefined
      }
    ];

    expect(() => {
      portfolioCalculatorFactory.createCalculator({
        activities,
        calculationType: PerformanceCalculationType.ROI,
        currency: 'EUR',
        userId: userDummyData.id
      });
    }).not.toThrow();
  });
});
