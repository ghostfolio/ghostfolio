import {
  activityDummyData,
  assetProfileDummyData,
  getPerformanceByDateRange,
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

describe('PortfolioCalculator (ROI)', () => {
  let configurationService: ConfigurationService;
  let currentRateService: CurrentRateService;
  let exchangeRateDataService: ExchangeRateDataService;
  let portfolioCalculatorFactory: PortfolioCalculatorFactory;
  let portfolioSnapshotService: PortfolioSnapshotService;
  let redisCacheService: RedisCacheService;

  beforeEach(() => {
    PortfolioSnapshotServiceMock.reset();
    RedisCacheServiceMock.reset();

    configurationService = new ConfigurationService();

    currentRateService = new CurrentRateService(null, null, null);

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

  it('counts invested capital for a buy and full sell on the same day', async () => {
    jest.useFakeTimers().setSystemTime(parseDate('2021-12-18').getTime());

    const assetProfile = {
      ...assetProfileDummyData,
      currency: 'CHF',
      dataSource: 'YAHOO' as const,
      name: 'Bâloise Holding AG',
      symbol: 'BALN.SW'
    };

    const activities: Activity[] = [
      {
        ...activityDummyData,
        assetProfile,
        date: new Date('2021-11-30'),
        feeInAssetProfileCurrency: 0,
        feeInBaseCurrency: 0,
        quantity: 10,
        type: 'BUY',
        unitPriceInAssetProfileCurrency: 100
      },
      {
        ...activityDummyData,
        assetProfile,
        date: new Date('2021-11-30'),
        feeInAssetProfileCurrency: 0,
        feeInBaseCurrency: 0,
        quantity: 10,
        type: 'SELL',
        unitPriceInAssetProfileCurrency: 110
      }
    ];

    const portfolioCalculator = portfolioCalculatorFactory.createCalculator({
      activities,
      calculationType: PerformanceCalculationType.ROI,
      currency: 'CHF',
      usePortfolioSnapshotCache: false,
      userId: userDummyData.id
    });

    const portfolioSnapshot = await portfolioCalculator.computeSnapshot();

    const performanceByDateRange = await getPerformanceByDateRange({
      portfolioCalculator,
      dateRanges: ['max']
    });

    expect(portfolioSnapshot.positions[0]).toMatchObject({
      averageInvestment: new Big('1000'),
      grossPerformance: new Big('100'),
      investment: new Big('0'),
      quantity: new Big('0')
    });

    expect(performanceByDateRange.max).toMatchObject({
      netPerformance: 100,
      netPerformanceInPercentage: 0.1,
      netPerformanceInPercentageWithCurrencyEffect: 0.1,
      netPerformanceWithCurrencyEffect: 100
    });

    expect(portfolioSnapshot.historicalData.at(-1)).toMatchObject(
      expect.objectContaining({
        netPerformance: 100,
        netPerformanceInPercentage: 0.1,
        netPerformanceInPercentageWithCurrencyEffect: 0.1,
        netPerformanceWithCurrencyEffect: 100,
        totalInvestment: 0,
        totalInvestmentValueWithCurrencyEffect: 0
      })
    );
  });

  it('counts same-day round-trip capital in addition to existing invested capital', async () => {
    jest.useFakeTimers().setSystemTime(parseDate('2021-12-18').getTime());

    const existingAssetProfile = {
      ...assetProfileDummyData,
      currency: 'CHF',
      dataSource: 'YAHOO' as const,
      name: 'Bâloise Holding AG',
      symbol: 'BALN.SW'
    };

    const roundTripAssetProfile = {
      ...assetProfileDummyData,
      currency: 'CHF',
      dataSource: 'EOD_HISTORICAL_DATA' as const,
      name: 'Bâloise Holding AG',
      symbol: 'BALN.SW'
    };

    const activities: Activity[] = [
      {
        ...activityDummyData,
        assetProfile: existingAssetProfile,
        date: new Date('2021-11-22'),
        feeInAssetProfileCurrency: 0,
        feeInBaseCurrency: 0,
        quantity: 2,
        type: 'BUY',
        unitPriceInAssetProfileCurrency: 142.9
      },
      {
        ...activityDummyData,
        assetProfile: roundTripAssetProfile,
        date: new Date('2021-11-30'),
        feeInAssetProfileCurrency: 0,
        feeInBaseCurrency: 0,
        quantity: 2,
        type: 'BUY',
        unitPriceInAssetProfileCurrency: 100
      },
      {
        ...activityDummyData,
        assetProfile: roundTripAssetProfile,
        date: new Date('2021-11-30'),
        feeInAssetProfileCurrency: 0,
        feeInBaseCurrency: 0,
        quantity: 2,
        type: 'SELL',
        unitPriceInAssetProfileCurrency: 110
      }
    ];

    const portfolioCalculator = portfolioCalculatorFactory.createCalculator({
      activities,
      calculationType: PerformanceCalculationType.ROI,
      currency: 'CHF',
      usePortfolioSnapshotCache: false,
      userId: userDummyData.id
    });

    const portfolioSnapshot = await portfolioCalculator.computeSnapshot();

    expect(portfolioSnapshot.historicalData.at(-1)).toMatchObject(
      expect.objectContaining({
        netPerformance: 32,
        netPerformanceWithCurrencyEffect: 32,
        totalInvestment: 285.8,
        totalInvestmentValueWithCurrencyEffect: 285.8
      })
    );

    expect(
      portfolioSnapshot.historicalData.at(-1).netPerformanceInPercentage
    ).toBeCloseTo(32 / 485.8, 14);

    expect(
      portfolioSnapshot.historicalData.at(-1)
        .netPerformanceInPercentageWithCurrencyEffect
    ).toBeCloseTo(32 / 485.8, 14);
  });

  it('reuses capital released by a sell for another buy on the same day', async () => {
    jest.useFakeTimers().setSystemTime(parseDate('2021-12-18').getTime());

    const firstAssetProfile = {
      ...assetProfileDummyData,
      currency: 'CHF',
      dataSource: 'YAHOO' as const,
      name: 'Bâloise Holding AG',
      symbol: 'BALN.SW'
    };

    const secondAssetProfile = {
      ...assetProfileDummyData,
      currency: 'CHF',
      dataSource: 'EOD_HISTORICAL_DATA' as const,
      name: 'Bâloise Holding AG',
      symbol: 'BALN.SW'
    };

    const activities: Activity[] = [
      {
        ...activityDummyData,
        assetProfile: firstAssetProfile,
        date: new Date('2021-11-30'),
        feeInAssetProfileCurrency: 0,
        feeInBaseCurrency: 0,
        quantity: 10,
        type: 'BUY',
        unitPriceInAssetProfileCurrency: 100
      },
      {
        ...activityDummyData,
        assetProfile: firstAssetProfile,
        date: new Date('2021-11-30'),
        feeInAssetProfileCurrency: 0,
        feeInBaseCurrency: 0,
        quantity: 10,
        type: 'SELL',
        unitPriceInAssetProfileCurrency: 110
      },
      {
        ...activityDummyData,
        assetProfile: secondAssetProfile,
        date: new Date('2021-11-30'),
        feeInAssetProfileCurrency: 0,
        feeInBaseCurrency: 0,
        quantity: 10,
        type: 'BUY',
        unitPriceInAssetProfileCurrency: 110
      },
      {
        ...activityDummyData,
        assetProfile: secondAssetProfile,
        date: new Date('2021-11-30'),
        feeInAssetProfileCurrency: 0,
        feeInBaseCurrency: 0,
        quantity: 10,
        type: 'SELL',
        unitPriceInAssetProfileCurrency: 110
      }
    ];

    const portfolioCalculator = portfolioCalculatorFactory.createCalculator({
      activities,
      calculationType: PerformanceCalculationType.ROI,
      currency: 'CHF',
      usePortfolioSnapshotCache: false,
      userId: userDummyData.id
    });

    const portfolioSnapshot = await portfolioCalculator.computeSnapshot();

    const performanceByDateRange = await getPerformanceByDateRange({
      portfolioCalculator,
      dateRanges: ['max']
    });

    expect(portfolioSnapshot.historicalData.at(-1)).toMatchObject(
      expect.objectContaining({
        netPerformance: 100,
        netPerformanceWithCurrencyEffect: 100,
        totalInvestment: 0,
        totalInvestmentValueWithCurrencyEffect: 0
      })
    );

    expect(
      portfolioSnapshot.historicalData.at(-1).netPerformanceInPercentage
    ).toBeCloseTo(100 / 1100, 14);

    expect(
      portfolioSnapshot.historicalData.at(-1)
        .netPerformanceInPercentageWithCurrencyEffect
    ).toBeCloseTo(100 / 1100, 14);

    expect(performanceByDateRange.max.netPerformance).toBe(100);
    expect(performanceByDateRange.max.netPerformanceWithCurrencyEffect).toBe(
      100
    );
    expect(performanceByDateRange.max.netPerformanceInPercentage).toBeCloseTo(
      100 / 1100,
      14
    );
    expect(
      performanceByDateRange.max.netPerformanceInPercentageWithCurrencyEffect
    ).toBeCloseTo(100 / 1100, 14);
  });

  it('combines the end-of-day investment increase with hidden same-day capital', async () => {
    jest.useFakeTimers().setSystemTime(parseDate('2021-12-18').getTime());

    const roundTripAssetProfile = {
      ...assetProfileDummyData,
      currency: 'CHF',
      dataSource: 'YAHOO' as const,
      name: 'Bâloise Holding AG',
      symbol: 'BALN.SW'
    };

    const remainingAssetProfile = {
      ...assetProfileDummyData,
      currency: 'CHF',
      dataSource: 'EOD_HISTORICAL_DATA' as const,
      name: 'Bâloise Holding AG',
      symbol: 'BALN.SW'
    };

    const activities: Activity[] = [
      {
        ...activityDummyData,
        assetProfile: roundTripAssetProfile,
        date: new Date('2021-11-30'),
        feeInAssetProfileCurrency: 0,
        feeInBaseCurrency: 0,
        quantity: 10,
        type: 'BUY',
        unitPriceInAssetProfileCurrency: 100
      },
      {
        ...activityDummyData,
        assetProfile: roundTripAssetProfile,
        date: new Date('2021-11-30'),
        feeInAssetProfileCurrency: 0,
        feeInBaseCurrency: 0,
        quantity: 10,
        type: 'SELL',
        unitPriceInAssetProfileCurrency: 110
      },
      {
        ...activityDummyData,
        assetProfile: remainingAssetProfile,
        date: new Date('2021-11-30'),
        feeInAssetProfileCurrency: 0,
        feeInBaseCurrency: 0,
        quantity: 9,
        type: 'BUY',
        unitPriceInAssetProfileCurrency: 100
      }
    ];

    const portfolioCalculator = portfolioCalculatorFactory.createCalculator({
      activities,
      calculationType: PerformanceCalculationType.ROI,
      currency: 'CHF',
      usePortfolioSnapshotCache: false,
      userId: userDummyData.id
    });

    const portfolioSnapshot = await portfolioCalculator.computeSnapshot();

    const performanceByDateRange = await getPerformanceByDateRange({
      portfolioCalculator,
      dateRanges: ['max']
    });

    expect(
      portfolioSnapshot.calculationMetadata?.roi
        ?.investedCapitalAdjustmentsByDate['2021-11-30']
    ).toEqual({
      investedCapital: 100,
      investedCapitalWithCurrencyEffect: 100
    });

    const lastHistoricalDataItem = portfolioSnapshot.historicalData.at(-1);

    expect(lastHistoricalDataItem).toMatchObject(
      expect.objectContaining({
        totalInvestment: 900,
        totalInvestmentValueWithCurrencyEffect: 900
      })
    );

    expect(lastHistoricalDataItem.netPerformanceInPercentage).toBeCloseTo(
      lastHistoricalDataItem.netPerformance / 1000,
      14
    );

    expect(
      lastHistoricalDataItem.netPerformanceInPercentageWithCurrencyEffect
    ).toBeCloseTo(
      lastHistoricalDataItem.netPerformanceWithCurrencyEffect / 1000,
      14
    );

    expect(performanceByDateRange.max.netPerformance).toBe(
      lastHistoricalDataItem.netPerformance
    );
    expect(performanceByDateRange.max.netPerformanceWithCurrencyEffect).toBe(
      lastHistoricalDataItem.netPerformanceWithCurrencyEffect
    );
    expect(performanceByDateRange.max.netPerformanceInPercentage).toBeCloseTo(
      lastHistoricalDataItem.netPerformance / 1000,
      14
    );
    expect(
      performanceByDateRange.max.netPerformanceInPercentageWithCurrencyEffect
    ).toBeCloseTo(
      lastHistoricalDataItem.netPerformanceWithCurrencyEffect / 1000,
      14
    );
  });

  it('preserves same-day invested capital after a snapshot cache round-trip', async () => {
    jest.useFakeTimers().setSystemTime(parseDate('2021-12-18').getTime());

    const assetProfile = {
      ...assetProfileDummyData,
      currency: 'CHF',
      dataSource: 'YAHOO' as const,
      name: 'Bâloise Holding AG',
      symbol: 'BALN.SW'
    };

    const activities: Activity[] = [
      {
        ...activityDummyData,
        assetProfile,
        date: new Date('2021-11-30'),
        feeInAssetProfileCurrency: 0,
        feeInBaseCurrency: 0,
        quantity: 10,
        type: 'BUY',
        unitPriceInAssetProfileCurrency: 100
      },
      {
        ...activityDummyData,
        assetProfile,
        date: new Date('2021-11-30'),
        feeInAssetProfileCurrency: 0,
        feeInBaseCurrency: 0,
        quantity: 10,
        type: 'SELL',
        unitPriceInAssetProfileCurrency: 110
      }
    ];

    const sourcePortfolioCalculator =
      portfolioCalculatorFactory.createCalculator({
        activities,
        calculationType: PerformanceCalculationType.ROI,
        currency: 'CHF',
        usePortfolioSnapshotCache: false,
        userId: userDummyData.id
      });

    const portfolioSnapshot = await sourcePortfolioCalculator.computeSnapshot();

    expect(
      portfolioSnapshot.calculationMetadata?.roi
        ?.investedCapitalAdjustmentsByDate['2021-11-30']
    ).toEqual({
      investedCapital: 1000,
      investedCapitalWithCurrencyEffect: 1000
    });

    expect(portfolioSnapshot.historicalData.at(-1)).not.toHaveProperty(
      'investedCapitalAdjustment'
    );
    expect(portfolioSnapshot.historicalData.at(-1)).not.toHaveProperty(
      'investedCapitalWithCurrencyEffectAdjustment'
    );
    expect(portfolioSnapshot.historicalData.at(-1)).not.toHaveProperty(
      'calculationMetadata'
    );

    const portfolioSnapshotKey = RedisCacheServiceMock.getPortfolioSnapshotKey({
      calculationType: PerformanceCalculationType.ROI,
      userId: userDummyData.id
    });

    await RedisCacheServiceMock.set(
      portfolioSnapshotKey,
      JSON.stringify({
        expiration: Date.now() + 60_000,
        portfolioSnapshot
      })
    );

    const cachedPortfolioCalculator =
      portfolioCalculatorFactory.createCalculator({
        activities,
        calculationType: PerformanceCalculationType.ROI,
        currency: 'CHF',
        userId: userDummyData.id
      });

    const cachedSnapshot = await cachedPortfolioCalculator.getSnapshot();

    expect(
      cachedSnapshot.calculationMetadata?.roi?.investedCapitalAdjustmentsByDate[
        '2021-11-30'
      ]
    ).toEqual({
      investedCapital: 1000,
      investedCapitalWithCurrencyEffect: 1000
    });

    const performanceByDateRange = await getPerformanceByDateRange({
      portfolioCalculator: cachedPortfolioCalculator,
      dateRanges: ['max']
    });

    expect(performanceByDateRange.max).toMatchObject({
      netPerformance: 100,
      netPerformanceInPercentage: 0.1,
      netPerformanceInPercentageWithCurrencyEffect: 0.1,
      netPerformanceWithCurrencyEffect: 100
    });

    expect(cachedSnapshot.historicalData.at(-1)).not.toHaveProperty(
      'investedCapitalAdjustment'
    );
    expect(cachedSnapshot.historicalData.at(-1)).not.toHaveProperty(
      'investedCapitalWithCurrencyEffectAdjustment'
    );
    expect(cachedSnapshot.historicalData.at(-1)).not.toHaveProperty(
      'calculationMetadata'
    );
  });
});
