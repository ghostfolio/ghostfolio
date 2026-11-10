import { DataProviderService } from '@ghostfolio/api/services/data-provider/data-provider.service';

import { BenchmarkFxMarketDataProvider } from './benchmark-fx-market-data.provider';
import { convertBenchmarkPrices } from './benchmark-fx.adapter';
import { BenchmarkMarketDataProvider } from './benchmark-market-data.provider';

describe('Benchmark FX historical MarketData provider', () => {
  const getDataSourceForExchangeRates = jest.fn();
  const getHistoricalPrices = jest.fn();

  const provider = new BenchmarkFxMarketDataProvider(
    {
      getDataSourceForExchangeRates
    } as unknown as DataProviderService,
    {
      getHistoricalPrices
    } as unknown as BenchmarkMarketDataProvider
  );

  const startDate = new Date('2025-01-10T00:00:00Z');
  const endDate = new Date('2025-01-15T00:00:00Z');

  beforeEach(() => {
    getDataSourceForExchangeRates.mockReset();
    getHistoricalPrices.mockReset();

    getDataSourceForExchangeRates.mockReturnValue('YAHOO');

    getHistoricalPrices.mockImplementation(async ({ symbol }) => ({
      prices:
        symbol === 'GBPEUR' ? [{ date: '2025-01-10', price: '1.15' }] : [],
      excludedCarriedForward: 0,
      excludedIntraday: 0
    }));
  });

  it('does not query MarketData for identical currencies', async () => {
    const result = await provider.getHistoricalFxQuotes({
      currencyFrom: 'EUR',
      currencyTo: 'EUR',
      startDate,
      endDate
    });

    expect(result).toEqual([]);
    expect(getHistoricalPrices).not.toHaveBeenCalled();
    expect(getDataSourceForExchangeRates).not.toHaveBeenCalled();
  });

  it('does not query MarketData for derived currencies sharing a root', async () => {
    const result = await provider.getHistoricalFxQuotes({
      currencyFrom: 'GBP',
      currencyTo: 'GBp',
      startDate,
      endDate
    });

    expect(result).toEqual([]);
    expect(getHistoricalPrices).not.toHaveBeenCalled();
  });

  it('rejects invalid dates even for identical currencies', async () => {
    await expect(
      provider.getHistoricalFxQuotes({
        currencyFrom: 'EUR',
        currencyTo: 'EUR',
        startDate: new Date(NaN),
        endDate
      })
    ).rejects.toThrow('Invalid benchmark date range');

    expect(getHistoricalPrices).not.toHaveBeenCalled();
    expect(getDataSourceForExchangeRates).not.toHaveBeenCalled();
  });

  it('rejects reversed ranges for derived currencies', async () => {
    await expect(
      provider.getHistoricalFxQuotes({
        currencyFrom: 'GBP',
        currencyTo: 'GBp',
        startDate: endDate,
        endDate: startDate
      })
    ).rejects.toThrow('Reversed benchmark date range');

    expect(getHistoricalPrices).not.toHaveBeenCalled();
  });

  it('rejects invalid dates before retrieving FX market data', async () => {
    await expect(
      provider.getHistoricalFxQuotes({
        currencyFrom: 'GBP',
        currencyTo: 'EUR',
        startDate,
        endDate: new Date(NaN)
      })
    ).rejects.toThrow('Invalid benchmark date range');

    expect(getHistoricalPrices).not.toHaveBeenCalled();
    expect(getDataSourceForExchangeRates).not.toHaveBeenCalled();
  });

  it('uses the configured FX data source', async () => {
    await provider.getHistoricalFxQuotes({
      currencyFrom: 'GBP',
      currencyTo: 'EUR',
      startDate,
      endDate
    });

    expect(getDataSourceForExchangeRates).toHaveBeenCalledTimes(1);

    expect(getHistoricalPrices).toHaveBeenCalledWith(
      expect.objectContaining({
        dataSource: 'YAHOO',
        symbol: 'GBPEUR',
        startDate,
        endDate
      })
    );
  });

  it('retrieves all six candidate pairs for GBP to EUR', async () => {
    await provider.getHistoricalFxQuotes({
      currencyFrom: 'GBP',
      currencyTo: 'EUR',
      startDate,
      endDate
    });

    expect(
      getHistoricalPrices.mock.calls.map(([input]) => input.symbol)
    ).toEqual(['GBPEUR', 'EURGBP', 'USDGBP', 'GBPUSD', 'USDEUR', 'EURUSD']);
  });

  it('preserves original FX quotation dates and values', async () => {
    const result = await provider.getHistoricalFxQuotes({
      currencyFrom: 'GBP',
      currencyTo: 'EUR',
      startDate,
      endDate
    });

    expect(result).toEqual([
      {
        currencyFrom: 'GBP',
        currencyTo: 'EUR',
        date: '2025-01-10',
        rate: '1.15'
      }
    ]);
  });

  it('integrates with the historical FX converter', async () => {
    const fxQuotes = await provider.getHistoricalFxQuotes({
      currencyFrom: 'GBP',
      currencyTo: 'EUR',
      startDate,
      endDate
    });

    const result = convertBenchmarkPrices({
      prices: [{ date: '2025-01-12', price: '100' }],
      currencyFrom: 'GBP',
      currencyTo: 'EUR',
      fxQuotes
    });

    expect(result.prices[0].price).toBe('115');
    expect(result.conversions[0].components[0]).toEqual({
      pair: 'GBPEUR',
      sourceDate: '2025-01-10',
      ageInDays: 2,
      rate: '1.15',
      kind: 'MARKET'
    });
  });

  it('propagates historical data retrieval errors', async () => {
    getHistoricalPrices.mockRejectedValue(new Error('MarketData unavailable'));

    await expect(
      provider.getHistoricalFxQuotes({
        currencyFrom: 'GBP',
        currencyTo: 'EUR',
        startDate,
        endDate
      })
    ).rejects.toThrow('MarketData unavailable');
  });
});
