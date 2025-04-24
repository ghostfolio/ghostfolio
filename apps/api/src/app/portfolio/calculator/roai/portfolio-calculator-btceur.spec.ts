import { CreateOrderDto } from '@ghostfolio/api/app/order/create-order.dto';
import { Activity } from '@ghostfolio/api/app/order/interfaces/activities.interface';
import {
  activityDummyData,
  loadActivityExportFile,
  symbolProfileDummyData,
  userDummyData
} from '@ghostfolio/api/app/portfolio/calculator/portfolio-calculator-test-utils';
import {
  PerformanceCalculationType,
  PortfolioCalculatorFactory
} from '@ghostfolio/api/app/portfolio/calculator/portfolio-calculator.factory';
import { CurrentRateService } from '@ghostfolio/api/app/portfolio/current-rate.service';
import { CurrentRateServiceMock } from '@ghostfolio/api/app/portfolio/current-rate.service.mock';
import { RedisCacheService } from '@ghostfolio/api/app/redis-cache/redis-cache.service';
import { RedisCacheServiceMock } from '@ghostfolio/api/app/redis-cache/redis-cache.service.mock';
import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';
import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.service';
import { ExchangeRateDataServiceMock } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.service.mock';
import { PortfolioSnapshotService } from '@ghostfolio/api/services/queues/portfolio-snapshot/portfolio-snapshot.service';
import { PortfolioSnapshotServiceMock } from '@ghostfolio/api/services/queues/portfolio-snapshot/portfolio-snapshot.service.mock';
import { parseDate } from '@ghostfolio/common/helper';

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

jest.mock(
  '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.service',
  () => {
    return {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      ExchangeRateDataService: jest.fn().mockImplementation(() => {
        return ExchangeRateDataServiceMock;
      })
    };
  }
);

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
      join(__dirname, '../../../../../../../test/import/ok-btceur.json')
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
    it.only('with BTCUSD buy', async () => {
      jest.useFakeTimers().setSystemTime(parseDate('2022-01-14').getTime());

      const activities: Activity[] = activityDtos.map((activity) => ({
        ...activityDummyData,
        ...activity,
        date: parseDate(activity.date),
        SymbolProfile: {
          ...symbolProfileDummyData,
          currency: 'USD',
          dataSource: activity.dataSource,
          name: 'Bitcoin',
          symbol: activity.symbol
        }
      }));

      const portfolioCalculator = portfolioCalculatorFactory.createCalculator({
        activities,
        calculationType: PerformanceCalculationType.ROAI,
        currency: 'EUR',
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

      expect(portfolioSnapshot.historicalData[1]).toEqual({
        date: '2021-12-12',
        investmentValueWithCurrencyEffect: 39380.731596,
        netPerformance: -3.892688,
        netPerformanceInPercentage: 0,
        netPerformanceInPercentageWithCurrencyEffect: 0,
        netPerformanceWithCurrencyEffect: -3.941748,
        netWorth: 39380.731596,
        totalAccountBalance: 0,
        totalInvestment: 38890.588976,
        totalInvestmentValueWithCurrencyEffect: 39380.731596,
        value: 38890.588976,
        valueWithCurrencyEffect: 39380.731596
      });

      expect(
        portfolioSnapshot.historicalData[
          portfolioSnapshot.historicalData.length - 1
        ]
      ).toEqual({
        date: '2022-01-14',
        investmentValueWithCurrencyEffect: 0,
        netPerformance: -1277.063504,
        netPerformanceInPercentage: -0.032837340282712,
        netPerformanceInPercentageWithCurrencyEffect: -0.044876138974002826,
        netPerformanceWithCurrencyEffect: -1767.255184,
        netWorth: 37617.41816,
        totalAccountBalance: 0,
        totalInvestment: 38890.588976,
        totalInvestmentValueWithCurrencyEffect: 39380.731596,
        value: 37617.41816,
        valueWithCurrencyEffect: 37617.41816
      });

      expect(portfolioSnapshot).toMatchObject({
        currentValueInBaseCurrency: new Big('37617.41816'),
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
            feeInBaseCurrency: new Big('3.941748'),
            firstBuyDate: '2021-12-12',
            grossPerformance: new Big('-1273.170816'),
            grossPerformancePercentage: new Big('-0.03273724696701543726'),
            grossPerformancePercentageWithCurrencyEffect: new Big(
              '-0.04477604565830626119'
            ),
            grossPerformanceWithCurrencyEffect: new Big('-1763.313436'),
            investment: new Big('38890.588976'),
            investmentWithCurrencyEffect: new Big('39380.731596'),
            netPerformance: new Big('-1277.063504'),
            netPerformancePercentage: new Big('-0.03283734028271199921'),
            netPerformancePercentageWithCurrencyEffectMap: {
              max: new Big('-0.04487613897400282314')
            },
            netPerformanceWithCurrencyEffectMap: {
              max: new Big('-1767.255184')
            },
            marketPrice: 43099.7,
            marketPriceInBaseCurrency: 37617.41816,
            quantity: new Big('1'),
            symbol: 'BTCUSD',
            tags: [],
            timeWeightedInvestment: new Big('38890.588976'),
            timeWeightedInvestmentWithCurrencyEffect: new Big('39380.731596'),
            transactionCount: 1,
            valueInBaseCurrency: new Big('37617.41816')
          }
        ],
        totalFeesWithCurrencyEffect: new Big('3.941748'),
        totalInterestWithCurrencyEffect: new Big('0'),
        totalInvestment: new Big('38890.588976'),
        totalInvestmentWithCurrencyEffect: new Big('39380.731596'),
        totalLiabilitiesWithCurrencyEffect: new Big('0'),
        totalValuablesWithCurrencyEffect: new Big('0')
      });

      expect(investments).toEqual([
        { date: '2021-12-12', investment: new Big('44558.42') }
      ]);

      expect(investmentsByMonth).toEqual([
        { date: '2021-12-01', investment: 39380.731596 },
        { date: '2022-01-01', investment: 0 }
      ]);
    });
  });
});
