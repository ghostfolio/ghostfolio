import {
  activityDummyData,
  assetProfileDummyData,
  userDummyData
} from '@ghostfolio/api/app/portfolio/calculator/portfolio-calculator-test-utils';
import { CurrentRateService } from '@ghostfolio/api/app/portfolio/current-rate.service';
import { CurrentRateServiceMock } from '@ghostfolio/api/app/portfolio/current-rate.service.mock';
import { RedisCacheService } from '@ghostfolio/api/app/redis-cache/redis-cache.service';
import { RedisCacheServiceMock } from '@ghostfolio/api/app/redis-cache/redis-cache.service.mock';
import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';
import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.service';
import { PortfolioSnapshotService } from '@ghostfolio/api/services/queues/portfolio-snapshot/portfolio-snapshot.service';
import { PortfolioSnapshotServiceMock } from '@ghostfolio/api/services/queues/portfolio-snapshot/portfolio-snapshot.service.mock';
import { Activity } from '@ghostfolio/common/interfaces';
import { PerformanceCalculationType } from '@ghostfolio/common/types/performance-calculation-type.type';

import { Big } from 'big.js';

import { PortfolioCalculatorFactory } from './portfolio-calculator.factory';

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

describe('PortfolioCalculatorFactory', () => {
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

  it.each([
    PerformanceCalculationType.ROAI,
    PerformanceCalculationType.MWR,
    PerformanceCalculationType.TWR,
    PerformanceCalculationType.ROI
  ])(
    'passes adjusted activities to the shared calculator base for %s',
    (calculationType) => {
      const activities: Activity[] = [
        {
          ...activityDummyData,
          assetProfile: {
            ...assetProfileDummyData,
            currency: 'USD',
            dataSource: 'YAHOO',
            name: 'Apple Inc.',
            symbol: 'AAPL'
          },
          date: new Date('2020-01-01'),
          feeInAssetProfileCurrency: 0,
          feeInBaseCurrency: 0,
          quantity: 20,
          type: 'BUY',
          unitPriceInAssetProfileCurrency: 50
        }
      ];

      const calculator = portfolioCalculatorFactory.createCalculator({
        activities,
        calculationType,
        currency: 'USD',
        userId: userDummyData.id
      });
      const position = calculator.getTransactionPoints()[0].items[0];

      expect(position.quantity).toEqual(new Big(20));
      expect(position.averagePrice).toEqual(new Big(50));
    }
  );
});
