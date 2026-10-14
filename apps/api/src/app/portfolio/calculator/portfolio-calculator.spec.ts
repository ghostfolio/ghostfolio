import { userDummyData } from '@ghostfolio/api/app/portfolio/calculator/portfolio-calculator-test-utils';
import { PortfolioCalculatorFactory } from '@ghostfolio/api/app/portfolio/calculator/portfolio-calculator.factory';
import { CurrentRateService } from '@ghostfolio/api/app/portfolio/current-rate.service';
import { CurrentRateServiceMock } from '@ghostfolio/api/app/portfolio/current-rate.service.mock';
import { PortfolioCalculatorActivityItem } from '@ghostfolio/api/app/portfolio/interfaces/portfolio-calculator-activity-item.interface';
import { RedisCacheService } from '@ghostfolio/api/app/redis-cache/redis-cache.service';
import { RedisCacheServiceMock } from '@ghostfolio/api/app/redis-cache/redis-cache.service.mock';
import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';
import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.service';
import { PortfolioSnapshotService } from '@ghostfolio/api/services/queues/portfolio-snapshot/portfolio-snapshot.service';
import { PortfolioSnapshotServiceMock } from '@ghostfolio/api/services/queues/portfolio-snapshot/portfolio-snapshot.service.mock';
import { PerformanceCalculationType } from '@ghostfolio/common/types/performance-calculation-type.type';

import { Big } from 'big.js';

import { PortfolioCalculator } from './portfolio-calculator';

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

function getActivityItem({
  date,
  itemType,
  quantity,
  type,
  unitPrice
}: {
  date: string;
  itemType?: PortfolioCalculatorActivityItem['itemType'];
  quantity: number;
  type: PortfolioCalculatorActivityItem['type'];
  unitPrice: number;
}): PortfolioCalculatorActivityItem {
  return {
    date,
    itemType,
    type,
    assetProfile: {
      assetSubClass: 'ETF',
      currency: 'CHF',
      dataSource: 'YAHOO',
      name: 'Test',
      symbol: 'TEST'
    },
    fee: new Big(0),
    feeInBaseCurrency: new Big(0),
    quantity: new Big(quantity),
    unitPrice: new Big(unitPrice),
    unitPriceFromMarketData: new Big(unitPrice)
  };
}

describe('PortfolioCalculator', () => {
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
      calculationType: PerformanceCalculationType.ROAI,
      currency: 'CHF',
      userId: userDummyData.id
    });
  });

  describe('get holding valuation', () => {
    it('accumulates the buy values without deducting sells', () => {
      const { buyValuesAccumulated, buyValuesAccumulatedWithCurrencyEffect } =
        portfolioCalculator['getHoldingValuation']({
          activities: [
            getActivityItem({
              date: '2023-12-31',
              itemType: 'start',
              quantity: 0,
              type: 'BUY',
              unitPrice: 10
            }),
            getActivityItem({
              date: '2024-01-01',
              quantity: 100,
              type: 'BUY',
              unitPrice: 10
            }),
            getActivityItem({
              date: '2024-06-01',
              quantity: 100,
              type: 'SELL',
              unitPrice: 10
            }),
            getActivityItem({
              date: '2024-06-02',
              quantity: 100,
              type: 'BUY',
              unitPrice: 10
            }),
            getActivityItem({
              date: '2024-12-31',
              itemType: 'end',
              quantity: 0,
              type: 'BUY',
              unitPrice: 11
            })
          ],
          exchangeRates: {},
          unitPriceAtStartDate: undefined
        });

      expect(buyValuesAccumulated).toEqual({
        '2024-01-01': new Big(1000),
        '2024-06-01': new Big(1000),
        '2024-06-02': new Big(2000),
        '2024-12-31': new Big(2000)
      });

      expect(buyValuesAccumulatedWithCurrencyEffect).toEqual(
        buyValuesAccumulated
      );
    });
  });
});
