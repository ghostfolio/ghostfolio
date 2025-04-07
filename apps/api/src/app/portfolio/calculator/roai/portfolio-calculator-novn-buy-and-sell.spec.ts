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
      join(
        __dirname,
        '../../../../../../../test/import/ok-novn-buy-and-sell.json'
      )
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
    it.only('with NOVN.SW buy and sell', async () => {
      jest.useFakeTimers().setSystemTime(parseDate('2022-04-11').getTime());

      const activities: Activity[] = activityDtos.map((activity) => ({
        ...activityDummyData,
        ...activity,
        date: parseDate(activity.date),
        feeInSymbolCurrency: activity.fee,
        SymbolProfile: {
          ...symbolProfileDummyData,
          currency: activity.currency,
          dataSource: activity.dataSource,
          name: 'Novartis AG',
          symbol: activity.symbol
        },
        unitPriceInSymbolCurrency: activity.unitPrice
      }));

      const portfolioCalculator = portfolioCalculatorFactory.createCalculator({
        activities,
        calculationType: PerformanceCalculationType.ROAI,
        currency: 'CHF',
        userId: userDummyData.id
      });

      const portfolioSnapshot = await portfolioCalculator.computeSnapshot();

      const investments = portfolioCalculator.getInvestments();

      const investmentsByMonth = portfolioCalculator.getInvestmentsByGroup({
        data: portfolioSnapshot.historicalData,
        groupBy: 'month'
      });

      expect(portfolioSnapshot.historicalData[0]).toEqual({
        date: '2022-03-06',
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
        date: '2022-03-07',
        investmentValueWithCurrencyEffect: 151.6,
        netPerformance: 0,
        netPerformanceInPercentage: 0,
        netPerformanceInPercentageWithCurrencyEffect: 0,
        netPerformanceWithCurrencyEffect: 0,
        netWorth: 151.6,
        totalAccountBalance: 0,
        totalInvestment: 151.6,
        totalInvestmentValueWithCurrencyEffect: 151.6,
        value: 151.6,
        valueWithCurrencyEffect: 151.6
      });

      expect(
        portfolioSnapshot.historicalData[
          portfolioSnapshot.historicalData.length - 1
        ]
      ).toEqual({
        date: '2022-04-11',
        investmentValueWithCurrencyEffect: 0,
        netPerformance: 19.86,
        netPerformanceInPercentage: 0.13100263852242744,
        netPerformanceInPercentageWithCurrencyEffect: 0.13100263852242744,
        netPerformanceWithCurrencyEffect: 19.86,
        netWorth: 0,
        totalAccountBalance: 0,
        totalInvestment: 0,
        totalInvestmentValueWithCurrencyEffect: 0,
        value: 0,
        valueWithCurrencyEffect: 0
      });

      expect(portfolioSnapshot).toMatchObject({
        currentValueInBaseCurrency: new Big('0'),
        errors: [],
        hasErrors: false,
        positions: [
          {
            averagePrice: new Big('0'),
            currency: 'CHF',
            dataSource: 'YAHOO',
            dividend: new Big('0'),
            dividendInBaseCurrency: new Big('0'),
            fee: new Big('0'),
            feeInBaseCurrency: new Big('0'),
            firstBuyDate: '2022-03-07',
            grossPerformance: new Big('19.86'),
            grossPerformancePercentage: new Big('0.13100263852242744063'),
            grossPerformancePercentageWithCurrencyEffect: new Big(
              '0.13100263852242744063'
            ),
            grossPerformanceWithCurrencyEffect: new Big('19.86'),
            investment: new Big('0'),
            investmentWithCurrencyEffect: new Big('0'),
            netPerformance: new Big('19.86'),
            netPerformancePercentage: new Big('0.13100263852242744063'),
            netPerformancePercentageWithCurrencyEffectMap: {
              max: new Big('0.13100263852242744063')
            },
            netPerformanceWithCurrencyEffectMap: {
              max: new Big('19.86')
            },
            marketPrice: 87.8,
            marketPriceInBaseCurrency: 87.8,
            quantity: new Big('0'),
            symbol: 'NOVN.SW',
            tags: [],
            timeWeightedInvestment: new Big('151.6'),
            timeWeightedInvestmentWithCurrencyEffect: new Big('151.6'),
            transactionCount: 2,
            valueInBaseCurrency: new Big('0')
          }
        ],
        totalFeesWithCurrencyEffect: new Big('0'),
        totalInterestWithCurrencyEffect: new Big('0'),
        totalInvestment: new Big('0'),
        totalInvestmentWithCurrencyEffect: new Big('0'),
        totalLiabilitiesWithCurrencyEffect: new Big('0'),
        totalValuablesWithCurrencyEffect: new Big('0')
      });

      expect(portfolioSnapshot.historicalData.at(-1)).toMatchObject(
        expect.objectContaining({
          netPerformance: 19.86,
          netPerformanceInPercentage: 0.13100263852242744063,
          netPerformanceInPercentageWithCurrencyEffect: 0.13100263852242744063,
          netPerformanceWithCurrencyEffect: 19.86,
          totalInvestmentValueWithCurrencyEffect: 0
        })
      );

      expect(investments).toEqual([
        { date: '2022-03-07', investment: new Big('151.6') },
        { date: '2022-04-08', investment: new Big('0') }
      ]);

      expect(investmentsByMonth).toEqual([
        { date: '2022-03-01', investment: 151.6 },
        { date: '2022-04-01', investment: -151.6 }
      ]);
    });
  });
});
