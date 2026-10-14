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

function getActivity({
  date,
  quantity,
  symbol,
  type,
  unitPrice
}: {
  date: string;
  quantity: number;
  symbol: string;
  type: Activity['type'];
  unitPrice: number;
}): Activity {
  return {
    ...activityDummyData,
    quantity,
    type,
    assetProfile: {
      ...assetProfileDummyData,
      symbol,
      currency: 'CHF',
      dataSource: 'YAHOO',
      name: symbol
    },
    date: parseDate(date),
    feeInAssetProfileCurrency: 0,
    feeInBaseCurrency: 0,
    unitPriceInAssetProfileCurrency: unitPrice
  };
}

describe('RoiPortfolioCalculator', () => {
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

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('get current positions', () => {
    it('with a small buy followed by a large buy', async () => {
      jest.useFakeTimers().setSystemTime(parseDate('2024-12-31').getTime());

      const portfolioCalculator = portfolioCalculatorFactory.createCalculator({
        activities: [
          getActivity({
            date: '2024-01-01',
            quantity: 100,
            symbol: 'ROI-DCA',
            type: 'BUY',
            unitPrice: 10
          }),
          getActivity({
            date: '2024-10-27',
            quantity: 600,
            symbol: 'ROI-DCA',
            type: 'BUY',
            unitPrice: 15
          })
        ],
        calculationType: PerformanceCalculationType.ROI,
        currency: 'CHF',
        userId: userDummyData.id
      });

      const portfolioSnapshot = await portfolioCalculator.computeSnapshot();

      // Gain: 700 * 15 - (1000 + 9000) = 500, total buy value: 10000
      expect(portfolioSnapshot.positions).toMatchObject([
        {
          netPerformance: new Big('500'),
          netPerformancePercentage: new Big('500').div('10000'),
          netPerformancePercentageWithCurrencyEffectMap: {
            max: new Big('500').div('10000')
          },
          netPerformanceWithCurrencyEffectMap: { max: new Big('500') }
        }
      ]);

      expect(portfolioSnapshot.historicalData.at(-1)).toMatchObject({
        date: '2024-12-31',
        netPerformance: 500,
        netPerformanceInPercentage: 0.05,
        netPerformanceInPercentageWithCurrencyEffect: 0.05,
        totalBuyValue: 10000,
        totalBuyValueWithCurrencyEffect: 10000,
        totalInvestment: 10000,
        value: 10500
      });
    });

    it('with a buy followed by a partial sell', async () => {
      jest.useFakeTimers().setSystemTime(parseDate('2024-12-31').getTime());

      const portfolioCalculator = portfolioCalculatorFactory.createCalculator({
        activities: [
          getActivity({
            date: '2024-01-01',
            quantity: 100,
            symbol: 'ROI-PARTIAL-SELL',
            type: 'BUY',
            unitPrice: 10
          }),
          getActivity({
            date: '2024-06-01',
            quantity: 50,
            symbol: 'ROI-PARTIAL-SELL',
            type: 'SELL',
            unitPrice: 16
          })
        ],
        calculationType: PerformanceCalculationType.ROI,
        currency: 'CHF',
        userId: userDummyData.id
      });

      const portfolioSnapshot = await portfolioCalculator.computeSnapshot();

      // Gain: 50 * (16 - 10) + 50 * (18 - 10) = 700, total buy value: 1000
      expect(portfolioSnapshot.positions).toMatchObject([
        {
          netPerformance: new Big('700'),
          netPerformancePercentage: new Big('700').div('1000'),
          netPerformancePercentageWithCurrencyEffectMap: {
            max: new Big('700').div('1000')
          }
        }
      ]);

      expect(portfolioSnapshot.historicalData.at(-1)).toMatchObject({
        netPerformanceInPercentage: 0.7,
        totalBuyValue: 1000
      });
    });

    it('with a buy, a full sell and a buy again', async () => {
      jest.useFakeTimers().setSystemTime(parseDate('2024-12-31').getTime());

      const portfolioCalculator = portfolioCalculatorFactory.createCalculator({
        activities: [
          getActivity({
            date: '2024-01-01',
            quantity: 100,
            symbol: 'ROI-REBUY',
            type: 'BUY',
            unitPrice: 10
          }),
          getActivity({
            date: '2024-06-01',
            quantity: 100,
            symbol: 'ROI-REBUY',
            type: 'SELL',
            unitPrice: 10
          }),
          getActivity({
            date: '2024-06-02',
            quantity: 100,
            symbol: 'ROI-REBUY',
            type: 'BUY',
            unitPrice: 10
          })
        ],
        calculationType: PerformanceCalculationType.ROI,
        currency: 'CHF',
        userId: userDummyData.id
      });

      const portfolioSnapshot = await portfolioCalculator.computeSnapshot();

      // Gain: 100 * (11 - 10) = 100, the money is invested twice: 2000
      expect(portfolioSnapshot.positions).toMatchObject([
        {
          netPerformance: new Big('100'),
          netPerformancePercentage: new Big('100').div('2000')
        }
      ]);

      expect(portfolioSnapshot.historicalData.at(-1)).toMatchObject({
        netPerformanceInPercentage: 0.05,
        totalBuyValue: 2000
      });
    });
  });
});
