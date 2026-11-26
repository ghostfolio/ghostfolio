import { DataProviderService } from '@ghostfolio/api/services/data-provider/data-provider.service';
import { MarketDataService } from '@ghostfolio/api/services/market-data/market-data.service';
import { parseDate } from '@ghostfolio/common/helper';

import { DataSource } from '@prisma/client';
import { eachDayOfInterval } from 'date-fns';
import ms from 'ms';

import { ExchangeRateDataService } from './exchange-rate-data.service';

describe('ExchangeRateDataService', () => {
  let exchangeRateDataService: ExchangeRateDataService;
  let getRange: jest.Mock;

  beforeEach(() => {
    getRange = jest.fn().mockResolvedValue([
      { date: parseDate('2026-01-02'), marketPrice: 0.9 },
      { date: parseDate('2026-01-05'), marketPrice: 0.8 }
    ]);

    exchangeRateDataService = new ExchangeRateDataService(
      {
        getDataSourceForExchangeRates: () => {
          return DataSource.YAHOO;
        }
      } as unknown as DataProviderService,
      { getRange } as unknown as MarketDataService,
      null,
      null
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('toCurrencyAtDate', () => {
    it('loads the market data of a currency pair once for all dates', async () => {
      const dates = eachDayOfInterval({
        end: parseDate('2026-01-05'),
        start: parseDate('2026-01-02')
      });

      await Promise.all(
        dates.map((date) => {
          return exchangeRateDataService.toCurrencyAtDate(
            100,
            'USD',
            'EUR',
            date
          );
        })
      );

      expect(getRange).toHaveBeenCalledTimes(1);
    });

    it('converts with the market price of the date', async () => {
      await expect(
        exchangeRateDataService.toCurrencyAtDate(
          100,
          'USD',
          'EUR',
          parseDate('2026-01-05')
        )
      ).resolves.toBeCloseTo(80);
    });

    it('returns undefined for a date without market data', async () => {
      await expect(
        exchangeRateDataService.toCurrencyAtDate(
          100,
          'USD',
          'EUR',
          parseDate('2026-01-03')
        )
      ).resolves.toBeUndefined();
    });

    it('reloads the market data after a minute', async () => {
      const now = Date.now();
      const date = parseDate('2026-01-02');

      await exchangeRateDataService.toCurrencyAtDate(100, 'USD', 'EUR', date);

      jest.spyOn(Date, 'now').mockReturnValue(now + ms('2 minutes'));

      await exchangeRateDataService.toCurrencyAtDate(100, 'USD', 'EUR', date);

      expect(getRange).toHaveBeenCalledTimes(2);
    });
  });
});
