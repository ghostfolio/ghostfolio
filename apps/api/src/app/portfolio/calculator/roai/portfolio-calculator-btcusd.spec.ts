import { CreateOrderDto } from '@ghostfolio/api/app/order/create-order.dto';
import { Activity } from '@ghostfolio/api/app/order/interfaces/activities.interface';
import {
  activityDummyData,
  loadActivityExportFile,
  symbolProfileDummyData,
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
import { join } from 'path';

jest.mock('@ghostfolio/api/app/portfolio/current-rate.service', () => {
  return {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    CurrentRateService: jest.fn().mockImplementation(() => {
      return CurrentRateServiceMock;
    })
  };
});

jest.mock(
  '@ghostfolio/api/services/queues/portfolio-snapshot/portfolio-snapshot.service',
  () => {
    return {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      PortfolioSnapshotService: jest.fn().mockImplementation(() => {
        return PortfolioSnapshotServiceMock;
      })
    };
  }
);

jest.mock('@ghostfolio/api/app/redis-cache/redis-cache.service', () => {
  return {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    RedisCacheService: jest.fn().mockImplementation(() => {
      return RedisCacheServiceMock;
    })
  };
});

describe('PortfolioCalculator', () => {
  let activityDtos: CreateOrderDto[];

  let configurationService: ConfigurationService;
  let currentRateService: CurrentRateService;
  let exchangeRateDataService: ExchangeRateDataService;
  let portfolioCalculatorFactory: PortfolioCalculatorFactory;
  let portfolioSnapshotService: PortfolioSnapshotService;
  let redisCacheService: RedisCacheService;

  beforeAll(() => {
    activityDtos = loadActivityExportFile(
      join(__dirname, '../../../../../../../test/import/ok/btcusd.json')
    );
  });

  beforeEach(() => {
    configurationService = new ConfigurationService();

    currentRateService = new CurrentRateService(null, null, null, null);

    exchangeRateDataService = new ExchangeRateDataService(
      null,
      null,
      null,
      null
    );

    portfolioSnapshotService = new PortfolioSnapshotService(null);

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
    it.only('with BTCUSD buy (in USD)', async () => {
      jest.useFakeTimers().setSystemTime(parseDate('2022-01-14').getTime());

      const activities: Activity[] = activityDtos.map((activity) => ({
        ...activityDummyData,
        ...activity,
        date: parseDate(activity.date),
        feeInAssetProfileCurrency: 4.46,
        SymbolProfile: {
          ...symbolProfileDummyData,
          currency: 'USD',
          dataSource: activity.dataSource,
          name: 'Bitcoin',
          symbol: activity.symbol
        },
        unitPriceInAssetProfileCurrency: 44558.42
      }));

      const portfolioCalculator = portfolioCalculatorFactory.createCalculator({
        activities,
        calculationType: PerformanceCalculationType.ROAI,
        currency: 'USD',
        userId: userDummyData.id
      });

      const portfolioSnapshot = await portfolioCalculator.computeSnapshot();

      const investments = portfolioCalculator.getInvestments();

      const investmentsByMonth = portfolioCalculator.getInvestmentsByGroup({
        data: portfolioSnapshot.historicalData,
        groupBy: 'month'
      });

      expect(portfolioSnapshot.historicalData[0]).toEqual({
        date: '2021-12-11',
        investmentValueWithCurrencyEffect: 0,
        netPerformance: 0,
        netPerformanceInPercentage: 0,
        netPerformanceInPercentageWithCurrencyEffect: 0,
        netPerformanceWithCurrencyEffect: 0,
        netWorth: 0,
        totalAccountBalance: 0,
        totalInvestment: 0,
        totalInvestmentValueWithCurrencyEffect: 0,
        value: 0,
        valueWithCurrencyEffect: 0
      });

      /**
       * Closing price on 2021-12-12: 50098.3
       */
      expect(portfolioSnapshot.historicalData[1]).toEqual({
        date: '2021-12-12',
        investmentValueWithCurrencyEffect: 44558.42,
        netPerformance: 5535.42, // 1 * (50098.3 - 44558.42) - 4.46 = 5535.42
        netPerformanceInPercentage: 0.12422837255001412, // 5535.42 ÷ 44558.42 = 0.12422837255001412
        netPerformanceInPercentageWithCurrencyEffect: 0.12422837255001412, // 5535.42 ÷ 44558.42 = 0.12422837255001412
        netPerformanceWithCurrencyEffect: 5535.42, // 1 * (50098.3 - 44558.42) - 4.46 = 5535.42
        netWorth: 50098.3, // 1 * 50098.3 = 50098.3
        totalAccountBalance: 0,
        totalInvestment: 44558.42,
        totalInvestmentValueWithCurrencyEffect: 44558.42,
        value: 50098.3, // 1 * 50098.3 = 50098.3
        valueWithCurrencyEffect: 50098.3
      });

      expect(
        portfolioSnapshot.historicalData[
          portfolioSnapshot.historicalData.length - 1
        ]
      ).toEqual({
        date: '2022-01-14',
        investmentValueWithCurrencyEffect: 0,
        netPerformance: -1463.18,
        netPerformanceInPercentage: -0.032837340282712,
        netPerformanceInPercentageWithCurrencyEffect: -0.032837340282712,
        netPerformanceWithCurrencyEffect: -1463.18,
        netWorth: 43099.7,
        totalAccountBalance: 0,
        totalInvestment: 44558.42,
        totalInvestmentValueWithCurrencyEffect: 44558.42,
        value: 43099.7,
        valueWithCurrencyEffect: 43099.7
      });

      expect(portfolioSnapshot).toMatchObject({
        currentValueInBaseCurrency: new Big('43099.7'),
        errors: [],
        hasErrors: false,
        positions: [
          {
            averagePrice: new Big('44558.42'),
            currency: 'USD',
            dataSource: 'YAHOO',
            dividend: new Big('0'),
            dividendInBaseCurrency: new Big('0'),
            fee: new Big('4.46'),
            feeInBaseCurrency: new Big('4.46'),
            firstBuyDate: '2021-12-12',
            grossPerformance: new Big('-1458.72'),
            grossPerformancePercentage: new Big('-0.03273724696701543726'),
            grossPerformancePercentageWithCurrencyEffect: new Big(
              '-0.03273724696701543726'
            ),
            grossPerformanceWithCurrencyEffect: new Big('-1458.72'),
            investment: new Big('44558.42'),
            investmentWithCurrencyEffect: new Big('44558.42'),
            netPerformance: new Big('-1463.18'),
            netPerformancePercentage: new Big('-0.03283734028271199921'),
            netPerformancePercentageWithCurrencyEffectMap: {
              max: new Big('-0.03283734028271199921')
            },
            netPerformanceWithCurrencyEffectMap: {
              max: new Big('-1463.18')
            },
            marketPrice: 43099.7,
            marketPriceInBaseCurrency: 43099.7,
            quantity: new Big('1'),
            symbol: 'BTCUSD',
            tags: [],
            timeWeightedInvestment: new Big('44558.42'),
            timeWeightedInvestmentWithCurrencyEffect: new Big('44558.42'),
            transactionCount: 1,
            valueInBaseCurrency: new Big('43099.7')
          }
        ],
        totalFeesWithCurrencyEffect: new Big('4.46'),
        totalInterestWithCurrencyEffect: new Big('0'),
        totalInvestment: new Big('44558.42'),
        totalInvestmentWithCurrencyEffect: new Big('44558.42'),
        totalLiabilitiesWithCurrencyEffect: new Big('0'),
        totalValuablesWithCurrencyEffect: new Big('0')
      });

      expect(investments).toEqual([
        { date: '2021-12-12', investment: new Big('44558.42') }
      ]);

      expect(investmentsByMonth).toEqual([
        { date: '2021-12-01', investment: 44558.42 },
        { date: '2022-01-01', investment: 0 }
      ]);
    });
  });
});
