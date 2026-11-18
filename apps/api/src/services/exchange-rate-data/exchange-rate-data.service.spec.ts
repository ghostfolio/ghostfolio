import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.service';

import { Logger } from '@nestjs/common';

describe('ExchangeRateDataService.toCurrencyAtDate (#6482)', () => {
  let exchangeRateDataService: ExchangeRateDataService;

  beforeEach(() => {
    exchangeRateDataService = new ExchangeRateDataService(
      null,
      null,
      null,
      null
    );

    // Avoid currency-pair shortcut paths; force the historical lookup branch.
    (exchangeRateDataService as any).derivedCurrencyFactors = {};
    (exchangeRateDataService as any).dataProviderService = {
      getDataSourceForExchangeRates: () => 'YAHOO'
    };
    (exchangeRateDataService as any).marketDataService = {
      get: jest.fn().mockResolvedValue(null)
    };

    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns 0 instead of undefined when no historical exchange rate exists', async () => {
    const result = await exchangeRateDataService.toCurrencyAtDate(
      100,
      'USD',
      'EUR',
      new Date('2021-04-15')
    );

    expect(result).toBe(0);
  });
});
