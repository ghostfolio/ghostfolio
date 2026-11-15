import {
  activityDummyData,
  assetProfileDummyData,
  userDummyData
} from '@ghostfolio/api/app/portfolio/calculator/portfolio-calculator-test-utils';
import { PortfolioCalculatorFactory } from '@ghostfolio/api/app/portfolio/calculator/portfolio-calculator.factory';
import { CurrentRateService } from '@ghostfolio/api/app/portfolio/current-rate.service';
import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';
import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.service';
import { PortfolioSnapshotService } from '@ghostfolio/api/services/queues/portfolio-snapshot/portfolio-snapshot.service';
import { PortfolioSnapshotServiceMock } from '@ghostfolio/api/services/queues/portfolio-snapshot/portfolio-snapshot.service.mock';
import { RedisCacheService } from '@ghostfolio/api/services/redis-cache/redis-cache.service';
import { RedisCacheServiceMock } from '@ghostfolio/api/services/redis-cache/redis-cache.service.mock';
import { parseDate } from '@ghostfolio/common/helper';
import { Activity } from '@ghostfolio/common/interfaces';
import { PerformanceCalculationType } from '@ghostfolio/common/types/performance-calculation-type.type';

jest.mock(
  '@ghostfolio/api/services/queues/portfolio-snapshot/portfolio-snapshot.service',
  () => ({
    PortfolioSnapshotService: jest
      .fn()
      .mockImplementation(() => PortfolioSnapshotServiceMock)
  })
);

jest.mock('@ghostfolio/api/services/redis-cache/redis-cache.service', () => ({
  RedisCacheService: jest.fn().mockImplementation(() => RedisCacheServiceMock)
}));

