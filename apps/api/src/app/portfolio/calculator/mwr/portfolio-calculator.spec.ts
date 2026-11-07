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

import { AssetSubClass } from '@prisma/client';
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
  assetSubClass,
  currency = 'USD',
  dataSource = 'YAHOO',
  date,
  fee = 0,
  name = 'MWR Test Asset',
  quantity,
  symbol = 'MWR_TEST',
  type,
  unitPrice
}: {
  assetSubClass?: AssetSubClass;
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
      ...(assetSubClass ? { assetSubClass } : {}),
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

describe('PortfolioCalculator (MWR)', () => {
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

  it('calculates a 10 percent annualized return over one year', async () => {
    jest.useFakeTimers().setSystemTime(parseDate('2026-01-01').getTime());

    const activities: Activity[] = [
      createActivity({
        date: '2025-01-01',
        quantity: 1,
        type: 'BUY',
        unitPrice: 1000
      })
    ];

    mockMarketPrices({
      currentRateService,
      getMarketPrice: ({ date, symbol }) => {
        if (symbol !== 'MWR_TEST') {
          return undefined;
        }

        return isSameDay(parseDate('2026-01-01'), date) ? 1100 : 1000;
      }
    });

    const portfolioCalculator = portfolioCalculatorFactory.createCalculator({
      activities,
      calculationType: PerformanceCalculationType.MWR,
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

  describe('holding performance', () => {
    it('calculates the money-weighted return of a holding', async () => {
      jest.useFakeTimers().setSystemTime(parseDate('2026-01-01').getTime());

      const activities: Activity[] = [
        createActivity({
          date: '2025-01-01',
          quantity: 10,
          type: 'BUY',
          unitPrice: 100
        })
      ];

      mockMarketPrices({
        currentRateService,
        getMarketPrice: ({ date, symbol }) => {
          if (symbol !== 'MWR_TEST') {
            return undefined;
          }

          return isSameDay(parseDate('2026-01-01'), date) ? 110 : 100;
        }
      });

      const portfolioCalculator = portfolioCalculatorFactory.createCalculator({
        activities,
        calculationType: PerformanceCalculationType.MWR,
        currency: 'USD',
        usePortfolioSnapshotCache: false,
        userId: userDummyData.id
      });

      const portfolioSnapshot = await portfolioCalculator.computeSnapshot();
      const position = portfolioSnapshot.positions[0];

      expect(position.grossPerformancePercentage.toNumber()).toBeCloseTo(
        0.1,
        12
      );

      expect(
        position.grossPerformancePercentageWithCurrencyEffect.toNumber()
      ).toBeCloseTo(0.1, 12);

      expect(position.netPerformancePercentage.toNumber()).toBeCloseTo(0.1, 12);

      expect(
        position.netPerformancePercentageWithCurrencyEffectMap.max.toNumber()
      ).toBeCloseTo(0.1, 12);
    });

    it('separates gross and net holding return when fees are present', async () => {
      jest.useFakeTimers().setSystemTime(parseDate('2026-01-01').getTime());

      const activities: Activity[] = [
        createActivity({
          date: '2025-01-01',
          fee: 10,
          quantity: 10,
          type: 'BUY',
          unitPrice: 100
        })
      ];

      mockMarketPrices({
        currentRateService,
        getMarketPrice: ({ date, symbol }) => {
          if (symbol !== 'MWR_TEST') {
            return undefined;
          }

          return isSameDay(parseDate('2026-01-01'), date) ? 110 : 100;
        }
      });

      const portfolioCalculator = portfolioCalculatorFactory.createCalculator({
        activities,
        calculationType: PerformanceCalculationType.MWR,
        currency: 'USD',
        usePortfolioSnapshotCache: false,
        userId: userDummyData.id
      });

      const portfolioSnapshot = await portfolioCalculator.computeSnapshot();
      const position = portfolioSnapshot.positions[0];

      expect(position.grossPerformancePercentage.toNumber()).toBeCloseTo(
        0.1,
        12
      );

      expect(
        position.grossPerformancePercentageWithCurrencyEffect.toNumber()
      ).toBeCloseTo(0.1, 12);

      expect(position.netPerformancePercentage.toNumber()).toBeCloseTo(
        0.0891089108910891,
        12
      );

      expect(
        position.netPerformancePercentageWithCurrencyEffectMap.max.toNumber()
      ).toBeCloseTo(0.0891089108910891, 12);
    });

    it('includes dividends in the holding money-weighted return', async () => {
      jest.useFakeTimers().setSystemTime(parseDate('2026-01-01').getTime());

      const activities: Activity[] = [
        createActivity({
          date: '2025-01-01',
          quantity: 10,
          type: 'BUY',
          unitPrice: 100
        }),
        createActivity({
          date: '2025-07-01',
          quantity: 1,
          type: 'DIVIDEND',
          unitPrice: 100
        })
      ];

      mockMarketPrices({
        currentRateService,
        getMarketPrice: ({ symbol }) => {
          return symbol === 'MWR_TEST' ? 100 : undefined;
        }
      });

      const portfolioCalculator = portfolioCalculatorFactory.createCalculator({
        activities,
        calculationType: PerformanceCalculationType.MWR,
        currency: 'USD',
        usePortfolioSnapshotCache: false,
        userId: userDummyData.id
      });

      const portfolioSnapshot = await portfolioCalculator.computeSnapshot();
      const position = portfolioSnapshot.positions[0];

      expect(position.grossPerformancePercentage.toNumber()).toBeCloseTo(
        0.10517029137368816,
        12
      );

      expect(
        position.grossPerformancePercentageWithCurrencyEffect.toNumber()
      ).toBeCloseTo(0.10517029137368816, 12);

      expect(position.netPerformancePercentage.toNumber()).toBeCloseTo(
        0.10517029137368816,
        12
      );

      expect(
        position.netPerformancePercentageWithCurrencyEffectMap.max.toNumber()
      ).toBeCloseTo(0.10517029137368816, 12);
    });

    it('separates holding investment return from currency effect', async () => {
      jest.useFakeTimers().setSystemTime(parseDate('2026-01-01').getTime());

      const activities: Activity[] = [
        createActivity({
          currency: 'EUR',
          date: '2025-01-01',
          quantity: 10,
          type: 'BUY',
          unitPrice: 100
        })
      ];

      mockMarketPrices({
        currentRateService,
        getMarketPrice: ({ symbol }) => {
          return symbol === 'MWR_TEST' ? 100 : undefined;
        }
      });

      jest
        .spyOn(exchangeRateDataService, 'getExchangeRatesByCurrency')
        .mockResolvedValue({
          EURUSD: {
            '2025-01-01': 1.1,
            '2026-01-01': 1.2
          }
        });

      const portfolioCalculator = portfolioCalculatorFactory.createCalculator({
        activities,
        calculationType: PerformanceCalculationType.MWR,
        currency: 'USD',
        usePortfolioSnapshotCache: false,
        userId: userDummyData.id
      });

      const portfolioSnapshot = await portfolioCalculator.computeSnapshot();
      const position = portfolioSnapshot.positions[0];

      expect(position.grossPerformancePercentage.toNumber()).toBeCloseTo(0, 12);

      expect(
        position.grossPerformancePercentageWithCurrencyEffect.toNumber()
      ).toBeCloseTo(0.09090909090909083, 12);

      expect(position.netPerformancePercentage.toNumber()).toBeCloseTo(0, 12);

      expect(
        position.netPerformancePercentageWithCurrencyEffectMap.max.toNumber()
      ).toBeCloseTo(0.09090909090909083, 12);
    });

    it('uses the holding value at the range start as the opening cash flow', async () => {
      jest.useFakeTimers().setSystemTime(parseDate('2026-01-01').getTime());

      const activities: Activity[] = [
        createActivity({
          date: '2024-01-01',
          quantity: 10,
          type: 'BUY',
          unitPrice: 100
        })
      ];

      mockMarketPrices({
        currentRateService,
        getMarketPrice: ({ date, symbol }) => {
          if (symbol !== 'MWR_TEST') {
            return undefined;
          }

          if (isSameDay(parseDate('2026-01-01'), date)) {
            return 132;
          }

          if (date >= parseDate('2025-01-01')) {
            return 120;
          }

          return 100;
        }
      });

      const portfolioCalculator = portfolioCalculatorFactory.createCalculator({
        activities,
        calculationType: PerformanceCalculationType.MWR,
        currency: 'USD',
        usePortfolioSnapshotCache: false,
        userId: userDummyData.id
      });

      const portfolioSnapshot = await portfolioCalculator.computeSnapshot();
      const position = portfolioSnapshot.positions[0];

      expect(
        position.netPerformancePercentageWithCurrencyEffectMap['1y']?.toNumber()
      ).toBeCloseTo(0.1, 12);
    });

    it('includes holding contributions made inside the date range', async () => {
      jest.useFakeTimers().setSystemTime(parseDate('2026-01-01').getTime());

      const activities: Activity[] = [
        createActivity({
          date: '2024-01-01',
          quantity: 10,
          type: 'BUY',
          unitPrice: 100
        }),
        createActivity({
          date: '2025-07-01',
          quantity: 5,
          type: 'BUY',
          unitPrice: 100
        })
      ];

      mockMarketPrices({
        currentRateService,
        getMarketPrice: ({ date, symbol }) => {
          if (symbol !== 'MWR_TEST') {
            return undefined;
          }

          if (isSameDay(parseDate('2026-01-01'), date)) {
            return 1870 / 15;
          }

          if (date >= parseDate('2025-01-01')) {
            return 120;
          }

          return 100;
        }
      });

      const portfolioCalculator = portfolioCalculatorFactory.createCalculator({
        activities,
        calculationType: PerformanceCalculationType.MWR,
        currency: 'USD',
        usePortfolioSnapshotCache: false,
        userId: userDummyData.id
      });

      const portfolioSnapshot = await portfolioCalculator.computeSnapshot();
      const position = portfolioSnapshot.positions[0];

      expect(
        position.netPerformancePercentageWithCurrencyEffectMap['1y']?.toNumber()
      ).toBeCloseTo(0.11763852117676865, 12);
    });

    it('includes holding withdrawals made inside the date range', async () => {
      jest.useFakeTimers().setSystemTime(parseDate('2026-01-01').getTime());

      const activities: Activity[] = [
        createActivity({
          date: '2024-01-01',
          quantity: 10,
          type: 'BUY',
          unitPrice: 100
        }),
        createActivity({
          date: '2025-07-01',
          quantity: 5,
          type: 'SELL',
          unitPrice: 100
        })
      ];

      mockMarketPrices({
        currentRateService,
        getMarketPrice: ({ date, symbol }) => {
          if (symbol !== 'MWR_TEST') {
            return undefined;
          }

          if (isSameDay(parseDate('2026-01-01'), date)) {
            return 160;
          }

          if (date >= parseDate('2025-01-01')) {
            return 120;
          }

          return 100;
        }
      });

      const portfolioCalculator = portfolioCalculatorFactory.createCalculator({
        activities,
        calculationType: PerformanceCalculationType.MWR,
        currency: 'USD',
        usePortfolioSnapshotCache: false,
        userId: userDummyData.id
      });

      const portfolioSnapshot = await portfolioCalculator.computeSnapshot();
      const position = portfolioSnapshot.positions[0];

      expect(
        position.netPerformancePercentageWithCurrencyEffectMap['1y']?.toNumber()
      ).toBeCloseTo(0.10480274054180116, 12);
    });

    it('includes holding income and fees made inside the date range', async () => {
      jest.useFakeTimers().setSystemTime(parseDate('2026-01-01').getTime());

      const activities: Activity[] = [
        createActivity({
          date: '2024-01-01',
          quantity: 10,
          type: 'BUY',
          unitPrice: 100
        }),
        createActivity({
          date: '2025-07-01',
          fee: 10,
          quantity: 1,
          type: 'DIVIDEND',
          unitPrice: 100
        })
      ];

      mockMarketPrices({
        currentRateService,
        getMarketPrice: ({ date, symbol }) => {
          if (symbol !== 'MWR_TEST') {
            return undefined;
          }

          if (date >= parseDate('2025-01-01')) {
            return 120;
          }

          return 100;
        }
      });

      const portfolioCalculator = portfolioCalculatorFactory.createCalculator({
        activities,
        calculationType: PerformanceCalculationType.MWR,
        currency: 'USD',
        usePortfolioSnapshotCache: false,
        userId: userDummyData.id
      });

      const portfolioSnapshot = await portfolioCalculator.computeSnapshot();
      const position = portfolioSnapshot.positions[0];

      expect(
        position.netPerformancePercentageWithCurrencyEffectMap['1y']?.toNumber()
      ).toBeCloseTo(0.07789012071165524, 12);
    });
  });

  it('excludes cash in the base currency from money-weighted return', async () => {
    jest.useFakeTimers().setSystemTime(parseDate('2026-01-01').getTime());

    const activities: Activity[] = [
      createActivity({
        date: '2025-01-01',
        quantity: 10,
        type: 'BUY',
        unitPrice: 100
      }),
      createActivity({
        assetSubClass: AssetSubClass.CASH,
        currency: 'USD',
        date: '2025-07-01',
        name: 'US Dollar',
        quantity: 500,
        symbol: 'USD',
        type: 'BUY',
        unitPrice: 1
      })
    ];

    mockMarketPrices({
      currentRateService,
      getMarketPrice: ({ date, symbol }) => {
        if (symbol !== 'MWR_TEST') {
          return undefined;
        }

        return isSameDay(parseDate('2026-01-01'), date) ? 110 : 100;
      }
    });

    const portfolioCalculator = portfolioCalculatorFactory.createCalculator({
      activities,
      calculationType: PerformanceCalculationType.MWR,
      currency: 'USD',
      usePortfolioSnapshotCache: false,
      userId: userDummyData.id
    });

    const portfolioSnapshot = await portfolioCalculator.computeSnapshot();
    const latestHistoricalDataItem = portfolioSnapshot.historicalData.at(-1);

    expect(latestHistoricalDataItem?.netPerformanceInPercentage).toBeCloseTo(
      0.1,
      12
    );

    expect(
      latestHistoricalDataItem?.netPerformanceInPercentageWithCurrencyEffect
    ).toBeCloseTo(0.1, 12);
  });

  it('includes cash in a foreign currency in money-weighted return', async () => {
    jest.useFakeTimers().setSystemTime(parseDate('2026-01-01').getTime());

    const activities: Activity[] = [
      createActivity({
        assetSubClass: AssetSubClass.CASH,
        currency: 'EUR',
        date: '2025-01-01',
        name: 'Euro',
        quantity: 1000,
        symbol: 'EUR',
        type: 'BUY',
        unitPrice: 1
      })
    ];

    jest
      .spyOn(exchangeRateDataService, 'getExchangeRatesByCurrency')
      .mockResolvedValue({
        EURUSD: {
          '2025-01-01': 1.1,
          '2026-01-01': 1.2
        }
      });

    mockMarketPrices({
      currentRateService,
      getMarketPrice: ({ symbol }) => {
        return symbol === 'EUR' ? 1 : undefined;
      }
    });

    const portfolioCalculator = portfolioCalculatorFactory.createCalculator({
      activities,
      calculationType: PerformanceCalculationType.MWR,
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
  });

  describe('annualization', () => {
    it('calculates a 10 percent annualized return over two years', async () => {
      jest.useFakeTimers().setSystemTime(parseDate('2027-01-01').getTime());

      const activities: Activity[] = [
        createActivity({
          date: '2025-01-01',
          quantity: 1,
          type: 'BUY',
          unitPrice: 1000
        })
      ];

      mockMarketPrices({
        currentRateService,
        getMarketPrice: ({ date, symbol }) => {
          if (symbol !== 'MWR_TEST') {
            return undefined;
          }

          return isSameDay(parseDate('2027-01-01'), date) ? 1210 : 1000;
        }
      });

      const portfolioCalculator = portfolioCalculatorFactory.createCalculator({
        activities,
        calculationType: PerformanceCalculationType.MWR,
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

    it('annualizes a 10 percent return over about six months', async () => {
      jest.useFakeTimers().setSystemTime(parseDate('2025-07-01').getTime());

      const activities: Activity[] = [
        createActivity({
          date: '2025-01-01',
          quantity: 1,
          type: 'BUY',
          unitPrice: 1000
        })
      ];

      mockMarketPrices({
        currentRateService,
        getMarketPrice: ({ date, symbol }) => {
          if (symbol !== 'MWR_TEST') {
            return undefined;
          }

          return isSameDay(parseDate('2025-07-01'), date) ? 1100 : 1000;
        }
      });

      const portfolioCalculator = portfolioCalculatorFactory.createCalculator({
        activities,
        calculationType: PerformanceCalculationType.MWR,
        currency: 'USD',
        usePortfolioSnapshotCache: false,
        userId: userDummyData.id
      });

      const portfolioSnapshot = await portfolioCalculator.computeSnapshot();

      expect(
        portfolioSnapshot.historicalData.at(-1)
          ?.netPerformanceInPercentageWithCurrencyEffect
      ).toBeCloseTo(0.21191297994683578, 12);
    });

    it('weights an intermediate contribution by its timing', async () => {
      jest.useFakeTimers().setSystemTime(parseDate('2026-01-01').getTime());

      const activities: Activity[] = [
        createActivity({
          date: '2025-01-01',
          quantity: 1,
          type: 'BUY',
          unitPrice: 1000
        }),
        createActivity({
          date: '2025-07-01',
          quantity: 1,
          type: 'BUY',
          unitPrice: 1000
        })
      ];

      mockMarketPrices({
        currentRateService,
        getMarketPrice: ({ date, symbol }) => {
          if (symbol !== 'MWR_TEST') {
            return undefined;
          }

          if (isSameDay(parseDate('2026-01-01'), date)) {
            return 1155;
          }

          return 1000;
        }
      });

      const portfolioCalculator = portfolioCalculatorFactory.createCalculator({
        activities,
        calculationType: PerformanceCalculationType.MWR,
        currency: 'USD',
        usePortfolioSnapshotCache: false,
        userId: userDummyData.id
      });

      const portfolioSnapshot = await portfolioCalculator.computeSnapshot();

      expect(
        portfolioSnapshot.historicalData.at(-1)
          ?.netPerformanceInPercentageWithCurrencyEffect
      ).toBeCloseTo(0.20940902971073883, 12);
    });
  });

  describe('income and fees', () => {
    it('includes a dividend as a dated positive cash flow', async () => {
      jest.useFakeTimers().setSystemTime(parseDate('2026-01-01').getTime());

      const activities: Activity[] = [
        createActivity({
          date: '2025-01-01',
          quantity: 10,
          type: 'BUY',
          unitPrice: 100
        }),
        createActivity({
          date: '2025-07-01',
          quantity: 1,
          type: 'DIVIDEND',
          unitPrice: 100
        })
      ];

      mockMarketPrices({
        currentRateService,
        getMarketPrice: ({ symbol }) => {
          return symbol === 'MWR_TEST' ? 100 : undefined;
        }
      });

      const portfolioCalculator = portfolioCalculatorFactory.createCalculator({
        activities,
        calculationType: PerformanceCalculationType.MWR,
        currency: 'USD',
        usePortfolioSnapshotCache: false,
        userId: userDummyData.id
      });

      const portfolioSnapshot = await portfolioCalculator.computeSnapshot();
      const latestHistoricalDataItem = portfolioSnapshot.historicalData.at(-1);

      expect(
        latestHistoricalDataItem?.netPerformanceInPercentageWithCurrencyEffect
      ).toBeCloseTo(0.10517029137368816, 12);

      expect(
        latestHistoricalDataItem?.dividendInPercentageWithCurrencyEffect
      ).toBeCloseTo(0.10517029137368816, 12);
    });

    it('includes interest as a dated positive cash flow', async () => {
      jest.useFakeTimers().setSystemTime(parseDate('2026-01-01').getTime());

      const activities: Activity[] = [
        createActivity({
          date: '2025-01-01',
          quantity: 10,
          type: 'BUY',
          unitPrice: 100
        }),
        createActivity({
          date: '2025-07-01',
          quantity: 1,
          type: 'INTEREST',
          unitPrice: 100
        })
      ];

      mockMarketPrices({
        currentRateService,
        getMarketPrice: ({ symbol }) => {
          return symbol === 'MWR_TEST' ? 100 : undefined;
        }
      });

      const portfolioCalculator = portfolioCalculatorFactory.createCalculator({
        activities,
        calculationType: PerformanceCalculationType.MWR,
        currency: 'USD',
        usePortfolioSnapshotCache: false,
        userId: userDummyData.id
      });

      const portfolioSnapshot = await portfolioCalculator.computeSnapshot();
      const latestHistoricalDataItem = portfolioSnapshot.historicalData.at(-1);

      expect(
        latestHistoricalDataItem?.netPerformanceInPercentageWithCurrencyEffect
      ).toBeCloseTo(0.10517029137368816, 12);

      expect(
        latestHistoricalDataItem?.dividendInPercentageWithCurrencyEffect
      ).toBeCloseTo(0, 12);
    });

    it('includes a transaction fee as a dated negative cash flow', async () => {
      jest.useFakeTimers().setSystemTime(parseDate('2026-01-01').getTime());

      const activities: Activity[] = [
        createActivity({
          date: '2025-01-01',
          fee: 10,
          quantity: 10,
          type: 'BUY',
          unitPrice: 100
        })
      ];

      mockMarketPrices({
        currentRateService,
        getMarketPrice: ({ date, symbol }) => {
          if (symbol !== 'MWR_TEST') {
            return undefined;
          }

          return isSameDay(parseDate('2026-01-01'), date) ? 110 : 100;
        }
      });

      const portfolioCalculator = portfolioCalculatorFactory.createCalculator({
        activities,
        calculationType: PerformanceCalculationType.MWR,
        currency: 'USD',
        usePortfolioSnapshotCache: false,
        userId: userDummyData.id
      });

      const portfolioSnapshot = await portfolioCalculator.computeSnapshot();

      expect(
        portfolioSnapshot.historicalData.at(-1)
          ?.netPerformanceInPercentageWithCurrencyEffect
      ).toBeCloseTo(0.0891089108910891, 12);
    });

    it('includes a standalone fee activity as a dated negative cash flow', async () => {
      jest.useFakeTimers().setSystemTime(parseDate('2026-01-01').getTime());

      const activities: Activity[] = [
        createActivity({
          date: '2025-01-01',
          quantity: 10,
          type: 'BUY',
          unitPrice: 100
        }),
        createActivity({
          date: '2025-07-01',
          fee: 10,
          quantity: 0,
          type: 'FEE',
          unitPrice: 0
        })
      ];

      mockMarketPrices({
        currentRateService,
        getMarketPrice: ({ date, symbol }) => {
          if (symbol !== 'MWR_TEST') {
            return undefined;
          }

          return isSameDay(parseDate('2026-01-01'), date) ? 110 : 100;
        }
      });

      const portfolioCalculator = portfolioCalculatorFactory.createCalculator({
        activities,
        calculationType: PerformanceCalculationType.MWR,
        currency: 'USD',
        usePortfolioSnapshotCache: false,
        userId: userDummyData.id
      });

      const portfolioSnapshot = await portfolioCalculator.computeSnapshot();

      expect(
        portfolioSnapshot.historicalData.at(-1)
          ?.netPerformanceInPercentageWithCurrencyEffect
      ).toBeCloseTo(0.08955812988796497, 12);
    });
  });

  describe('currency effect', () => {
    it('separates investment return from currency effect', async () => {
      jest.useFakeTimers().setSystemTime(parseDate('2026-01-01').getTime());

      const activities: Activity[] = [
        createActivity({
          currency: 'EUR',
          date: '2025-01-01',
          name: 'MWR EUR Test Asset',
          quantity: 10,
          symbol: 'MWR_EUR_TEST',
          type: 'BUY',
          unitPrice: 100
        })
      ];

      jest
        .spyOn(exchangeRateDataService, 'getExchangeRatesByCurrency')
        .mockResolvedValue({
          EURUSD: {
            '2025-01-01': 1.1,
            '2026-01-01': 1.2
          }
        });

      mockMarketPrices({
        currentRateService,
        getMarketPrice: ({ symbol }) => {
          return symbol === 'MWR_EUR_TEST' ? 100 : undefined;
        }
      });

      const portfolioCalculator = portfolioCalculatorFactory.createCalculator({
        activities,
        calculationType: PerformanceCalculationType.MWR,
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
    });

    it('combines asset return and currency effect independently', async () => {
      jest.useFakeTimers().setSystemTime(parseDate('2026-01-01').getTime());

      const activities: Activity[] = [
        createActivity({
          currency: 'EUR',
          date: '2025-01-01',
          name: 'MWR EUR Growth Test Asset',
          quantity: 10,
          symbol: 'MWR_EUR_GROWTH_TEST',
          type: 'BUY',
          unitPrice: 100
        })
      ];

      jest
        .spyOn(exchangeRateDataService, 'getExchangeRatesByCurrency')
        .mockResolvedValue({
          EURUSD: {
            '2025-01-01': 1.1,
            '2026-01-01': 1.2
          }
        });

      mockMarketPrices({
        currentRateService,
        getMarketPrice: ({ date, symbol }) => {
          if (symbol !== 'MWR_EUR_GROWTH_TEST') {
            return undefined;
          }

          return isSameDay(parseDate('2026-01-01'), date) ? 110 : 100;
        }
      });

      const portfolioCalculator = portfolioCalculatorFactory.createCalculator({
        activities,
        calculationType: PerformanceCalculationType.MWR,
        currency: 'USD',
        usePortfolioSnapshotCache: false,
        userId: userDummyData.id
      });

      const portfolioSnapshot = await portfolioCalculator.computeSnapshot();
      const latestHistoricalDataItem = portfolioSnapshot.historicalData.at(-1);

      expect(latestHistoricalDataItem?.netPerformanceInPercentage).toBeCloseTo(
        0.1,
        12
      );

      expect(
        latestHistoricalDataItem?.netPerformanceInPercentageWithCurrencyEffect
      ).toBeCloseTo(0.2, 12);
    });
  });

  describe('date ranges', () => {
    it('uses the portfolio value at the range start as the opening cash flow', async () => {
      jest.useFakeTimers().setSystemTime(parseDate('2026-01-01').getTime());

      const activities: Activity[] = [
        createActivity({
          date: '2024-01-01',
          quantity: 10,
          type: 'BUY',
          unitPrice: 100
        })
      ];

      mockMarketPrices({
        currentRateService,
        getMarketPrice: ({ date, symbol }) => {
          if (symbol !== 'MWR_TEST') {
            return undefined;
          }

          if (isSameDay(parseDate('2026-01-01'), date)) {
            return 132;
          }

          if (date >= parseDate('2025-01-01')) {
            return 120;
          }

          return 100;
        }
      });

      const portfolioCalculator = portfolioCalculatorFactory.createCalculator({
        activities,
        calculationType: PerformanceCalculationType.MWR,
        currency: 'USD',
        usePortfolioSnapshotCache: false,
        userId: userDummyData.id
      });

      await portfolioCalculator.computeSnapshot();

      const { chart } = await portfolioCalculator.getPerformance({
        end: parseDate('2026-01-01'),
        start: parseDate('2025-01-01')
      });

      expect(
        chart.at(-1)?.netPerformanceInPercentageWithCurrencyEffect
      ).toBeCloseTo(0.1, 12);
    });

    it('includes contributions made inside the date range', async () => {
      jest.useFakeTimers().setSystemTime(parseDate('2026-01-01').getTime());

      const activities: Activity[] = [
        createActivity({
          date: '2024-01-01',
          quantity: 10,
          type: 'BUY',
          unitPrice: 100
        }),
        createActivity({
          date: '2025-07-01',
          quantity: 5,
          type: 'BUY',
          unitPrice: 100
        })
      ];

      mockMarketPrices({
        currentRateService,
        getMarketPrice: ({ date, symbol }) => {
          if (symbol !== 'MWR_TEST') {
            return undefined;
          }

          if (isSameDay(parseDate('2026-01-01'), date)) {
            return 124.66666666666667;
          }

          if (date >= parseDate('2025-01-01')) {
            return 120;
          }

          return 100;
        }
      });

      const portfolioCalculator = portfolioCalculatorFactory.createCalculator({
        activities,
        calculationType: PerformanceCalculationType.MWR,
        currency: 'USD',
        usePortfolioSnapshotCache: false,
        userId: userDummyData.id
      });

      await portfolioCalculator.computeSnapshot();

      const { chart } = await portfolioCalculator.getPerformance({
        end: parseDate('2026-01-01'),
        start: parseDate('2025-01-01')
      });

      expect(
        chart.at(-1)?.netPerformanceInPercentageWithCurrencyEffect
      ).toBeCloseTo(0.11763852117676865, 12);
    });

    it('includes withdrawals made inside the date range', async () => {
      jest.useFakeTimers().setSystemTime(parseDate('2026-01-01').getTime());

      const activities: Activity[] = [
        createActivity({
          date: '2024-01-01',
          quantity: 10,
          type: 'BUY',
          unitPrice: 100
        }),
        createActivity({
          date: '2025-07-01',
          quantity: 5,
          type: 'SELL',
          unitPrice: 100
        })
      ];

      mockMarketPrices({
        currentRateService,
        getMarketPrice: ({ date, symbol }) => {
          if (symbol !== 'MWR_TEST') {
            return undefined;
          }

          if (isSameDay(parseDate('2026-01-01'), date)) {
            return 160;
          }

          if (date >= parseDate('2025-01-01')) {
            return 120;
          }

          return 100;
        }
      });

      const portfolioCalculator = portfolioCalculatorFactory.createCalculator({
        activities,
        calculationType: PerformanceCalculationType.MWR,
        currency: 'USD',
        usePortfolioSnapshotCache: false,
        userId: userDummyData.id
      });

      await portfolioCalculator.computeSnapshot();

      const { chart } = await portfolioCalculator.getPerformance({
        end: parseDate('2026-01-01'),
        start: parseDate('2025-01-01')
      });

      expect(
        chart.at(-1)?.netPerformanceInPercentageWithCurrencyEffect
      ).toBeCloseTo(0.10480274054180116, 12);
    });

    it('includes income and fees made inside the date range', async () => {
      jest.useFakeTimers().setSystemTime(parseDate('2026-01-01').getTime());

      const activities: Activity[] = [
        createActivity({
          date: '2024-01-01',
          quantity: 10,
          type: 'BUY',
          unitPrice: 100
        }),
        createActivity({
          date: '2025-07-01',
          quantity: 1,
          type: 'DIVIDEND',
          unitPrice: 100
        }),
        createActivity({
          date: '2025-07-01',
          fee: 10,
          quantity: 0,
          type: 'BUY',
          unitPrice: 0
        })
      ];

      mockMarketPrices({
        currentRateService,
        getMarketPrice: ({ date, symbol }) => {
          if (symbol !== 'MWR_TEST') {
            return undefined;
          }

          if (date >= parseDate('2025-01-01')) {
            return 120;
          }

          return 100;
        }
      });

      const portfolioCalculator = portfolioCalculatorFactory.createCalculator({
        activities,
        calculationType: PerformanceCalculationType.MWR,
        currency: 'USD',
        usePortfolioSnapshotCache: false,
        userId: userDummyData.id
      });

      await portfolioCalculator.computeSnapshot();

      const { chart } = await portfolioCalculator.getPerformance({
        end: parseDate('2026-01-01'),
        start: parseDate('2025-01-01')
      });

      const latestChartItem = chart.at(-1);

      expect(
        latestChartItem?.netPerformanceInPercentageWithCurrencyEffect
      ).toBeCloseTo(0.07789012071165524, 12);

      expect(
        latestChartItem?.dividendInPercentageWithCurrencyEffect
      ).toBeCloseTo(0.08618852115840608, 12);
    });
  });

  describe('date range income classification', () => {
    it('does not count interest as a dividend inside the date range', async () => {
      jest.useFakeTimers().setSystemTime(parseDate('2026-01-01').getTime());

      const activities: Activity[] = [
        createActivity({
          date: '2024-01-01',
          quantity: 10,
          type: 'BUY',
          unitPrice: 100
        }),
        createActivity({
          date: '2025-07-01',
          quantity: 1,
          type: 'INTEREST',
          unitPrice: 100
        }),
        createActivity({
          date: '2025-07-01',
          fee: 10,
          quantity: 0,
          type: 'BUY',
          unitPrice: 0
        })
      ];

      mockMarketPrices({
        currentRateService,
        getMarketPrice: ({ date, symbol }) => {
          if (symbol !== 'MWR_TEST') {
            return undefined;
          }

          if (date >= parseDate('2025-01-01')) {
            return 120;
          }

          return 100;
        }
      });

      const portfolioCalculator = portfolioCalculatorFactory.createCalculator({
        activities,
        calculationType: PerformanceCalculationType.MWR,
        currency: 'USD',
        usePortfolioSnapshotCache: false,
        userId: userDummyData.id
      });

      await portfolioCalculator.computeSnapshot();

      const { chart } = await portfolioCalculator.getPerformance({
        end: parseDate('2026-01-01'),
        start: parseDate('2025-01-01')
      });

      const latestChartItem = chart.at(-1);

      expect(
        latestChartItem?.netPerformanceInPercentageWithCurrencyEffect
      ).toBeCloseTo(0.07789012071165524, 12);

      expect(
        latestChartItem?.dividendInPercentageWithCurrencyEffect
      ).toBeCloseTo(0, 12);
    });
  });

  describe('solver edge cases', () => {
    it('calculates a return close to minus one hundred percent', async () => {
      jest.useFakeTimers().setSystemTime(parseDate('2026-01-01').getTime());

      const activities: Activity[] = [
        createActivity({
          date: '2025-01-01',
          quantity: 1,
          type: 'BUY',
          unitPrice: 1000
        })
      ];

      mockMarketPrices({
        currentRateService,
        getMarketPrice: ({ date, symbol }) => {
          if (symbol !== 'MWR_TEST') {
            return undefined;
          }

          return isSameDay(parseDate('2026-01-01'), date) ? 1 : 1000;
        }
      });

      const portfolioCalculator = portfolioCalculatorFactory.createCalculator({
        activities,
        calculationType: PerformanceCalculationType.MWR,
        currency: 'USD',
        usePortfolioSnapshotCache: false,
        userId: userDummyData.id
      });

      const portfolioSnapshot = await portfolioCalculator.computeSnapshot();

      expect(
        portfolioSnapshot.historicalData.at(-1)
          ?.netPerformanceInPercentageWithCurrencyEffect
      ).toBeCloseTo(-0.999, 12);
    });
  });

  describe('solver multiple roots', () => {
    it('uses the XIRR root reached from a zero initial estimate', async () => {
      jest.useFakeTimers().setSystemTime(parseDate('2027-01-01').getTime());

      const activities: Activity[] = [
        createActivity({
          date: '2025-01-01',
          quantity: 1,
          type: 'BUY',
          unitPrice: 100
        }),
        createActivity({
          date: '2026-01-01',
          quantity: 1,
          type: 'SELL',
          unitPrice: 230
        }),
        createActivity({
          date: '2027-01-01',
          quantity: 1,
          type: 'BUY',
          unitPrice: 132
        })
      ];

      mockMarketPrices({
        currentRateService,
        getMarketPrice: ({ symbol }) => {
          return symbol === 'MWR_TEST' ? 0 : undefined;
        }
      });

      const portfolioCalculator = portfolioCalculatorFactory.createCalculator({
        activities,
        calculationType: PerformanceCalculationType.MWR,
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
  });

  describe('solver no root', () => {
    it('returns zero when no valid XIRR root exists', async () => {
      jest.useFakeTimers().setSystemTime(parseDate('2027-01-01').getTime());

      const activities: Activity[] = [
        createActivity({
          date: '2025-01-01',
          quantity: 1,
          type: 'BUY',
          unitPrice: 100
        }),
        createActivity({
          date: '2026-01-01',
          quantity: 1,
          type: 'SELL',
          unitPrice: 50
        }),
        createActivity({
          date: '2027-01-01',
          quantity: 1,
          type: 'BUY',
          unitPrice: 100
        })
      ];

      mockMarketPrices({
        currentRateService,
        getMarketPrice: ({ symbol }) => {
          return symbol === 'MWR_TEST' ? 0 : undefined;
        }
      });

      const portfolioCalculator = portfolioCalculatorFactory.createCalculator({
        activities,
        calculationType: PerformanceCalculationType.MWR,
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
  });

  describe('cash flows', () => {
    it('accounts for a partial withdrawal at its transaction date', async () => {
      jest.useFakeTimers().setSystemTime(parseDate('2026-01-01').getTime());

      const activities: Activity[] = [
        createActivity({
          date: '2025-01-01',
          quantity: 10,
          type: 'BUY',
          unitPrice: 100
        }),
        createActivity({
          date: '2025-07-01',
          quantity: 5,
          type: 'SELL',
          unitPrice: 100
        })
      ];

      mockMarketPrices({
        currentRateService,
        getMarketPrice: ({ date, symbol }) => {
          if (symbol !== 'MWR_TEST') {
            return undefined;
          }

          return isSameDay(parseDate('2026-01-01'), date) ? 120 : 100;
        }
      });

      const portfolioCalculator = portfolioCalculatorFactory.createCalculator({
        activities,
        calculationType: PerformanceCalculationType.MWR,
        currency: 'USD',
        usePortfolioSnapshotCache: false,
        userId: userDummyData.id
      });

      const portfolioSnapshot = await portfolioCalculator.computeSnapshot();

      expect(
        portfolioSnapshot.historicalData.at(-1)
          ?.netPerformanceInPercentageWithCurrencyEffect
      ).toBeCloseTo(0.132325784874732, 12);
    });

    it('nets a same-day sell and buy as an internal portfolio transfer', async () => {
      jest.useFakeTimers().setSystemTime(parseDate('2026-01-01').getTime());

      const activities: Activity[] = [
        createActivity({
          date: '2025-01-01',
          name: 'MWR Test Asset A',
          quantity: 10,
          symbol: 'MWR_TEST_A',
          type: 'BUY',
          unitPrice: 100
        }),
        createActivity({
          date: '2025-07-01',
          name: 'MWR Test Asset A',
          quantity: 5,
          symbol: 'MWR_TEST_A',
          type: 'SELL',
          unitPrice: 100
        }),
        createActivity({
          date: '2025-07-01',
          name: 'MWR Test Asset B',
          quantity: 5,
          symbol: 'MWR_TEST_B',
          type: 'BUY',
          unitPrice: 100
        })
      ];

      mockMarketPrices({
        currentRateService,
        getMarketPrice: ({ date, symbol }) => {
          if (!['MWR_TEST_A', 'MWR_TEST_B'].includes(symbol)) {
            return undefined;
          }

          return isSameDay(parseDate('2026-01-01'), date) ? 110 : 100;
        }
      });

      const portfolioCalculator = portfolioCalculatorFactory.createCalculator({
        activities,
        calculationType: PerformanceCalculationType.MWR,
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

    it('calculates the return of a fully closed position from the sell proceeds', async () => {
      jest.useFakeTimers().setSystemTime(parseDate('2026-01-01').getTime());

      const activities: Activity[] = [
        createActivity({
          date: '2025-01-01',
          quantity: 10,
          type: 'BUY',
          unitPrice: 100
        }),
        createActivity({
          date: '2026-01-01',
          quantity: 10,
          type: 'SELL',
          unitPrice: 110
        })
      ];

      mockMarketPrices({
        currentRateService,
        getMarketPrice: ({ symbol }) => {
          return symbol === 'MWR_TEST' ? 110 : undefined;
        }
      });

      const portfolioCalculator = portfolioCalculatorFactory.createCalculator({
        activities,
        calculationType: PerformanceCalculationType.MWR,
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
  });
});
