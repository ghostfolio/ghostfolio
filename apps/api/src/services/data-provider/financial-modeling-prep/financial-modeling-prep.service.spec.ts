import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';
import { CryptocurrencyService } from '@ghostfolio/api/services/cryptocurrency/cryptocurrency.service';
import { FetchService } from '@ghostfolio/api/services/fetch/fetch.service';
import { PrismaService } from '@ghostfolio/api/services/prisma/prisma.service';

import { FinancialModelingPrepService } from './financial-modeling-prep.service';

jest.mock('@ghostfolio/api/services/fetch/fetch.service', () => {
  return {
    FetchService: jest.fn()
  };
});

describe('FinancialModelingPrepService', () => {
  let fetchService: { fetch: jest.Mock };
  let financialModelingPrepService: FinancialModelingPrepService;

  beforeEach(() => {
    fetchService = {
      fetch: jest.fn().mockResolvedValue({
        json: () =>
          Promise.resolve([
            { close: 100, date: '2024-01-02' },
            { close: 101, date: '2024-01-03' }
          ])
      })
    };

    financialModelingPrepService = new FinancialModelingPrepService(
      {
        get: jest.fn().mockReturnValue(5000)
      } as unknown as ConfigurationService,
      null as unknown as CryptocurrencyService,
      fetchService as unknown as FetchService,
      null as unknown as PrismaService
    );
  });

  describe('getHistorical', () => {
    it('returns the price of a single day when from equals to', async () => {
      const date = new Date('2024-01-02T00:00:00.000Z');

      const result = await financialModelingPrepService.getHistorical({
        from: date,
        symbol: 'AAPL',
        to: date
      });

      expect(result).toEqual({ '2024-01-02': { marketPrice: 100 } });
    });

    it('excludes the end date of a multi-day range', async () => {
      const result = await financialModelingPrepService.getHistorical({
        from: new Date('2024-01-02T00:00:00.000Z'),
        symbol: 'AAPL',
        to: new Date('2024-01-03T00:00:00.000Z')
      });

      expect(result).toEqual({ '2024-01-02': { marketPrice: 100 } });
    });
  });
});
