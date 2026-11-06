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

  it('uses the remaining cost basis after a partial sell and another buy', async () => {
    jest.useFakeTimers().setSystemTime(parseDate('2021-12-18').getTime());

    const assetProfile = {
      ...assetProfileDummyData,
      currency: 'CHF',
      dataSource: 'YAHOO' as const,
      name: 'Bâloise Holding AG',
      symbol: 'BALN.SW'
    };

    const activities: Activity[] = [
      {
        ...activityDummyData,
        assetProfile,
        date: new Date('2021-11-22'),
        feeInAssetProfileCurrency: 0,
        feeInBaseCurrency: 0,
        quantity: 10,
        type: 'BUY',
        unitPriceInAssetProfileCurrency: 100
      },
      {
        ...activityDummyData,
        assetProfile,
        date: new Date('2021-11-24'),
        feeInAssetProfileCurrency: 0,
        feeInBaseCurrency: 0,
        quantity: 5,
        type: 'SELL',
        unitPriceInAssetProfileCurrency: 110
      },
      {
        ...activityDummyData,
        assetProfile,
        date: new Date('2021-11-26'),
        feeInAssetProfileCurrency: 0,
        feeInBaseCurrency: 0,
        quantity: 5,
        type: 'BUY',
        unitPriceInAssetProfileCurrency: 200
      },
      {
        ...activityDummyData,
        assetProfile,
        date: new Date('2021-11-30'),
        feeInAssetProfileCurrency: 0,
        feeInBaseCurrency: 0,
        quantity: 10,
        type: 'SELL',
        unitPriceInAssetProfileCurrency: 210
      }
    ];

    const portfolioCalculator = portfolioCalculatorFactory.createCalculator({
      activities,
      calculationType: PerformanceCalculationType.ROAI,
      currency: 'CHF',
      usePortfolioSnapshotCache: false,
      userId: userDummyData.id
    });

    const portfolioSnapshot = await portfolioCalculator.computeSnapshot();

    /**
     * BUY 10 x 100 = 1000
     * SELL 5 x 110 => realized gain 50, remaining cost basis 500
     * BUY 5 x 200 = 1000 => remaining cost basis 1500 for 10 shares
     * SELL 10 x 210 => realized gain 600
     *
     * Total gross performance = 50 + 600 = 650
     */
    expect(portfolioSnapshot.positions[0]).toMatchObject({
      grossPerformance: new Big('650'),
      grossPerformanceWithCurrencyEffect: new Big('650'),
      investment: new Big('0'),
      investmentWithCurrencyEffect: new Big('0'),
      quantity: new Big('0')
    });
  });
});
