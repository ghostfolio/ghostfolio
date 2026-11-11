import { ActivitiesModule } from '@ghostfolio/api/services/activities/activities.module';
import { ActivitiesService } from '@ghostfolio/api/services/activities/activities.service';
import { DataProviderModule } from '@ghostfolio/api/services/data-provider/data-provider.module';
import { DataProviderService } from '@ghostfolio/api/services/data-provider/data-provider.service';
import { MarketDataModule } from '@ghostfolio/api/services/market-data/market-data.module';
import { MarketDataService } from '@ghostfolio/api/services/market-data/market-data.service';
import { SymbolModule } from '@ghostfolio/api/services/symbol/symbol.module';
import { SymbolService } from '@ghostfolio/api/services/symbol/symbol.service';
import { Activity, Filter } from '@ghostfolio/common/interfaces';
import { AssetSubClass } from '@ghostfolio/prisma/browser';

import { Test } from '@nestjs/testing';
import { DataSource } from '@prisma/client';

import { ActivityMatchedBenchmarkModule } from './activity-matched-benchmark.module';
import {
  ActivityMatchedBenchmarkInput,
  ActivityMatchedBenchmarkService
} from './activity-matched-benchmark.service';
import { runActivityMatchedBenchmarkPipeline } from './prototype/activity-matched-benchmark.pipeline';
import * as displayAdapter from './prototype/benchmark-display-valuation.adapter';
import { BenchmarkFxMarketDataProvider } from './prototype/benchmark-fx-market-data.provider';
import { BenchmarkMarketDataProvider } from './prototype/benchmark-market-data.provider';

// Isolate infrastructure module imports as well as their providers. Loading the
// real application graph would pull in unrelated network clients and ESM SDKs.
jest.mock('@ghostfolio/api/services/activities/activities.module', () => ({
  ActivitiesModule: class ActivitiesModule {}
}));
jest.mock('@ghostfolio/api/services/symbol/symbol.module', () => ({
  SymbolModule: class SymbolModule {}
}));
jest.mock('@ghostfolio/api/services/market-data/market-data.module', () => ({
  MarketDataModule: class MarketDataModule {}
}));
jest.mock(
  '@ghostfolio/api/services/data-provider/data-provider.module',
  () => ({
    DataProviderModule: class DataProviderModule {}
  })
);

function activity(
  date: string,
  value = 100,
  type: Activity['type'] = 'BUY'
): Activity {
  return {
    id: `${date}-${type}`,
    type,
    date: new Date(`${date}T00:00:00Z`),
    valueInBaseCurrency: value,
    assetProfile: { assetSubClass: AssetSubClass.ETF }
  } as Activity;
}

