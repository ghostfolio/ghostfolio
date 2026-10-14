import {
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

  async function computeSnapshot({
    fileName,
    systemTime
  }: {
    fileName: string;
    systemTime: string;
  }) {
    jest.useFakeTimers().setSystemTime(parseDate(systemTime).getTime());

    const { activities, userCurrency } = loadActivitiesFromExportFile(fileName);

    return portfolioCalculatorFactory
      .createCalculator({
        activities,
        calculationType: PerformanceCalculationType.ROI,
        currency: userCurrency,
        userId: userDummyData.id
      })
      .computeSnapshot();
  }

  describe('get current positions', () => {
    it('with NOVN.SW buy and sell', async () => {
      const portfolioSnapshot = await computeSnapshot({
        fileName: 'novn-buy-and-sell.json',
        systemTime: '2022-04-11'
      });

      // Buy: 2 * 75.8 = 151.6, the money is invested for the whole period,
      // thus the ROI equals the ROAI
      expect(portfolioSnapshot.positions).toMatchObject([
        {
          netPerformance: new Big('19.86'),
          netPerformancePercentage: new Big('19.86').div('151.6'),
          netPerformancePercentageWithCurrencyEffectMap: {
            max: new Big('19.86').div('151.6')
          }
        }
      ]);

      expect(portfolioSnapshot.historicalData.at(-1)).toMatchObject({
        netPerformanceInPercentage: new Big('19.86').div('151.6').toNumber(),
        totalBuyValue: 151.6
      });
    });

    it('with NOVN.SW buy and sell partially', async () => {
      const portfolioSnapshot = await computeSnapshot({
        fileName: 'novn-buy-and-sell-partially.json',
        systemTime: '2022-04-11'
      });

      // The partial sell does not reduce the total buy value of 151.6
      expect(portfolioSnapshot.positions).toMatchObject([
        {
          netPerformance: new Big('17.68'),
          netPerformancePercentage: new Big('17.68').div('151.6'),
          netPerformancePercentageWithCurrencyEffectMap: {
            max: new Big('17.68').div('151.6')
          }
        }
      ]);

      expect(portfolioSnapshot.historicalData.at(-1)).toMatchObject({
        totalBuyValue: 151.6
      });
    });

    it('with BALN.SW buy and buy', async () => {
      const portfolioSnapshot = await computeSnapshot({
        fileName: 'baln-buy-and-buy.json',
        systemTime: '2021-12-18'
      });

      // Buys: 2 * 142.9 + 2 * 136.6 = 559
      expect(portfolioSnapshot.positions).toMatchObject([
        {
          netPerformance: new Big('33.4'),
          netPerformancePercentage: new Big('33.4').div('559'),
          netPerformancePercentageWithCurrencyEffectMap: {
            max: new Big('33.4').div('559')
          }
        }
      ]);

      expect(portfolioSnapshot.historicalData.at(-1)).toMatchObject({
        totalBuyValue: 559
      });
    });

    it('with JNUG buy and sell and buy and sell', async () => {
      const portfolioSnapshot = await computeSnapshot({
        fileName: 'jnug-buy-and-sell-and-buy-and-sell.json',
        systemTime: '2025-12-28'
      });

      // Buys: 9 * 209.45 + 10 * 204.11 = 3926.15, the money of the first
      // sell is invested again and thus counts twice
      expect(portfolioSnapshot.positions).toMatchObject([
        {
          netPerformance: new Big('39.95'),
          netPerformancePercentage: new Big('39.95').div('3926.15'),
          netPerformancePercentageWithCurrencyEffectMap: {
            max: new Big('39.95').div('3926.15')
          }
        }
      ]);

      expect(portfolioSnapshot.historicalData.at(-1)).toMatchObject({
        totalBuyValue: 3926.15
      });
    });

    it('with BTCUSD short sell', async () => {
      const portfolioSnapshot = await computeSnapshot({
        fileName: 'btcusd-short.json',
        systemTime: '2022-01-14'
      });

      // A short position has no buy, thus the ROI is 0
      expect(portfolioSnapshot.positions).toMatchObject([
        {
          netPerformancePercentage: new Big(0),
          netPerformancePercentageWithCurrencyEffectMap: { max: new Big(0) }
        }
      ]);

      expect(portfolioSnapshot.historicalData.at(-1)).toMatchObject({
        netPerformanceInPercentage: 0,
        totalBuyValue: 0
      });
    });

    it('with no activities', async () => {
      jest.useFakeTimers().setSystemTime(parseDate('2021-12-18').getTime());

      const portfolioSnapshot = await portfolioCalculatorFactory
        .createCalculator({
          activities: [],
          calculationType: PerformanceCalculationType.ROI,
          currency: 'CHF',
          userId: userDummyData.id
        })
        .computeSnapshot();

      expect(portfolioSnapshot).toMatchObject({
        currentValueInBaseCurrency: new Big(0),
        historicalData: [],
        positions: [],
        totalInvestment: new Big(0)
      });
    });
  });
});
