import { DataProviderService } from '@ghostfolio/api/services/data-provider/data-provider.service';
import { MarketDataService } from '@ghostfolio/api/services/market-data/market-data.service';

import { eachDayOfInterval } from 'date-fns';

import { ExchangeRateDataService } from './exchange-rate-data.service';

const startDate = new Date(Date.UTC(2022, 7, 9)); // 2022-08-09
const endDate = new Date(Date.UTC(2022, 7, 18)); // 2022-08-18

// Build an ExchangeRateDataService whose market data has full USDEUR coverage and
// the given USDBRL coverage, and no direct BRLEUR series (forcing the indirect
// calculation that derives BRLEUR from USDBRL and USDEUR).
function createService(
  usdBrlMarketData: { date: Date; marketPrice: number }[]
) {
  const marketDataService = {
    getRange: jest.fn(async ({ assetProfileIdentifiers }) => {
      const { symbol } = assetProfileIdentifiers[0];

      if (symbol === 'USDBRL') {
        return usdBrlMarketData;
      }

      if (symbol === 'USDEUR') {
        return eachDayOfInterval({ end: endDate, start: startDate }).map(
          (date) => {
            return { date, marketPrice: 0.98 };
          }
        );
      }

      return [];
    })
  } as unknown as MarketDataService;

  const dataProviderService = {
    getDataSourceForExchangeRates: () => 'YAHOO'
  } as unknown as DataProviderService;

  return new ExchangeRateDataService(
    dataProviderService,
    marketDataService,
    null,
    null
  );
}

async function getBrlEurRates(
  exchangeRateDataService: ExchangeRateDataService
) {
  const result = await exchangeRateDataService.getExchangeRatesByCurrency({
    currencies: ['BRL'],
    endDate,
    startDate,
    targetCurrency: 'EUR'
  });

  return result['BRLEUR'];
}

describe('ExchangeRateDataService', () => {
  describe('getExchangeRatesByCurrency (indirect calculation)', () => {
    it('back-fills a leading gap (data gathered only from a later date)', async () => {
      // USDBRL is gathered only from 2022-08-16, leaving 2022-08-09..2022-08-15
      // uncovered — the case that produced the reported error.
      const exchangeRateDataService = createService([
        { date: new Date(Date.UTC(2022, 7, 16)), marketPrice: 5.0956 },
        { date: new Date(Date.UTC(2022, 7, 17)), marketPrice: 5.1417 },
        { date: new Date(Date.UTC(2022, 7, 18)), marketPrice: 5.165 }
      ]);

      const errorSpy = jest
        .spyOn((exchangeRateDataService as any).logger, 'error')
        .mockImplementation(() => undefined);

      const rates = await getBrlEurRates(exchangeRateDataService);

      expect(errorSpy).not.toHaveBeenCalled();
      expect(Object.values(rates).length).toBeGreaterThan(0);
      expect(Object.values(rates).every((rate) => Number.isFinite(rate))).toBe(
        true
      );

      errorSpy.mockRestore();
    });

    it('carries forward across a trailing gap (latest dates not yet gathered)', async () => {
      // USDBRL stops at 2022-08-11, leaving 2022-08-12..2022-08-18 uncovered.
      const exchangeRateDataService = createService([
        { date: new Date(Date.UTC(2022, 7, 9)), marketPrice: 5.12 },
        { date: new Date(Date.UTC(2022, 7, 10)), marketPrice: 5.1 },
        { date: new Date(Date.UTC(2022, 7, 11)), marketPrice: 5.15 }
      ]);

      const errorSpy = jest
        .spyOn((exchangeRateDataService as any).logger, 'error')
        .mockImplementation(() => undefined);

      const rates = await getBrlEurRates(exchangeRateDataService);

      expect(errorSpy).not.toHaveBeenCalled();
      expect(Object.values(rates).every((rate) => Number.isFinite(rate))).toBe(
        true
      );

      errorSpy.mockRestore();
    });

    it('still reports an error when the pair has no data at all', async () => {
      // Nothing to carry from — the genuine "please provide market data" case
      // must keep logging, so the fix stays surgical.
      const exchangeRateDataService = createService([]);

      const errorSpy = jest
        .spyOn((exchangeRateDataService as any).logger, 'error')
        .mockImplementation(() => undefined);

      await getBrlEurRates(exchangeRateDataService);

      expect(errorSpy).toHaveBeenCalled();

      errorSpy.mockRestore();
    });
  });
});
