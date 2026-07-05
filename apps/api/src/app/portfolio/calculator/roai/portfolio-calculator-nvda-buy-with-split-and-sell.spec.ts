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
import { applySplitAdjustments } from '@ghostfolio/api/helper/portfolio.helper';
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
        '../../../../../../../test/import/ok/nvda-buy-with-split-and-sell.json'
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

  describe('get current positions', () => {
    it.only('with NVDA buy (before a 10:1 split) and sell', async () => {
      jest.useFakeTimers().setSystemTime(parseDate('2024-06-14').getTime());

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
            name: 'NVIDIA Corporation',
            symbol: activity.symbol
          },
          unitPriceInAssetProfileCurrency: activity.unitPrice
        })
      );

      // Mirrors the production flow in
      // ActivitiesService.getActivitiesForPortfolioCalculator
      const adjustedActivities = applySplitAdjustments({
        activities,
        splits: [
          {
            dataSource: 'YAHOO',
            date: parseDate('2024-06-10'),
            factor: 10,
            symbol: 'NVDA'
          }
        ]
      });

      const portfolioCalculator = portfolioCalculatorFactory.createCalculator({
        activities: adjustedActivities,
        calculationType: PerformanceCalculationType.ROAI,
        currency: exportResponse.user.settings.currency,
        userId: userDummyData.id
      });

      const portfolioSnapshot = await portfolioCalculator.computeSnapshot();

      const investments = portfolioCalculator.getInvestments();

      expect(portfolioSnapshot).toMatchObject({
        currentValueInBaseCurrency: new Big('0'),
        errors: [],
        hasErrors: false,
        positions: [
          {
            activitiesCount: 2,
            averagePrice: new Big('0'),
            currency: 'USD',
            dataSource: 'YAHOO',
            dateOfFirstActivity: '2024-06-03',
            dividend: new Big('0'),
            dividendInBaseCurrency: new Big('0'),
            fee: new Big('0'),
            feeInBaseCurrency: new Big('0'),
            grossPerformance: new Big('50'), // 10 × (125 - 120) = 50
            grossPerformanceWithCurrencyEffect: new Big('50'),
            investment: new Big('0'),
            investmentWithCurrencyEffect: new Big('0'),
            netPerformance: new Big('50'),
            netPerformanceWithCurrencyEffectMap: {
              max: new Big('50')
            },
            marketPrice: 125,
            marketPriceInBaseCurrency: 125,
            quantity: new Big('0'),
            symbol: 'NVDA',
            tags: [],
            timeWeightedInvestment: new Big('1200'), // 10 × 120 = 1200
            timeWeightedInvestmentWithCurrencyEffect: new Big('1200'),
            valueInBaseCurrency: new Big('0')
          }
        ],
        totalFeesWithCurrencyEffect: new Big('0'),
        totalInterestWithCurrencyEffect: new Big('0'),
        totalInvestment: new Big('0'),
        totalInvestmentWithCurrencyEffect: new Big('0'),
        totalLiabilitiesWithCurrencyEffect: new Big('0')
      });

      expect(investments).toEqual([
        { date: '2024-06-03', investment: new Big('1200') },
        { date: '2024-06-14', investment: new Big('0') }
      ]);
    });
  });
});
