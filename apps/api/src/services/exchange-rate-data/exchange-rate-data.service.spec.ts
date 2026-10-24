import { DataProviderService } from '@ghostfolio/api/services/data-provider/data-provider.service';
import { MarketDataService } from '@ghostfolio/api/services/market-data/market-data.service';
import { parseDate } from '@ghostfolio/common/helper';

import { DataSource } from '@prisma/client';

import { ExchangeRateDataService } from './exchange-rate-data.service';

describe('ExchangeRateDataService', () => {
  const date = parseDate('2026-01-02');
  let exchangeRateDataService: ExchangeRateDataService;

  beforeEach(() => {
    // Only the root currency pairs exist, no derived pairs like USDGBp
    const marketPrices: { [symbol: string]: number } = {
      USDEUR: 0.9,
      USDGBP: 0.8
    };

    exchangeRateDataService = new ExchangeRateDataService(
      {
        getDataSourceForExchangeRates: () => {
          return DataSource.YAHOO;
        }
      } as unknown as DataProviderService,
      {
        get: jest.fn(({ symbol }: { symbol: string }) => {
          return Promise.resolve(
            marketPrices[symbol] ? { marketPrice: marketPrices[symbol] } : null
          );
        })
      } as unknown as MarketDataService,
      null,
      null
    );
  });

  describe('toCurrencyAtDate', () => {
    it('converts a derived currency to its root currency', async () => {
      await expect(
        exchangeRateDataService.toCurrencyAtDate(1000, 'GBp', 'GBP', date)
      ).resolves.toBeCloseTo(10);
    });

    it('converts a root currency to its derived currency', async () => {
      await expect(
        exchangeRateDataService.toCurrencyAtDate(10, 'GBP', 'GBp', date)
      ).resolves.toBeCloseTo(1000);
    });

    it('converts a derived currency indirectly via the root currency', async () => {
      await expect(
        exchangeRateDataService.toCurrencyAtDate(8000, 'GBp', 'EUR', date)
      ).resolves.toBeCloseTo(90);
    });

    it('converts to a derived currency indirectly via the root currency', async () => {
      await expect(
        exchangeRateDataService.toCurrencyAtDate(90, 'EUR', 'GBp', date)
      ).resolves.toBeCloseTo(8000);
    });

    it('keeps the value of the same derived currency', async () => {
      await expect(
        exchangeRateDataService.toCurrencyAtDate(1.15, 'GBp', 'GBp', date)
      ).resolves.toBe(1.15);
    });
  });
});