describe('ActivityMatchedBenchmarkService', () => {
  let service: ActivityMatchedBenchmarkService;
  const getActivitiesForPortfolioCalculator = jest.fn();
  const get = jest.fn();
  const getHistoricalPrices = jest.fn();
  const getHistoricalFxQuotes = jest.fn();
  const filters: Filter[] = [
    { type: 'ACCOUNT', id: 'selected-account' },
    { type: 'TAG', id: 'selected-tag' }
  ];
  const prices = [
    { date: '2025-01-10', price: '10' },
    { date: '2025-01-15', price: '12' },
    { date: '2025-01-20', price: '15' }
  ];
  const activities = [activity('2025-01-10'), activity('2025-01-15', 60)];
  const input = (
    overrides: Partial<ActivityMatchedBenchmarkInput> = {}
  ): ActivityMatchedBenchmarkInput => ({
    userId: 'authenticated-user',
    filters,
    dataSource: DataSource.YAHOO,
    symbol: 'SPY',
    currency: 'EUR',
    valuationDates: [
      '2025-01-10',
      '2025-01-12',
      '2025-01-15',
      '2025-01-17',
      '2025-01-20'
    ],
    start: '2025-01-10',
    end: '2025-01-20',
    method: 'ROI',
    ...overrides
  });

  beforeEach(async () => {
    jest.resetAllMocks();
    get.mockResolvedValue({ currency: 'EUR' });
    getActivitiesForPortfolioCalculator.mockResolvedValue({
      activities,
      count: activities.length
    });
    getHistoricalPrices.mockResolvedValue({
      prices,
      excludedCarriedForward: 0,
      excludedIntraday: 0
    });
    getHistoricalFxQuotes.mockResolvedValue([]);
    const module = await Test.createTestingModule({
      providers: [
        ActivityMatchedBenchmarkService,
        {
          provide: ActivitiesService,
          useValue: { getActivitiesForPortfolioCalculator }
        },
        { provide: SymbolService, useValue: { get } },
        {
          provide: BenchmarkMarketDataProvider,
          useValue: { getHistoricalPrices }
        },
        {
          provide: BenchmarkFxMarketDataProvider,
          useValue: { getHistoricalFxQuotes }
        }
      ]
    }).compile();
    service = module.get(ActivityMatchedBenchmarkService);
  });

  afterEach(() => jest.restoreAllMocks());

  it('resolves the isolated module with real historical providers and exported service', async () => {
    const module = await Test.createTestingModule({
      imports: [ActivityMatchedBenchmarkModule]
    })
      .overrideModule(ActivitiesModule)
      .useModule({
        module: class ActivitiesStub {},
        providers: [
          {
            provide: ActivitiesService,
            useValue: { getActivitiesForPortfolioCalculator }
          }
        ],
        exports: [ActivitiesService]
      })
      .overrideModule(SymbolModule)
      .useModule({
        module: class SymbolStub {},
        providers: [{ provide: SymbolService, useValue: { get } }],
        exports: [SymbolService]
      })
      .overrideModule(MarketDataModule)
      .useModule({
        module: class MarketDataStub {},
        providers: [
          {
            provide: MarketDataService,
            useValue: { marketDataItems: jest.fn() }
          }
        ],
        exports: [MarketDataService]
      })
      .overrideModule(DataProviderModule)
      .useModule({
        module: class DataProviderStub {},
        providers: [
          {
            provide: DataProviderService,
            useValue: { getDataSourceForExchangeRates: jest.fn() }
          }
        ],
        exports: [DataProviderService]
      })
      .compile();
    expect(module.get(ActivityMatchedBenchmarkService)).toBeInstanceOf(
      ActivityMatchedBenchmarkService
    );
    expect(module.get(BenchmarkMarketDataProvider)).toBeInstanceOf(
      BenchmarkMarketDataProvider
    );
    expect(module.get(BenchmarkFxMarketDataProvider)).toBeInstanceOf(
      BenchmarkFxMarketDataProvider
    );
    expect(
      Reflect.getMetadata('exports', ActivityMatchedBenchmarkModule)
    ).toEqual([ActivityMatchedBenchmarkService]);
    await module.close();
  });

  it.each([
    ['ROI', 40.625],
    ['ROAI', 48.97260273972603]
  ] as const)(
    'orchestrates %s with real financial functions',
    async (method, finalReturn) => {
      const response = await service.getMarketDataForUser(input({ method }));
      expect(Object.keys(response)).toEqual(['marketData']);
      expect(response.marketData.map(({ date }) => date)).toEqual(
        input().valuationDates
      );
      expect(response.marketData[0].value).toBe(0);
      expect(response.marketData.at(-1)?.value).toBeCloseTo(finalReturn, 10);
      expect(get).toHaveBeenCalledWith({
        dataGatheringItem: { dataSource: DataSource.YAHOO, symbol: 'SPY' }
      });
      expect(getHistoricalPrices).toHaveBeenCalledTimes(1);
      expect(getHistoricalFxQuotes).toHaveBeenCalledTimes(1);
    }
  );

  it('converts a foreign-currency benchmark using independent historical FX for display dates', async () => {
    get.mockResolvedValue({ currency: 'USD' });
    getActivitiesForPortfolioCalculator.mockResolvedValue({
      activities: [activity('2025-01-10', 90)]
    });
    getHistoricalPrices.mockResolvedValue({
      prices: [
        { date: '2025-01-10', price: '100' },
        { date: '2025-01-13', price: '110' }
      ]
    });
    getHistoricalFxQuotes.mockResolvedValue(
      [
        { date: '2025-01-10', rate: '0.9' },
        { date: '2025-01-11', rate: '0.91' },
        { date: '2025-01-12', rate: '0.92' },
        { date: '2025-01-13', rate: '0.93' }
      ].map((quote) => ({ ...quote, currencyFrom: 'USD', currencyTo: 'EUR' }))
    );
    const { marketData } = await service.getMarketDataForUser(
      input({
        end: '2025-01-13',
        valuationDates: ['2025-01-10', '2025-01-11', '2025-01-12', '2025-01-13']
      })
    );
    marketData.forEach(({ value }, i) =>
      expect(value).toBeCloseTo(
        [0, 100 / 90, 200 / 90, (100 * 12.3) / 90][i],
        10
      )
    );
    expect(getHistoricalFxQuotes).toHaveBeenCalledWith({
      currencyFrom: 'USD',
      currencyTo: 'EUR',
      startDate: new Date('2025-01-10T00:00:00Z'),
      endDate: new Date('2025-01-13T00:00:00Z')
    });
  });

  it.each([{ valuationDates: [] }, { valuationDates: ['2024-12-01'] }])(
    'returns an empty chart without dependency queries for %j',
    async ({ valuationDates }) => {
      expect(
        await service.getMarketDataForUser(input({ valuationDates }))
      ).toEqual({ marketData: [] });
      for (const mock of [
        get,
        getActivitiesForPortfolioCalculator,
        getHistoricalPrices,
        getHistoricalFxQuotes
      ])
        expect(mock).not.toHaveBeenCalled();
    }
  );

  it.each([
    { symbol: '' },
    { currency: 'not-currency' },
    { start: '2025-02-30' },
    { end: '2024-01-01' },
    { valuationDates: ['invalid'] },
    { userId: '' },
    { method: 'TWR' as 'ROI' },
    { dataSource: 'invalid' as DataSource }
  ])(
    'rejects invalid input before querying dependencies: %j',
    async (overrides) => {
      await expect(
        service.getMarketDataForUser(input(overrides))
      ).rejects.toThrow();
      expect(get).not.toHaveBeenCalled();
      expect(getActivitiesForPortfolioCalculator).not.toHaveBeenCalled();
      expect(getHistoricalPrices).not.toHaveBeenCalled();
      expect(getHistoricalFxQuotes).not.toHaveBeenCalled();
    }
  );

  it('rejects a missing benchmark symbol', async () => {
    get.mockResolvedValue(undefined);
    await expect(service.getMarketDataForUser(input())).rejects.toThrow(
      'Missing benchmark symbol: SPY'
    );
    expect(getActivitiesForPortfolioCalculator).not.toHaveBeenCalled();
    expect(getHistoricalPrices).not.toHaveBeenCalled();
  });

  it.each([undefined, 'unknown'])(
    'rejects missing or invalid benchmark currency %s',
    async (currency) => {
      get.mockResolvedValue({ currency });
      await expect(service.getMarketDataForUser(input())).rejects.toThrow(
        'Invalid benchmark currency: SPY'
      );
      expect(getActivitiesForPortfolioCalculator).not.toHaveBeenCalled();
    }
  );

  it('does not fund benchmark units from dividends, interest or cash activities', async () => {
    getActivitiesForPortfolioCalculator.mockResolvedValue({
      activities: [
        activity('2025-01-10', 10, 'DIVIDEND'),
        activity('2025-01-10', 10, 'INTEREST'),
        {
          ...activity('2025-01-10'),
          assetProfile: { assetSubClass: AssetSubClass.CASH }
        }
      ]
    });
    expect(await service.getMarketDataForUser(input())).toEqual({
      marketData: []
    });
    expect(getHistoricalPrices).not.toHaveBeenCalled();
    expect(getHistoricalFxQuotes).not.toHaveBeenCalled();
  });

  it.each([
    activity('2025-01-10', -1),
    { ...activity('2025-01-10'), date: new Date(NaN) }
  ])('preserves invalid activity funding rejection', async (invalid) => {
    getActivitiesForPortfolioCalculator.mockResolvedValue({
      activities: [invalid]
    });
    await expect(service.getMarketDataForUser(input())).rejects.toThrow(
      'Invalid activity funding'
    );
    expect(getHistoricalPrices).not.toHaveBeenCalled();
    expect(getHistoricalFxQuotes).not.toHaveBeenCalled();
  });

  it('loads BUY history before the chart baseline and normalizes to that baseline', async () => {
    const response = await service.getMarketDataForUser(
      input({
        start: '2025-01-12',
        valuationDates: ['2025-01-12', '2025-01-17', '2025-01-20']
      })
    );
    expect(getHistoricalPrices).toHaveBeenCalledWith({
      dataSource: DataSource.YAHOO,
      symbol: 'SPY',
      startDate: new Date('2025-01-10T00:00:00Z'),
      endDate: new Date('2025-01-20T00:00:00Z')
    });
    expect(response.marketData[0].value).toBe(0);
    expect(response.marketData.at(-1)?.value).toBe(40.625);
  });

  it('includes FX history for the preceding original price returned by the price provider', async () => {
    getHistoricalPrices.mockResolvedValue({
      prices: [{ date: '2025-01-09', price: '10' }, ...prices]
    });
    await service.getMarketDataForUser(input());
    expect(getHistoricalFxQuotes).toHaveBeenCalledWith(
      expect.objectContaining({ startDate: new Date('2025-01-09T00:00:00Z') })
    );
    expect(getHistoricalPrices).toHaveBeenCalledTimes(1);
  });

  it('rejects missing historical execution prices rather than inventing one', async () => {
    getHistoricalPrices.mockResolvedValue({ prices: prices.slice(1) });
    await expect(service.getMarketDataForUser(input())).rejects.toThrow(
      'Missing historical price: 2025-01-10'
    );
  });

  it('propagates missing historical FX instead of substituting a current rate', async () => {
    get.mockResolvedValue({ currency: 'USD' });
    await expect(service.getMarketDataForUser(input())).rejects.toThrow(
      'Missing FX rate: USDEUR 2025-01-10'
    );
  });

  it('rejects a display valuation whose currency differs from the simulation currency', async () => {
    const create = displayAdapter.createBenchmarkDisplayValuations;
    jest
      .spyOn(displayAdapter, 'createBenchmarkDisplayValuations')
      .mockImplementation((args) =>
        create(args).map((valuation) => ({ ...valuation, currency: 'USD' }))
      );
    await expect(service.getMarketDataForUser(input())).rejects.toThrow(
      'Display currency mismatch: 2025-01-12'
    );
    expect(
      displayAdapter.createBenchmarkDisplayValuations
    ).toHaveBeenCalledWith(expect.objectContaining({ currencyTo: 'EUR' }));
  });

  it('propagates stale execution price errors', async () => {
    getActivitiesForPortfolioCalculator.mockResolvedValue({
      activities: [activity('2025-01-18')]
    });
    getHistoricalPrices.mockResolvedValue({
      prices: [{ date: '2025-01-10', price: '10' }]
    });
    await expect(service.getMarketDataForUser(input())).rejects.toThrow(
      'Stale execution price: 2025-01-18'
    );
  });

  it('propagates stale historical FX errors', async () => {
    get.mockResolvedValue({ currency: 'USD' });
    getHistoricalFxQuotes.mockResolvedValue([
      { currencyFrom: 'USD', currencyTo: 'EUR', date: '2025-01-02', rate: '1' }
    ]);
    await expect(service.getMarketDataForUser(input())).rejects.toThrow(
      'Stale FX rate: USDEUR 2025-01-10'
    );
  });

  it('passes only the authenticated user and selected filters with exclusion defaults intact', async () => {
    const before = JSON.stringify(filters);
    await service.getMarketDataForUser(input());
    expect(getActivitiesForPortfolioCalculator.mock.calls).toEqual([
      [
        {
          userId: 'authenticated-user',
          filters,
          userCurrency: 'EUR',
          withCash: false
        }
      ]
    ]);
    expect(JSON.stringify(filters)).toBe(before);
  });

  it('ignores activities after the selected end without changing the input activities', async () => {
    const supplied = [...activities, activity('2025-01-25')];
    const before = JSON.stringify(supplied);
    getActivitiesForPortfolioCalculator.mockResolvedValue({
      activities: supplied
    });
    expect(
      (await service.getMarketDataForUser(input())).marketData.at(-1)?.value
    ).toBe(40.625);
    expect(JSON.stringify(supplied)).toBe(before);
  });

  it.each(['ROI', 'ROAI'] as const)(
    'preserves financial results with additional display dates for %s',
    async (method) => {
      const reference = runActivityMatchedBenchmarkPipeline({
        activities,
        currency: 'EUR',
        benchmarkCurrency: 'EUR',
        prices,
        fxQuotes: [],
        valuationDates: [],
        start: input().start,
        end: input().end,
        method
      });
      const before = JSON.stringify(reference);
      const dense = await service.getMarketDataForUser(input({ method }));
      const sparse = await service.getMarketDataForUser(
        input({ method, valuationDates: prices.map(({ date }) => date) })
      );
      const expected = reference.performance.map(
        ({ date, returnFraction }) => ({
          date,
          value: returnFraction.mul(100).toNumber()
        })
      );
      expect(sparse.marketData).toEqual(expected);
      expect(
        dense.marketData.filter(({ date }) =>
          prices.some((price) => price.date === date)
        )
      ).toEqual(expected);
      expect(JSON.stringify(reference)).toBe(before);
    }
  );

  describe('Temporal contract qualification', () => {
    it.each([
      ['ROI', 25],
      ['ROAI', 30]
    ] as const)(
      'scenario A: normalizes %s at the first chart date after start',
      async (method, expectedReturn) => {
        const supplied = [activity('2025-01-01'), activity('2025-01-08', 60)];
        getActivitiesForPortfolioCalculator.mockResolvedValue({
          activities: supplied
        });
        getHistoricalPrices.mockResolvedValue({
          prices: [
            { date: '2025-01-01', price: '10' },
            { date: '2025-01-04', price: '12' },
            { date: '2025-01-08', price: '12' },
            { date: '2025-01-10', price: '15' }
          ]
        });
        const valuations = jest.spyOn(
          displayAdapter,
          'createBenchmarkDisplayValuations'
        );
        const valuationDates = [
          '2025-01-05',
          '2025-01-06',
          '2025-01-08',
          '2025-01-10'
        ];
        const response = await service.getMarketDataForUser(
          input({
            method,
            start: '2025-01-03',
            end: '2025-01-10',
            valuationDates
          })
        );
        // BUY 100 at 10 precedes start; baseline V=120, C=100, opening gain=20.
        // A BUY 60 at 12 adds 5 units on Jan 8. Final period gain=225-160-20=45.
        // ROI capital=120+60=180 => 25%.
        // ROAI capital=(3*120+2*180+180)/6=150 => 30% (endpoint day included).
        expect(response).toEqual({
          marketData: valuationDates.map((date, i) => ({
            date,
            value: i === 3 ? expectedReturn : 0
          }))
        });
        const baseline = valuations.mock.calls[0][0].points.find(
          ({ date }) => date === valuationDates[0]
        );
        expect(baseline.displayOnly).toBe(true);
        expect(baseline.units.toString()).toBe('10');
        expect(baseline.costBasis.toString()).toBe('100');
        expect(baseline.contributions.toString()).toBe('100');
        expect(baseline.realizedGain.toString()).toBe('0');
        expect(getHistoricalPrices).toHaveBeenCalledWith({
          dataSource: DataSource.YAHOO,
          symbol: 'SPY',
          startDate: new Date('2025-01-01T00:00:00Z'),
          endDate: new Date('2025-01-10T00:00:00Z')
        });
      }
    );

    it.each(['ROI', 'ROAI'] as const)(
      'scenario B: excludes later activities from earlier %s chart returns',
      async (method) => {
        getActivitiesForPortfolioCalculator.mockResolvedValue({
          activities: [...activities, activity('2025-01-19', 120)]
        });
        getHistoricalPrices.mockResolvedValue({
          prices: [
            ...prices.slice(0, 2),
            { date: '2025-01-19', price: '12' },
            prices[2]
          ]
        });
        const valuations = jest.spyOn(
          displayAdapter,
          'createBenchmarkDisplayValuations'
        );
        const valuationDates = [
          '2025-01-10',
          '2025-01-12',
          '2025-01-15',
          '2025-01-17'
        ];
        const request = input({ method, valuationDates });
        const response = await service.getMarketDataForUser(request);
        expect(response.marketData.map(({ date }) => date)).toEqual(
          valuationDates
        );
        // The Jan 19 BUY is after the last chart observation, but before end=Jan 20.
        // On Jan 15/17 the period gain remains 20, ROI capital=160.
        // ROAI capitals: (5*100+160)/6=110 and (5*100+2*160+160)/8=122.5.
        const expected =
          method === 'ROI' ? [0, 0, 12.5, 12.5] : [0, 0, 200 / 11, 800 / 49];
        response.marketData.forEach(({ value }, i) =>
          expect(value).toBeCloseTo(expected[i], 10)
        );
        const points = valuations.mock.calls[0][0].points;
        expect(
          points
            .find(({ date }) => date === '2025-01-17')
            .contributions.toString()
        ).toBe('160');
        expect(
          points
            .find(({ date }) => date === '2025-01-19')
            .contributions.toString()
        ).toBe('280');
        expect(
          points.find(({ date }) => date === '2025-01-19').units.toString()
        ).toBe('25');
        getActivitiesForPortfolioCalculator.mockResolvedValue({ activities });
        expect(await service.getMarketDataForUser(request)).toEqual(response);
        for (const [query] of getHistoricalPrices.mock.calls) {
          expect(query.startDate).toEqual(new Date('2025-01-10T00:00:00Z'));
          expect(query.endDate).toEqual(new Date('2025-01-20T00:00:00Z'));
        }
      }
    );
  });
});