describe('PortfolioCalculator partial sell cost basis', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(parseDate('2025-12-15').getTime());
    PortfolioSnapshotServiceMock.reset();
    RedisCacheServiceMock.reset();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it.each([PerformanceCalculationType.ROI, PerformanceCalculationType.ROAI])(
    'preserves the remaining cost basis after partial sells (%s)',
    async (calculationType) => {
      const dates = ['2025-12-11', '2025-12-12', '2025-12-13', '2025-12-14'];

      const operations = [
        { type: 'BUY', quantity: 10, unitPrice: 10 },
        { type: 'SELL', quantity: 5, unitPrice: 12 },
        { type: 'BUY', quantity: 5, unitPrice: 20 },
        { type: 'SELL', quantity: 5, unitPrice: 20 }
      ] as const;

      const activities = operations.map((operation, index) => ({
        ...activityDummyData,
        id: `partial-sell-cost-basis-${index}`,
        userId: userDummyData.id,
        date: parseDate(dates[index]),
        type: operation.type,
        quantity: operation.quantity,
        unitPrice: operation.unitPrice,
        unitPriceInAssetProfileCurrency: operation.unitPrice,
        fee: 0,
        feeInAssetProfileCurrency: 0,
        feeInBaseCurrency: 0,
        currency: 'USD',
        value: operation.quantity * operation.unitPrice,
        valueInBaseCurrency: operation.quantity * operation.unitPrice,
        assetProfile: {
          ...assetProfileDummyData,
          currency: 'USD',
          dataSource: 'YAHOO',
          name: 'PARTIAL-SELL-TEST',
          symbol: 'PARTIAL-SELL-TEST'
        }
      })) as Activity[];

      const currentRateService = {
        getValues: jest.fn().mockResolvedValue({
          dataProviderInfos: [],
          errors: [],
          values: [...dates, '2025-12-15'].map((date, index) => ({
            date: parseDate(date),
            dataSource: 'YAHOO',
            symbol: 'PARTIAL-SELL-TEST',
            marketPrice: [10, 12, 20, 20, 20][index]
          }))
        })
      } as unknown as CurrentRateService;

      const exchangeRateDataService = {
        getExchangeRatesByCurrency: jest.fn().mockResolvedValue({
          USDUSD: Object.fromEntries(dates.map((date) => [date, 1]))
        })
      } as unknown as ExchangeRateDataService;

      const factory = new PortfolioCalculatorFactory(
        new ConfigurationService(),
        currentRateService,
        exchangeRateDataService,
        new PortfolioSnapshotService(null, null),
        new RedisCacheService(null, null)
      );

      const calculator = factory.createCalculator({
        activities,
        calculationType,
        currency: 'USD',
        usePortfolioSnapshotCache: false,
        userId: userDummyData.id
      });

      const snapshot = await calculator.computeSnapshot();

      expect(snapshot.hasErrors).toBe(false);
      expect(snapshot.errors).toHaveLength(0);
      expect(snapshot.positions).toHaveLength(1);

      const position = snapshot.positions[0];

      // Five shares remain after the four transactions.
      expect(position.quantity.toNumber()).toBeCloseTo(5, 10);

      // Remaining cost basis: 5 shares from the original 10 USD average-cost
      // position, followed by 5 shares purchased at 20 USD.
      expect(position.investment.toNumber()).toBeCloseTo(75, 10);
      expect(snapshot.totalInvestment.toNumber()).toBeCloseTo(75, 10);

      // Final market value: 5 shares at 20 USD.
      expect(position.valueInBaseCurrency.toNumber()).toBeCloseTo(100, 10);
      expect(snapshot.currentValueInBaseCurrency.toNumber()).toBeCloseTo(
        100,
        10
      );

      // Realized gain (35) plus unrealized gain (25) equals 60 USD.
      expect(position.grossPerformance.toNumber()).toBeCloseTo(60, 10);
      expect(position.netPerformance.toNumber()).toBeCloseTo(60, 10);
    }
  );

  it.each([
    {
      name: 'fully closes and reopens a position',
      operations: [
        { type: 'BUY', quantity: 10, unitPrice: 10 },
        { type: 'SELL', quantity: 10, unitPrice: 12 },
        { type: 'BUY', quantity: 5, unitPrice: 20 }
      ],
      marketPrices: [10, 12, 20, 20],
      expectedInvestment: 100,
      expectedValue: 100,
      expectedPerformance: 20
    },
    {
      name: 'handles consecutive partial sells',
      operations: [
        { type: 'BUY', quantity: 10, unitPrice: 10 },
        { type: 'SELL', quantity: 3, unitPrice: 12 },
        { type: 'SELL', quantity: 2, unitPrice: 12 }
      ],
      marketPrices: [10, 12, 12, 12],
      expectedInvestment: 50,
      expectedValue: 60,
      expectedPerformance: 20
    }
  ])('correctly $name in ROI and ROAI', async (scenario) => {
    const dates = scenario.operations.map(
      (_, index) => `2025-12-${String(11 + index).padStart(2, '0')}`
    );

    const activities = scenario.operations.map((operation, index) => ({
      ...activityDummyData,
      id: `partial-sell-scenario-${index}`,
      userId: userDummyData.id,
      date: parseDate(dates[index]),
      type: operation.type,
      quantity: operation.quantity,
      unitPrice: operation.unitPrice,
      unitPriceInAssetProfileCurrency: operation.unitPrice,
      fee: 0,
      feeInAssetProfileCurrency: 0,
      feeInBaseCurrency: 0,
      currency: 'USD',
      value: operation.quantity * operation.unitPrice,
      valueInBaseCurrency: operation.quantity * operation.unitPrice,
      assetProfile: {
        ...assetProfileDummyData,
        currency: 'USD',
        dataSource: 'YAHOO',
        name: 'PARTIAL-SELL-TEST',
        symbol: 'PARTIAL-SELL-TEST'
      }
    })) as Activity[];

    for (const calculationType of [
      PerformanceCalculationType.ROI,
      PerformanceCalculationType.ROAI
    ]) {
      PortfolioSnapshotServiceMock.reset();
      RedisCacheServiceMock.reset();

      const currentRateService = {
        getValues: jest.fn().mockResolvedValue({
          dataProviderInfos: [],
          errors: [],
          values: [...dates, '2025-12-15'].map((date, index) => ({
            date: parseDate(date),
            dataSource: 'YAHOO',
            symbol: 'PARTIAL-SELL-TEST',
            marketPrice: scenario.marketPrices[index]
          }))
        })
      } as unknown as CurrentRateService;

      const exchangeRateDataService = {
        getExchangeRatesByCurrency: jest.fn().mockResolvedValue({
          USDUSD: Object.fromEntries(dates.map((date) => [date, 1]))
        })
      } as unknown as ExchangeRateDataService;

      const factory = new PortfolioCalculatorFactory(
        new ConfigurationService(),
        currentRateService,
        exchangeRateDataService,
        new PortfolioSnapshotService(null, null),
        new RedisCacheService(null, null)
      );

      const calculator = factory.createCalculator({
        activities,
        calculationType,
        currency: 'USD',
        usePortfolioSnapshotCache: false,
        userId: userDummyData.id
      });

      const snapshot = await calculator.computeSnapshot();

      expect(snapshot.hasErrors).toBe(false);
      expect(snapshot.errors).toHaveLength(0);
      expect(snapshot.positions).toHaveLength(1);

      const position = snapshot.positions[0];

      expect(position.quantity.toNumber()).toBeCloseTo(5, 10);
      expect(position.investment.toNumber()).toBeCloseTo(
        scenario.expectedInvestment,
        10
      );
      expect(position.valueInBaseCurrency.toNumber()).toBeCloseTo(
        scenario.expectedValue,
        10
      );
      expect(position.grossPerformance.toNumber()).toBeCloseTo(
        scenario.expectedPerformance,
        10
      );
      expect(position.netPerformance.toNumber()).toBeCloseTo(
        scenario.expectedPerformance,
        10
      );
    }
  });

  it.each([PerformanceCalculationType.ROI, PerformanceCalculationType.ROAI])(
    'preserves historical FX cost basis after partial sells (%s)',
    async (calculationType) => {
      const dates = ['2025-12-11', '2025-12-12', '2025-12-13', '2025-12-14'];

      const operations = [
        { type: 'BUY', quantity: 10, unitPrice: 10 },
        { type: 'SELL', quantity: 5, unitPrice: 12 },
        { type: 'BUY', quantity: 5, unitPrice: 20 },
        { type: 'SELL', quantity: 5, unitPrice: 20 }
      ] as const;

      const activities = operations.map((operation, index) => ({
        ...activityDummyData,
        id: `partial-sell-fx-${index}`,
        userId: userDummyData.id,
        date: parseDate(dates[index]),
        type: operation.type,
        quantity: operation.quantity,
        unitPrice: operation.unitPrice,
        unitPriceInAssetProfileCurrency: operation.unitPrice,
        fee: 0,
        feeInAssetProfileCurrency: 0,
        feeInBaseCurrency: 0,
        currency: 'USD',
        value: operation.quantity * operation.unitPrice,
        valueInBaseCurrency: operation.quantity * operation.unitPrice,
        assetProfile: {
          ...assetProfileDummyData,
          currency: 'USD',
          dataSource: 'YAHOO',
          name: 'PARTIAL-SELL-FX-TEST',
          symbol: 'PARTIAL-SELL-FX-TEST'
        }
      })) as Activity[];

      const fxRates = {
        '2025-12-11': 0.9,
        '2025-12-12': 0.85,
        '2025-12-13': 0.8,
        '2025-12-14': 0.85,
        '2025-12-15': 0.9
      };

      const currentRateService = {
        getValues: jest.fn().mockResolvedValue({
          dataProviderInfos: [],
          errors: [],
          values: [...dates, '2025-12-15'].map((date, index) => ({
            date: parseDate(date),
            dataSource: 'YAHOO',
            symbol: 'PARTIAL-SELL-FX-TEST',
            marketPrice: [10, 12, 20, 20, 20][index]
          }))
        })
      } as unknown as CurrentRateService;

      const exchangeRateDataService = {
        getExchangeRatesByCurrency: jest.fn().mockResolvedValue({
          USDEUR: fxRates
        })
      } as unknown as ExchangeRateDataService;

      const factory = new PortfolioCalculatorFactory(
        new ConfigurationService(),
        currentRateService,
        exchangeRateDataService,
        new PortfolioSnapshotService(null, null),
        new RedisCacheService(null, null)
      );

      const calculator = factory.createCalculator({
        activities,
        calculationType,
        currency: 'EUR',
        usePortfolioSnapshotCache: false,
        userId: userDummyData.id
      });

      const snapshot = await calculator.computeSnapshot();

      expect(snapshot.hasErrors).toBe(false);
      expect(snapshot.errors).toHaveLength(0);
      expect(snapshot.positions).toHaveLength(1);

      const position = snapshot.positions[0];

      expect(position.quantity.toNumber()).toBeCloseTo(5, 10);

      // The remaining 75 USD cost basis is valued at the final 0.90 FX rate.
      expect(position.investment.toNumber()).toBeCloseTo(67.5, 10);

      // Historical cost basis: 5 * (10 * 0.90) + 5 * (20 * 0.80)
      // minus the first partial sale's allocated historical cost of 45 EUR,
      // then minus the second sale's allocated cost of 62.5 EUR.
      expect(position.investmentWithCurrencyEffect.toNumber()).toBeCloseTo(
        62.5,
        10
      );

      expect(position.valueInBaseCurrency.toNumber()).toBeCloseTo(90, 10);

      // Price performance translated at the final exchange rate.
      expect(position.grossPerformance.toNumber()).toBeCloseTo(54, 10);

      // Historical FX-aware realized and unrealized performance.
      expect(
        position.grossPerformanceWithCurrencyEffect.toNumber()
      ).toBeCloseTo(56, 10);
    }
  );

  it.each([PerformanceCalculationType.ROI, PerformanceCalculationType.ROAI])(
    'characterizes long-to-short transition and partial cover (%s)',
    async (calculationType) => {
      const dates = ['2025-12-11', '2025-12-12', '2025-12-13'];

      const operations = [
        { type: 'BUY', quantity: 5, unitPrice: 10 },
        { type: 'SELL', quantity: 8, unitPrice: 12 },
        { type: 'BUY', quantity: 2, unitPrice: 11 }
      ] as const;

      const activities = operations.map((operation, index) => ({
        ...activityDummyData,
        id: `long-short-characterization-${index}`,
        userId: userDummyData.id,
        date: parseDate(dates[index]),
        type: operation.type,
        quantity: operation.quantity,
        unitPrice: operation.unitPrice,
        unitPriceInAssetProfileCurrency: operation.unitPrice,
        fee: 0,
        feeInAssetProfileCurrency: 0,
        feeInBaseCurrency: 0,
        currency: 'USD',
        value: operation.quantity * operation.unitPrice,
        valueInBaseCurrency: operation.quantity * operation.unitPrice,
        assetProfile: {
          ...assetProfileDummyData,
          currency: 'USD',
          dataSource: 'YAHOO',
          name: 'LONG-SHORT-TEST',
          symbol: 'LONG-SHORT-TEST'
        }
      })) as Activity[];

      const currentRateService = {
        getValues: jest.fn().mockResolvedValue({
          dataProviderInfos: [],
          errors: [],
          values: [...dates, '2025-12-15'].map((date, index) => ({
            date: parseDate(date),
            dataSource: 'YAHOO',
            symbol: 'LONG-SHORT-TEST',
            marketPrice: [10, 12, 11, 11][index]
          }))
        })
      } as unknown as CurrentRateService;

      const exchangeRateDataService = {
        getExchangeRatesByCurrency: jest.fn().mockResolvedValue({
          USDUSD: Object.fromEntries(dates.map((date) => [date, 1]))
        })
      } as unknown as ExchangeRateDataService;

      PortfolioSnapshotServiceMock.reset();
      RedisCacheServiceMock.reset();

      const factory = new PortfolioCalculatorFactory(
        new ConfigurationService(),
        currentRateService,
        exchangeRateDataService,
        new PortfolioSnapshotService(null, null),
        new RedisCacheService(null, null)
      );

      const calculator = factory.createCalculator({
        activities,
        calculationType,
        currency: 'USD',
        usePortfolioSnapshotCache: false,
        userId: userDummyData.id
      });

      const snapshot = await calculator.computeSnapshot();

      expect(snapshot.hasErrors).toBe(false);
      expect(snapshot.errors).toHaveLength(0);
      expect(snapshot.positions).toHaveLength(1);

      const position = snapshot.positions[0];

      expect(position.quantity.toNumber()).toBe(-1);
      expect(position.averagePrice.toNumber()).toBe(10);
      expect(position.investment.toNumber()).toBe(-8);
      expect(position.valueInBaseCurrency.toNumber()).toBe(-11);
      expect(position.grossPerformance.toNumber()).toBe(13);
      expect(position.netPerformance.toNumber()).toBe(13);

      expect(snapshot.totalInvestment.toNumber()).toBe(-8);
      expect(snapshot.currentValueInBaseCurrency.toNumber()).toBe(-11);
    }
  );

  it.each([PerformanceCalculationType.ROI, PerformanceCalculationType.ROAI])(
    'characterizes partial long sell followed by long-to-short transition (%s)',
    async (calculationType) => {
      const dates = ['2025-12-11', '2025-12-12', '2025-12-13', '2025-12-14'];

      const operations = [
        { type: 'BUY', quantity: 10, unitPrice: 10 },
        { type: 'SELL', quantity: 5, unitPrice: 12 },
        { type: 'SELL', quantity: 8, unitPrice: 12 },
        { type: 'BUY', quantity: 2, unitPrice: 11 }
      ] as const;

      const activities = operations.map((operation, index) => ({
        ...activityDummyData,
        id: `partial-long-short-transition-${index}`,
        userId: userDummyData.id,
        date: parseDate(dates[index]),
        type: operation.type,
        quantity: operation.quantity,
        unitPrice: operation.unitPrice,
        unitPriceInAssetProfileCurrency: operation.unitPrice,
        fee: 0,
        feeInAssetProfileCurrency: 0,
        feeInBaseCurrency: 0,
        currency: 'USD',
        value: operation.quantity * operation.unitPrice,
        valueInBaseCurrency: operation.quantity * operation.unitPrice,
        assetProfile: {
          ...assetProfileDummyData,
          currency: 'USD',
          dataSource: 'YAHOO',
          name: 'PARTIAL-LONG-SHORT-TEST',
          symbol: 'PARTIAL-LONG-SHORT-TEST'
        }
      })) as Activity[];

      const currentRateService = {
        getValues: jest.fn().mockResolvedValue({
          dataProviderInfos: [],
          errors: [],
          values: [...dates, '2025-12-15'].map((date, index) => ({
            date: parseDate(date),
            dataSource: 'YAHOO',
            symbol: 'PARTIAL-LONG-SHORT-TEST',
            marketPrice: [10, 12, 12, 11, 11][index]
          }))
        })
      } as unknown as CurrentRateService;

      const exchangeRateDataService = {
        getExchangeRatesByCurrency: jest.fn().mockResolvedValue({
          USDUSD: Object.fromEntries(dates.map((date) => [date, 1]))
        })
      } as unknown as ExchangeRateDataService;

      const factory = new PortfolioCalculatorFactory(
        new ConfigurationService(),
        currentRateService,
        exchangeRateDataService,
        new PortfolioSnapshotService(null, null),
        new RedisCacheService(null, null)
      );

      const calculator = factory.createCalculator({
        activities,
        calculationType,
        currency: 'USD',
        usePortfolioSnapshotCache: false,
        userId: userDummyData.id
      });

      const snapshot = await calculator.computeSnapshot();

      expect(snapshot.hasErrors).toBe(false);
      expect(snapshot.errors).toHaveLength(0);
      expect(snapshot.positions).toHaveLength(1);

      const position = snapshot.positions[0];

      expect(position.quantity.toNumber()).toBe(-1);
      expect(position.averagePrice.toNumber()).toBe(10);
      expect(position.investment.toNumber()).toBe(-8);
      expect(position.valueInBaseCurrency.toNumber()).toBe(-11);
      expect(position.grossPerformance.toNumber()).toBe(23);
      expect(position.netPerformance.toNumber()).toBe(23);

      expect(snapshot.totalInvestment.toNumber()).toBe(-8);
      expect(snapshot.currentValueInBaseCurrency.toNumber()).toBe(-11);
    }
  );
});
