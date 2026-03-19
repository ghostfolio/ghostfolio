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
import { PortfolioSnapshotService } from '@ghostfolio/api/services/queues/portfolio-snapshot/portfolio-snapshot.service';
import { PortfolioSnapshotServiceMock } from '@ghostfolio/api/services/queues/portfolio-snapshot/portfolio-snapshot.service.mock';
import { parseDate } from '@ghostfolio/common/helper';
import { Activity, ExportResponse } from '@ghostfolio/common/interfaces';
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
      join(
        __dirname,
        '../../../../../../../test/import/ok/jnug-buy-and-sell-and-buy-and-sell.json'
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
    it.only('with JNUG buy and sell', async () => {
      jest.useFakeTimers().setSystemTime(parseDate('2025-12-28').getTime());

      const activities: Activity[] = exportResponse.activities.map(
        (activity) => ({
          ...activityDummyData,
          ...activity,
          date: parseDate(activity.date),
          feeInAssetProfileCurrency: activity.fee,
          feeInBaseCurrency: activity.fee,
          SymbolProfile: {
            ...symbolProfileDummyData,
            currency: activity.currency,
            dataSource: activity.dataSource,
            name: 'Direxion Daily Junior Gold Miners Index Bull 2X Shares',
            symbol: activity.symbol
          },
          unitPriceInAssetProfileCurrency: activity.unitPrice
        })
      );

      const portfolioCalculator = portfolioCalculatorFactory.createCalculator({
        activities,
        calculationType: PerformanceCalculationType.ROAI,
        currency: exportResponse.user.settings.currency,
        userId: userDummyData.id
      });

      const portfolioSnapshot = await portfolioCalculator.computeSnapshot();

      const investments = portfolioCalculator.getInvestments();

      const investmentsByMonth = portfolioCalculator.getInvestmentsByGroup({
        data: portfolioSnapshot.historicalData,
        groupBy: 'month'
      });

      const investmentsByYear = portfolioCalculator.getInvestmentsByGroup({
        data: portfolioSnapshot.historicalData,
        groupBy: 'year'
      });

      expect(portfolioSnapshot).toMatchObject({
        currentValueInBaseCurrency: new Big('0'),
        errors: [],
        hasErrors: false,
        positions: [
          {
            activitiesCount: 4,
            averagePrice: new Big('0'),
            currency: 'USD',
            dataSource: 'YAHOO',
            dateOfFirstActivity: '2025-12-11',
            dividend: new Big('0'),
            dividendInBaseCurrency: new Big('0'),
            fee: new Big('4'),
            feeInBaseCurrency: new Big('4'),
            grossPerformance: new Big('43.95'), // (1890.00 - 1885.05) + (2080.10 - 2041.10)
            grossPerformanceWithCurrencyEffect: new Big('43.95'), // (1890.00 - 1885.05) + (2080.10 - 2041.10)
            investment: new Big('0'),
            investmentWithCurrencyEffect: new Big('0'),
            netPerformance: new Big('39.95'), // (1890.00 - 1885.05) + (2080.10 - 2041.10) - 4
            netPerformanceWithCurrencyEffectMap: {
              max: new Big('39.95') // (1890.00 - 1885.05) + (2080.10 - 2041.10) - 4
            },
            marketPrice: 237.8000030517578,
            marketPriceInBaseCurrency: 237.8000030517578,
            quantity: new Big('0'),
            symbol: 'JNUG',
            tags: [],
            valueInBaseCurrency: new Big('0')
          }
        ],
        totalFeesWithCurrencyEffect: new Big('4'),
        totalInterestWithCurrencyEffect: new Big('0'),
        totalInvestment: new Big('0'),
        totalInvestmentWithCurrencyEffect: new Big('0'),
        totalLiabilitiesWithCurrencyEffect: new Big('0')
      });

      expect(investments).toEqual([
        { date: '2025-12-11', investment: new Big('1885.05') },
        { date: '2025-12-18', investment: new Big('2041.1') },
        { date: '2025-12-28', investment: new Big('0') }
      ]);

      expect(investmentsByMonth).toEqual([
        { date: '2025-12-01', investment: 0 }
      ]);

      expect(investmentsByYear).toEqual([
        { date: '2025-01-01', investment: 0 }
      ]);
    });
  });
});
