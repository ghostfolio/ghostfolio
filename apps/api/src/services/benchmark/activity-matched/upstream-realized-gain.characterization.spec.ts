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

import { simulateBenchmark } from './activity-matched-benchmark';

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

describe('upstream realized-gain characterization', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(parseDate('2025-12-15').getTime());
    PortfolioSnapshotServiceMock.reset();
    RedisCacheServiceMock.reset();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it.each([PerformanceCalculationType.ROI, PerformanceCalculationType.ROAI])(
    'characterizes %s accounting',
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
        id: `characterization-${index}`,
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
          name: 'JNUG',
          symbol: 'JNUG'
        }
      })) as Activity[];

      const currentRateService = {
        getValues: jest.fn().mockImplementation(async () => ({
          dataProviderInfos: [],
          errors: [],
          values: [...dates, '2025-12-15'].map((date, index) => ({
            date: parseDate(date),
            dataSource: 'YAHOO',
            symbol: 'JNUG',
            marketPrice: [10, 12, 20, 20, 20][index]
          }))
        }))
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

      const snapshot = await calculator.getSnapshot();

      const prototype = simulateBenchmark({
        flows: [
          { date: dates[0], amount: '100' },
          { date: dates[1], amount: '-60' },
          { date: dates[2], amount: '100' },
          { date: dates[3], amount: '-100' }
        ],
        prices: dates.map((date, index) => ({
          date,
          price: String([10, 12, 20, 20][index])
        })),
        valuationDates: dates
      });

      const upstreamLast = snapshot.historicalData.at(-1);
      const prototypeLast = prototype.at(-1);

      console.log(
        JSON.stringify(
          {
            method: calculationType,
            upstream: {
              activitiesCount: snapshot.activitiesCount,
              hasErrors: snapshot.hasErrors,
              errors: snapshot.errors,
              positionsCount: snapshot.positions.length,
              positions: snapshot.positions.map((position) => ({
                symbol: position.symbol,
                quantity: position.quantity?.toString(),
                investment: position.investment?.toString(),
                grossPerformance: position.grossPerformance?.toString(),
                netPerformance: position.netPerformance?.toString()
              })),
              historicalData: snapshot.historicalData.map((point) => ({
                date: point.date,
                value: point.value,
                totalInvestment: point.totalInvestment,
                netPerformance: point.netPerformance
              })),
              totalInvestment: snapshot.totalInvestment.toString(),
              grossPerformance:
                snapshot.positions[0]?.grossPerformance?.toString(),
              netPerformance: upstreamLast?.netPerformance,
              value: upstreamLast?.value
            },
            prototype: {
              costBasis: prototypeLast.costBasis.toString(),
              realizedGain: prototypeLast.realizedGain.toString(),
              netPerformance: prototypeLast.netPerformance.toString(),
              value: prototypeLast.value.toString()
            }
          },
          null,
          2
        )
      );

      expect(snapshot.totalInvestment.toNumber()).toBeCloseTo(75, 10);
      expect(prototypeLast.netPerformance.toNumber()).toBeCloseTo(60, 10);
    }
  );
});
