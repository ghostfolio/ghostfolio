import { CurrentRateService } from '@ghostfolio/api/app/core/current-rate.service';
import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data.service';
import { Currency, MarketData } from '@prisma/client';

import { MarketDataService } from './market-data.service';

jest.mock('./market-data.service', () => {
  return {
    MarketDataService: jest.fn().mockImplementation(() => {
      return {
        get: (date: Date, symbol: string) => {
          return Promise.resolve<MarketData>({
            date,
            symbol,
            createdAt: date,
            id: 'aefcbe3a-ee10-4c4f-9f2d-8ffad7b05584',
            marketPrice: 1847.839966
          });
        }
      };
    })
  };
});

jest.mock('../../services/exchange-rate-data.service', () => {
  return {
    ExchangeRateDataService: jest.fn().mockImplementation(() => {
      return {
        initialize: () => Promise.resolve(),
        toCurrency: (value: number) => {
          return 1 * value;
        }
      };
    })
  };
});

describe('CurrentRateService', () => {
  let currentRateService: CurrentRateService;
  let exchangeRateDataService: ExchangeRateDataService;
  let marketDataService: MarketDataService;

  beforeAll(async () => {
    exchangeRateDataService = new ExchangeRateDataService(null);
    marketDataService = new MarketDataService(null);

    await exchangeRateDataService.initialize();

    currentRateService = new CurrentRateService(
      exchangeRateDataService,
      marketDataService
    );
  });

  it('getValue', async () => {
    expect(
      await currentRateService.getValue({
        currency: Currency.USD,
        date: new Date(Date.UTC(2020, 0, 1, 0, 0, 0)),
        symbol: 'AMZN',
        userCurrency: Currency.CHF
      })
    ).toEqual(1847.839966);
  });
});
