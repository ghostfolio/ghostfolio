import {
  activityDummyData,
  assetProfileDummyData,
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

import { eachDayOfInterval, isSameDay } from 'date-fns';

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

function createActivity({
  currency = 'USD',
  dataSource = 'YAHOO',
  date,
  fee = 0,
  name = 'TWR Test Asset',
  quantity,
  symbol = 'TWR_TEST',
  type,
  unitPrice
}: {
  currency?: string;
  dataSource?: Activity['assetProfile']['dataSource'];
  date: string;
  fee?: number;
  name?: string;
  quantity: number;
  symbol?: string;
  type: Activity['type'];
  unitPrice: number;
}): Activity {
  return {
    ...activityDummyData,
    assetProfile: {
      ...assetProfileDummyData,
      currency,
      dataSource,
      name,
      symbol
    },
    date: parseDate(date),
    feeInAssetProfileCurrency: fee,
    feeInBaseCurrency: fee,
    quantity,
    type,
    unitPriceInAssetProfileCurrency: unitPrice
  };
}

function mockMarketPrices({
  currentRateService,
  getMarketPrice
}: {
  currentRateService: CurrentRateService;
  getMarketPrice: ({
    date,
    symbol
  }: {
    date: Date;
    symbol: string;
  }) => number | undefined;
}) {
  jest
    .spyOn(currentRateService, 'getValues')
    .mockImplementation(({ dataGatheringItems, dateQuery }) => {
      const values = [];

      for (const date of eachDayOfInterval({
        end: dateQuery.lt,
        start: dateQuery.gte
      })) {
        for (const { dataSource, symbol } of dataGatheringItems) {
          const marketPrice = getMarketPrice({ date, symbol });

          if (marketPrice !== undefined) {
            values.push({
              date,
              dataSource,
              symbol,
              marketPrice
            });
          }
        }
      }

      return Promise.resolve({
        values,
        dataProviderInfos: [],
        errors: []
      });
    });
}

describe('PortfolioCalculator (TWR)', () => {
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

  it('calculates a 10 percent return without external cash flows', async () => {
    jest.useFakeTimers().setSystemTime(parseDate('2025-01-02').getTime());

    const activities: Activity[] = [
      createActivity({
        date: '2025-01-01',
        quantity: 1,
        type: 'BUY',
        unitPrice: 100
      })
    ];

    mockMarketPrices({
      currentRateService,
      getMarketPrice: ({ date, symbol }) => {
        if (symbol !== 'TWR_TEST') {
          return undefined;
        }

        return isSameDay(parseDate('2025-01-02'), date) ? 110 : 100;
      }
    });

    const portfolioCalculator = portfolioCalculatorFactory.createCalculator({
      activities,
      calculationType: PerformanceCalculationType.TWR,
      currency: 'USD',
      usePortfolioSnapshotCache: false,
      userId: userDummyData.id
    });

    const portfolioSnapshot = await portfolioCalculator.computeSnapshot();

    expect(
      portfolioSnapshot.historicalData.at(-1)
        ?.netPerformanceInPercentageWithCurrencyEffect
    ).toBeCloseTo(0.1, 12);
  });

  it('ignores an external cash inflow when there is no investment return', async () => {
    jest.useFakeTimers().setSystemTime(parseDate('2025-01-02').getTime());

    const activities: Activity[] = [
      createActivity({
        date: '2025-01-01',
        quantity: 1,
        type: 'BUY',
        unitPrice: 100
      }),
      createActivity({
        date: '2025-01-02',
        quantity: 1,
        type: 'BUY',
        unitPrice: 100
      })
    ];

    mockMarketPrices({
      currentRateService,
      getMarketPrice: ({ symbol }) => {
        return symbol === 'TWR_TEST' ? 100 : undefined;
      }
    });

    const portfolioCalculator = portfolioCalculatorFactory.createCalculator({
      activities,
      calculationType: PerformanceCalculationType.TWR,
      currency: 'USD',
      usePortfolioSnapshotCache: false,
      userId: userDummyData.id
    });

    const portfolioSnapshot = await portfolioCalculator.computeSnapshot();

    expect(
      portfolioSnapshot.historicalData.at(-1)
        ?.netPerformanceInPercentageWithCurrencyEffect
    ).toBeCloseTo(0, 12);
  });

  it('chain-links returns across an external cash inflow', async () => {
    jest.useFakeTimers().setSystemTime(parseDate('2025-01-03').getTime());

    const activities: Activity[] = [
      createActivity({
        date: '2025-01-01',
        quantity: 10,
        type: 'BUY',
        unitPrice: 100
      }),
      createActivity({
        date: '2025-01-02',
        quantity: 1000 / 110,
        type: 'BUY',
        unitPrice: 110
      })
    ];

    mockMarketPrices({
      currentRateService,
      getMarketPrice: ({ date, symbol }) => {
        if (symbol !== 'TWR_TEST') {
          return undefined;
        }

        if (isSameDay(parseDate('2025-01-02'), date)) {
          return 110;
        }

        if (isSameDay(parseDate('2025-01-03'), date)) {
          return 121;
        }

        return 100;
      }
    });

    const portfolioCalculator = portfolioCalculatorFactory.createCalculator({
      activities,
      calculationType: PerformanceCalculationType.TWR,
      currency: 'USD',
      usePortfolioSnapshotCache: false,
      userId: userDummyData.id
    });

    const portfolioSnapshot = await portfolioCalculator.computeSnapshot();

    expect(
      portfolioSnapshot.historicalData.at(-1)
        ?.netPerformanceInPercentageWithCurrencyEffect
    ).toBeCloseTo(0.21, 12);

    expect(
      portfolioSnapshot.positions[0].netPerformancePercentageWithCurrencyEffectMap.max.toNumber()
    ).toBeCloseTo(0.21, 12);

    expect(
      portfolioSnapshot.positions[0].netPerformancePercentageWithCurrencyEffectMap[
        '1d'
      ].toNumber()
    ).toBeCloseTo(0.1, 12);

    const { chart } = await portfolioCalculator.getPerformance({
      end: parseDate('2025-01-03'),
      start: parseDate('2025-01-02')
    });

    expect(
      chart.at(-1)?.netPerformanceInPercentageWithCurrencyEffect
    ).toBeCloseTo(0.1, 12);
  });

  it('ignores an external cash outflow when there is no investment return', async () => {
    jest.useFakeTimers().setSystemTime(parseDate('2025-01-02').getTime());

    const activities: Activity[] = [
      createActivity({
        date: '2025-01-01',
        quantity: 2,
        type: 'BUY',
        unitPrice: 100
      }),
      createActivity({
        date: '2025-01-02',
        quantity: 1,
        type: 'SELL',
        unitPrice: 100
      })
    ];

    mockMarketPrices({
      currentRateService,
      getMarketPrice: ({ symbol }) => {
        return symbol === 'TWR_TEST' ? 100 : undefined;
      }
    });

    const portfolioCalculator = portfolioCalculatorFactory.createCalculator({
      activities,
      calculationType: PerformanceCalculationType.TWR,
      currency: 'USD',
      usePortfolioSnapshotCache: false,
      userId: userDummyData.id
    });

    const portfolioSnapshot = await portfolioCalculator.computeSnapshot();

    expect(
      portfolioSnapshot.historicalData.at(-1)
        ?.netPerformanceInPercentageWithCurrencyEffect
    ).toBeCloseTo(0, 12);
  });

  it('treats a same-day sell and buy across holdings as an internal transfer', async () => {
    jest.useFakeTimers().setSystemTime(parseDate('2025-01-02').getTime());

    const activities: Activity[] = [
      createActivity({
        date: '2025-01-01',
        name: 'TWR Test Asset A',
        quantity: 2,
        symbol: 'TWR_A',
        type: 'BUY',
        unitPrice: 100
      }),
      createActivity({
        date: '2025-01-02',
        name: 'TWR Test Asset A',
        quantity: 1,
        symbol: 'TWR_A',
        type: 'SELL',
        unitPrice: 100
      }),
      createActivity({
        date: '2025-01-02',
        name: 'TWR Test Asset B',
        quantity: 1,
        symbol: 'TWR_B',
        type: 'BUY',
        unitPrice: 100
      })
    ];

    mockMarketPrices({
      currentRateService,
      getMarketPrice: ({ symbol }) => {
        return ['TWR_A', 'TWR_B'].includes(symbol) ? 100 : undefined;
      }
    });

    const portfolioCalculator = portfolioCalculatorFactory.createCalculator({
      activities,
      calculationType: PerformanceCalculationType.TWR,
      currency: 'USD',
      usePortfolioSnapshotCache: false,
      userId: userDummyData.id
    });

    const portfolioSnapshot = await portfolioCalculator.computeSnapshot();

    expect(
      portfolioSnapshot.historicalData.at(-1)
        ?.netPerformanceInPercentageWithCurrencyEffect
    ).toBeCloseTo(0, 12);
  });

  it('aggregates multiple same-day buys of the same holding as external cash flow', async () => {
    jest.useFakeTimers().setSystemTime(parseDate('2025-01-02').getTime());

    const activities: Activity[] = [
      createActivity({
        date: '2025-01-01',
        quantity: 1,
        type: 'BUY',
        unitPrice: 100
      }),
      createActivity({
        date: '2025-01-02',
        quantity: 1,
        type: 'BUY',
        unitPrice: 100
      }),
      createActivity({
        date: '2025-01-02',
        quantity: 2,
        type: 'BUY',
        unitPrice: 100
      })
    ];

    mockMarketPrices({
      currentRateService,
      getMarketPrice: ({ symbol }) => {
        return symbol === 'TWR_TEST' ? 100 : undefined;
      }
    });

    const portfolioCalculator = portfolioCalculatorFactory.createCalculator({
      activities,
      calculationType: PerformanceCalculationType.TWR,
      currency: 'USD',
      usePortfolioSnapshotCache: false,
      userId: userDummyData.id
    });

    const portfolioSnapshot = await portfolioCalculator.computeSnapshot();

    expect(
      portfolioSnapshot.historicalData.at(-1)
        ?.netPerformanceInPercentageWithCurrencyEffect
    ).toBeCloseTo(0, 12);

    expect(
      portfolioSnapshot.positions[0].netPerformancePercentage.toNumber()
    ).toBeCloseTo(0, 12);
  });

  it('treats dividends as investment return instead of external cash flow', async () => {
    jest.useFakeTimers().setSystemTime(parseDate('2025-01-02').getTime());

    const activities: Activity[] = [
      createActivity({
        date: '2025-01-01',
        quantity: 1,
        type: 'BUY',
        unitPrice: 100
      }),
      createActivity({
        date: '2025-01-02',
        quantity: 1,
        type: 'DIVIDEND',
        unitPrice: 10
      })
    ];

    mockMarketPrices({
      currentRateService,
      getMarketPrice: ({ symbol }) => {
        return symbol === 'TWR_TEST' ? 100 : undefined;
      }
    });

    const portfolioCalculator = portfolioCalculatorFactory.createCalculator({
      activities,
      calculationType: PerformanceCalculationType.TWR,
      currency: 'USD',
      usePortfolioSnapshotCache: false,
      userId: userDummyData.id
    });

    const portfolioSnapshot = await portfolioCalculator.computeSnapshot();

    expect(
      portfolioSnapshot.historicalData.at(-1)
        ?.netPerformanceInPercentageWithCurrencyEffect
    ).toBeCloseTo(0.1, 12);

    expect(
      portfolioSnapshot.historicalData.at(-1)
        ?.dividendInPercentageWithCurrencyEffect
    ).toBeCloseTo(0.1, 12);

    expect(
      portfolioSnapshot.positions[0].grossPerformancePercentage.toNumber()
    ).toBeCloseTo(0.1, 12);

    expect(
      portfolioSnapshot.positions[0].grossPerformancePercentageWithCurrencyEffect.toNumber()
    ).toBeCloseTo(0.1, 12);

    expect(
      portfolioSnapshot.positions[0].netPerformancePercentage.toNumber()
    ).toBeCloseTo(0.1, 12);
  });

  it('chain-links the dividend component across multiple periods', async () => {
    jest.useFakeTimers().setSystemTime(parseDate('2025-01-03').getTime());

    const activities: Activity[] = [
      createActivity({
        date: '2025-01-01',
        quantity: 1,
        type: 'BUY',
        unitPrice: 100
      }),
      createActivity({
        date: '2025-01-02',
        quantity: 1,
        type: 'DIVIDEND',
        unitPrice: 10
      })
    ];

    mockMarketPrices({
      currentRateService,
      getMarketPrice: ({ date, symbol }) => {
        if (symbol !== 'TWR_TEST') {
          return undefined;
        }

        if (isSameDay(parseDate('2025-01-02'), date)) {
          return 110;
        }

        if (isSameDay(parseDate('2025-01-03'), date)) {
          return 121;
        }

        return 100;
      }
    });

    const portfolioCalculator = portfolioCalculatorFactory.createCalculator({
      activities,
      calculationType: PerformanceCalculationType.TWR,
      currency: 'USD',
      usePortfolioSnapshotCache: false,
      userId: userDummyData.id
    });

    const portfolioSnapshot = await portfolioCalculator.computeSnapshot();
    const latestHistoricalDataItem = portfolioSnapshot.historicalData.at(-1);

    expect(
      latestHistoricalDataItem?.netPerformanceInPercentageWithCurrencyEffect
    ).toBeCloseTo(0.32, 12);

    expect(
      latestHistoricalDataItem?.dividendInPercentageWithCurrencyEffect
    ).toBeCloseTo(0.11, 12);

    expect(
      (latestHistoricalDataItem?.netPerformanceInPercentageWithCurrencyEffect ??
        0) -
        (latestHistoricalDataItem?.dividendInPercentageWithCurrencyEffect ?? 0)
    ).toBeCloseTo(0.21, 12);

    const { chart } = await portfolioCalculator.getPerformance({
      end: parseDate('2025-01-03'),
      start: parseDate('2025-01-02')
    });

    expect(
      chart.at(-1)?.netPerformanceInPercentageWithCurrencyEffect
    ).toBeCloseTo(0.1, 12);

    expect(chart.at(-1)?.dividendInPercentageWithCurrencyEffect).toBeCloseTo(
      0,
      12
    );
  });

  it('treats fees as negative investment return instead of external cash flow', async () => {
    jest.useFakeTimers().setSystemTime(parseDate('2025-01-02').getTime());

    const activities: Activity[] = [
      createActivity({
        date: '2025-01-01',
        quantity: 1,
        type: 'BUY',
        unitPrice: 100
      }),
      createActivity({
        date: '2025-01-02',
        fee: 10,
        quantity: 0,
        type: 'FEE',
        unitPrice: 0
      })
    ];

    mockMarketPrices({
      currentRateService,
      getMarketPrice: ({ symbol }) => {
        return symbol === 'TWR_TEST' ? 100 : undefined;
      }
    });

    const portfolioCalculator = portfolioCalculatorFactory.createCalculator({
      activities,
      calculationType: PerformanceCalculationType.TWR,
      currency: 'USD',
      usePortfolioSnapshotCache: false,
      userId: userDummyData.id
    });

    const portfolioSnapshot = await portfolioCalculator.computeSnapshot();

    expect(
      portfolioSnapshot.historicalData.at(-1)
        ?.netPerformanceInPercentageWithCurrencyEffect
    ).toBeCloseTo(-0.1, 12);

    expect(
      portfolioSnapshot.positions[0].grossPerformancePercentage.toNumber()
    ).toBeCloseTo(0, 12);

    expect(
      portfolioSnapshot.positions[0].grossPerformancePercentageWithCurrencyEffect.toNumber()
    ).toBeCloseTo(0, 12);

    expect(
      portfolioSnapshot.positions[0].netPerformancePercentage.toNumber()
    ).toBeCloseTo(-0.1, 12);
  });

  it('includes a standalone fee in portfolio return', async () => {
    jest.useFakeTimers().setSystemTime(parseDate('2025-01-02').getTime());

    const activities: Activity[] = [
      createActivity({
        date: '2025-01-01',
        quantity: 1,
        type: 'BUY',
        unitPrice: 100
      }),
      createActivity({
        dataSource: 'MANUAL',
        date: '2025-01-02',
        fee: 10,
        name: 'Account Fee',
        quantity: 0,
        symbol: 'TWR_STANDALONE_FEE',
        type: 'FEE',
        unitPrice: 0
      })
    ];

    mockMarketPrices({
      currentRateService,
      getMarketPrice: ({ symbol }) => {
        return symbol === 'TWR_TEST' ? 100 : undefined;
      }
    });

    const portfolioCalculator = portfolioCalculatorFactory.createCalculator({
      activities,
      calculationType: PerformanceCalculationType.TWR,
      currency: 'USD',
      usePortfolioSnapshotCache: false,
      userId: userDummyData.id
    });

    const portfolioSnapshot = await portfolioCalculator.computeSnapshot();

    expect(portfolioSnapshot.positions).toHaveLength(1);

    expect(
      portfolioSnapshot.historicalData.at(-1)
        ?.netPerformanceInPercentageWithCurrencyEffect
    ).toBeCloseTo(-0.1, 12);
  });

  it('includes standalone interest in portfolio return', async () => {
    jest.useFakeTimers().setSystemTime(parseDate('2025-01-02').getTime());

    const activities: Activity[] = [
      createActivity({
        date: '2025-01-01',
        quantity: 1,
        type: 'BUY',
        unitPrice: 100
      }),
      createActivity({
        dataSource: 'MANUAL',
        date: '2025-01-02',
        name: 'Interest Income',
        quantity: 1,
        symbol: 'TWR_STANDALONE_INTEREST',
        type: 'INTEREST',
        unitPrice: 10
      })
    ];

    mockMarketPrices({
      currentRateService,
      getMarketPrice: ({ symbol }) => {
        return symbol === 'TWR_TEST' ? 100 : undefined;
      }
    });

    const portfolioCalculator = portfolioCalculatorFactory.createCalculator({
      activities,
      calculationType: PerformanceCalculationType.TWR,
      currency: 'USD',
      usePortfolioSnapshotCache: false,
      userId: userDummyData.id
    });

    const portfolioSnapshot = await portfolioCalculator.computeSnapshot();

    expect(portfolioSnapshot.positions).toHaveLength(1);

    expect(
      portfolioSnapshot.historicalData.at(-1)
        ?.netPerformanceInPercentageWithCurrencyEffect
    ).toBeCloseTo(0.1, 12);
  });

  it('treats interest as investment return instead of external cash flow', async () => {
    jest.useFakeTimers().setSystemTime(parseDate('2025-01-02').getTime());

    const activities: Activity[] = [
      createActivity({
        date: '2025-01-01',
        quantity: 1,
        type: 'BUY',
        unitPrice: 100
      }),
      createActivity({
        date: '2025-01-02',
        quantity: 1,
        type: 'INTEREST',
        unitPrice: 10
      })
    ];

    mockMarketPrices({
      currentRateService,
      getMarketPrice: ({ symbol }) => {
        return symbol === 'TWR_TEST' ? 100 : undefined;
      }
    });

    const portfolioCalculator = portfolioCalculatorFactory.createCalculator({
      activities,
      calculationType: PerformanceCalculationType.TWR,
      currency: 'USD',
      usePortfolioSnapshotCache: false,
      userId: userDummyData.id
    });

    const portfolioSnapshot = await portfolioCalculator.computeSnapshot();

    expect(
      portfolioSnapshot.historicalData.at(-1)
        ?.netPerformanceInPercentageWithCurrencyEffect
    ).toBeCloseTo(0.1, 12);

    expect(
      portfolioSnapshot.positions[0].grossPerformancePercentage.toNumber()
    ).toBeCloseTo(0, 12);

    expect(
      portfolioSnapshot.positions[0].grossPerformancePercentageWithCurrencyEffect.toNumber()
    ).toBeCloseTo(0, 12);

    expect(
      portfolioSnapshot.positions[0].netPerformancePercentage.toNumber()
    ).toBeCloseTo(0, 12);
  });

  it('preserves investment return when a position is fully closed', async () => {
    jest.useFakeTimers().setSystemTime(parseDate('2025-01-02').getTime());

    const activities: Activity[] = [
      createActivity({
        date: '2025-01-01',
        quantity: 1,
        type: 'BUY',
        unitPrice: 100
      }),
      createActivity({
        date: '2025-01-02',
        quantity: 1,
        type: 'SELL',
        unitPrice: 110
      })
    ];

    mockMarketPrices({
      currentRateService,
      getMarketPrice: ({ date, symbol }) => {
        if (symbol !== 'TWR_TEST') {
          return undefined;
        }

        return isSameDay(date, parseDate('2025-01-01')) ? 100 : 110;
      }
    });

    const portfolioCalculator = portfolioCalculatorFactory.createCalculator({
      activities,
      calculationType: PerformanceCalculationType.TWR,
      currency: 'USD',
      usePortfolioSnapshotCache: false,
      userId: userDummyData.id
    });

    const portfolioSnapshot = await portfolioCalculator.computeSnapshot();

    expect(
      portfolioSnapshot.historicalData.at(-1)
        ?.netPerformanceInPercentageWithCurrencyEffect
    ).toBeCloseTo(0.1, 12);

    expect(
      portfolioSnapshot.positions[0].grossPerformancePercentage.toNumber()
    ).toBeCloseTo(0.1, 12);

    expect(
      portfolioSnapshot.positions[0].grossPerformancePercentageWithCurrencyEffect.toNumber()
    ).toBeCloseTo(0.1, 12);

    expect(
      portfolioSnapshot.positions[0].netPerformancePercentage.toNumber()
    ).toBeCloseTo(0.1, 12);
  });

  it('calculates a new date range after a cumulative 100 percent loss', async () => {
    jest.useFakeTimers().setSystemTime(parseDate('2025-01-04').getTime());

    const activities: Activity[] = [
      createActivity({
        date: '2025-01-01',
        quantity: 1,
        type: 'BUY',
        unitPrice: 100
      }),
      createActivity({
        date: '2025-01-02',
        fee: 100,
        quantity: 0,
        type: 'FEE',
        unitPrice: 0
      }),
      createActivity({
        date: '2025-01-03',
        quantity: 1,
        type: 'BUY',
        unitPrice: 100
      })
    ];

    mockMarketPrices({
      currentRateService,
      getMarketPrice: ({ date, symbol }) => {
        if (symbol !== 'TWR_TEST') {
          return undefined;
        }

        return isSameDay(parseDate('2025-01-04'), date) ? 110 : 100;
      }
    });

    const portfolioCalculator = portfolioCalculatorFactory.createCalculator({
      activities,
      calculationType: PerformanceCalculationType.TWR,
      currency: 'USD',
      usePortfolioSnapshotCache: false,
      userId: userDummyData.id
    });

    const portfolioSnapshot = await portfolioCalculator.computeSnapshot();

    expect(
      portfolioSnapshot.historicalData.at(-1)
        ?.netPerformanceInPercentageWithCurrencyEffect
    ).toBeCloseTo(-1, 12);

    expect(
      portfolioSnapshot.positions[0].netPerformancePercentageWithCurrencyEffectMap[
        '1d'
      ].toNumber()
    ).toBeCloseTo(0.1, 12);

    const { chart } = await portfolioCalculator.getPerformance({
      end: parseDate('2025-01-04'),
      start: parseDate('2025-01-03')
    });

    expect(
      chart.at(-1)?.netPerformanceInPercentageWithCurrencyEffect
    ).toBeCloseTo(0.1, 12);
  });

  it('separates investment return from currency effect', async () => {
    jest.useFakeTimers().setSystemTime(parseDate('2025-01-02').getTime());

    const activities: Activity[] = [
      createActivity({
        currency: 'EUR',
        date: '2025-01-01',
        name: 'TWR EUR Test Asset',
        quantity: 1,
        symbol: 'TWR_EUR_TEST',
        type: 'BUY',
        unitPrice: 100
      })
    ];

    jest
      .spyOn(exchangeRateDataService, 'getExchangeRatesByCurrency')
      .mockResolvedValue({
        EURUSD: {
          '2025-01-01': 1.1,
          '2025-01-02': 1.2
        }
      });

    mockMarketPrices({
      currentRateService,
      getMarketPrice: ({ symbol }) => {
        return symbol === 'TWR_EUR_TEST' ? 100 : undefined;
      }
    });

    const portfolioCalculator = portfolioCalculatorFactory.createCalculator({
      activities,
      calculationType: PerformanceCalculationType.TWR,
      currency: 'USD',
      usePortfolioSnapshotCache: false,
      userId: userDummyData.id
    });

    const portfolioSnapshot = await portfolioCalculator.computeSnapshot();
    const latestHistoricalDataItem = portfolioSnapshot.historicalData.at(-1);

    expect(latestHistoricalDataItem?.netPerformanceInPercentage).toBeCloseTo(
      0,
      12
    );

    expect(
      latestHistoricalDataItem?.netPerformanceInPercentageWithCurrencyEffect
    ).toBeCloseTo(1.2 / 1.1 - 1, 12);

    expect(
      portfolioSnapshot.positions[0].grossPerformancePercentage.toNumber()
    ).toBeCloseTo(0, 12);

    expect(
      portfolioSnapshot.positions[0].grossPerformancePercentageWithCurrencyEffect.toNumber()
    ).toBeCloseTo(1.2 / 1.1 - 1, 12);

    expect(
      portfolioSnapshot.positions[0].netPerformancePercentage.toNumber()
    ).toBeCloseTo(0, 12);
  });
});
