import { Activity } from '@ghostfolio/api/app/order/interfaces/activities.interface';
import {
  activityDummyData,
  loadExportFile,
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
import { ExchangeRateDataServiceMock } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.service.mock';
import { PortfolioSnapshotService } from '@ghostfolio/api/services/queues/portfolio-snapshot/portfolio-snapshot.service';
import { PortfolioSnapshotServiceMock } from '@ghostfolio/api/services/queues/portfolio-snapshot/portfolio-snapshot.service.mock';
import { parseDate } from '@ghostfolio/common/helper';
import { ExportResponse } from '@ghostfolio/common/interfaces';
import { PerformanceCalculationType } from '@ghostfolio/common/types/performance-calculation-type.type';

import { Big } from 'big.js';
import { join } from 'node:path';

jest.mock('@ghostfolio/api/app/portfolio/current-rate.service', () => {
  return {
    CurrentRateService: jest.fn().mockImplementation(() => {
      return CurrentRateServiceMock;
    })
  };
});

jest.mock(
  '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.service',
  () => {
    return {
      ExchangeRateDataService: jest.fn().mockImplementation(() => {
        return ExchangeRateDataServiceMock;
      })
    };
  }
);

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
  let exportResponse: ExportResponse;

  let configurationService: ConfigurationService;
  let currentRateService: CurrentRateService;
  let exchangeRateDataService: ExchangeRateDataService;
  let portfolioCalculatorFactory: PortfolioCalculatorFactory;
  let portfolioSnapshotService: PortfolioSnapshotService;
  let redisCacheService: RedisCacheService;

  beforeAll(() => {
    exportResponse = loadExportFile(
      join(__dirname, '../../../../../../../test/import/ok/btceur.json')
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
    it.only('with BTCUSD buy (in EUR)', async () => {
      jest.useFakeTimers().setSystemTime(parseDate('2022-01-14').getTime());

      const activities: Activity[] = exportResponse.activities.map(
        (activity) => ({
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
        })
      );

      const portfolioCalculator = portfolioCalculatorFactory.createCalculator({
        activities,
        calculationType: PerformanceCalculationType.ROAI,
        currency: 'CHF',
        userId: userDummyData.id
      });

      const portfolioSnapshot = await portfolioCalculator.computeSnapshot();

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
            feeInBaseCurrency: new Big('3.94'),
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
        totalLiabilitiesWithCurrencyEffect: new Big('0')
      });
    });
  });
});
