import { DataSource } from '@prisma/client';

import { BenchmarksService } from './benchmarks.service';

describe('BenchmarksService', () => {
  it('forward-fills non-trading days and uses the live quote for the end date', async () => {
    const fridayCloseDate = new Date(2021, 4, 28);
    const saturdayDate = new Date(2021, 4, 29);
    const sundayDate = new Date(2021, 4, 30);

    const benchmarkService = {
      calculateChangeInPercentage: (startValue: number, endValue: number) => {
        return endValue / startValue - 1;
      }
    };
    const exchangeRateDataService = {
      getExchangeRatesByCurrency: jest.fn().mockResolvedValue({
        USDUSD: {
          '2021-05-29': 1,
          '2021-05-30': 1
        }
      })
    };
    const marketDataService = {
      marketDataItems: jest
        .fn()
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          {
            date: fridayCloseDate,
            marketPrice: 100
          }
        ])
    };
    const portfolioService = {
      getPerformance: jest.fn().mockResolvedValue({
        chart: [{ date: '2021-05-29' }, { date: '2021-05-30' }]
      })
    };
    const prismaService = {
      symbolProfile: {
        findFirst: jest.fn().mockResolvedValue({ currency: 'USD' })
      }
    };
    const symbolService = {
      get: jest.fn().mockResolvedValue({ marketPrice: 110 })
    };
    const service = new BenchmarksService(
      benchmarkService as never,
      exchangeRateDataService as never,
      marketDataService as never,
      portfolioService as never,
      prismaService as never,
      symbolService as never
    );

    const { marketData } = await service.getMarketDataForUser({
      dataSource: DataSource.YAHOO,
      dateRange: 'max',
      endDate: sundayDate,
      impersonationId: undefined,
      startDate: saturdayDate,
      symbol: 'SPY',
      user: {
        id: 'user-id',
        settings: { settings: { baseCurrency: 'USD' } }
      } as never
    });

    expect(marketData).toHaveLength(2);
    expect(marketData[0]).toEqual({ date: '2021-05-29', value: 0 });
    expect(marketData[1].date).toBe('2021-05-30');
    expect(marketData[1].value).toBeCloseTo(10);
    expect(
      exchangeRateDataService.getExchangeRatesByCurrency
    ).toHaveBeenCalledWith({
      currencies: ['USD'],
      endDate: new Date(Date.UTC(2021, 4, 30)),
      startDate: new Date(Date.UTC(2021, 4, 29)),
      targetCurrency: 'USD'
    });
  });
});
