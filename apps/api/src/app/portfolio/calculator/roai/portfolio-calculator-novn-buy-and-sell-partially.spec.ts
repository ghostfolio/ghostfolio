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
        '../../../../../../../test/import/ok-novn-buy-and-sell-partially.json'
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
    it.only('with NOVN.SW buy and sell partially', async () => {
      jest.useFakeTimers().setSystemTime(parseDate('2022-04-11').getTime());

      const activities: Activity[] = activityDtos.map((activity) => ({
        ...activityDummyData,
        ...activity,
        date: parseDate(activity.date),
        feeInAssetProfileCurrency: activity.fee,
        SymbolProfile: {
          ...symbolProfileDummyData,
          currency: activity.currency,
          dataSource: activity.dataSource,
          name: 'Novartis AG',
          symbol: activity.symbol
        },
        unitPriceInAssetProfileCurrency: activity.unitPrice
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

      expect(portfolioSnapshot).toMatchObject({
        currentValueInBaseCurrency: new Big('87.8'),
        errors: [],
        hasErrors: false,
        positions: [
          {
            averagePrice: new Big('75.80'),
            currency: 'CHF',
            dataSource: 'YAHOO',
            dividend: new Big('0'),
            dividendInBaseCurrency: new Big('0'),
            fee: new Big('4.25'),
            feeInBaseCurrency: new Big('4.25'),
            firstBuyDate: '2022-03-07',
            grossPerformance: new Big('21.93'),
            grossPerformancePercentage: new Big('0.15113417083448194384'),
            grossPerformancePercentageWithCurrencyEffect: new Big(
              '0.15113417083448194384'
            ),
            grossPerformanceWithCurrencyEffect: new Big('21.93'),
            investment: new Big('75.80'),
            investmentWithCurrencyEffect: new Big('75.80'),
            netPerformance: new Big('17.68'),
            netPerformancePercentage: new Big('0.12184460284330327256'),
            netPerformancePercentageWithCurrencyEffectMap: {
              max: new Big('0.12348284960422163588')
            },
            netPerformanceWithCurrencyEffectMap: {
              max: new Big('17.68')
            },
            marketPrice: 87.8,
            marketPriceInBaseCurrency: 87.8,
            quantity: new Big('1'),
            symbol: 'NOVN.SW',
            tags: [],
            timeWeightedInvestment: new Big('145.10285714285714285714'),
            timeWeightedInvestmentWithCurrencyEffect: new Big(
              '145.10285714285714285714'
            ),
            transactionCount: 2,
            valueInBaseCurrency: new Big('87.8')
          }
        ],
        totalFeesWithCurrencyEffect: new Big('4.25'),
        totalInterestWithCurrencyEffect: new Big('0'),
        totalInvestment: new Big('75.80'),
        totalInvestmentWithCurrencyEffect: new Big('75.80'),
        totalLiabilitiesWithCurrencyEffect: new Big('0'),
        totalValuablesWithCurrencyEffect: new Big('0')
      });

      expect(portfolioSnapshot.historicalData.at(-1)).toMatchObject(
        expect.objectContaining({
          netPerformance: 17.68,
          netPerformanceInPercentage: 0.12184460284330327256,
          netPerformanceInPercentageWithCurrencyEffect: 0.12184460284330327256,
          netPerformanceWithCurrencyEffect: 17.68,
          totalInvestmentValueWithCurrencyEffect: 75.8
        })
      );

      expect(investments).toEqual([
        { date: '2022-03-07', investment: new Big('151.6') },
        { date: '2022-04-08', investment: new Big('75.8') }
      ]);

      expect(investmentsByMonth).toEqual([
        { date: '2022-03-01', investment: 151.6 },
        { date: '2022-04-01', investment: -75.8 }
      ]);
    });
  });
});
