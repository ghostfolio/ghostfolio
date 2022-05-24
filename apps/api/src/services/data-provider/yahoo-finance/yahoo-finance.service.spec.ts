import { ConfigurationService } from '@ghostfolio/api/services/configuration.service';
import { CryptocurrencyService } from '@ghostfolio/api/services/cryptocurrency/cryptocurrency.service';

import { YahooFinanceService } from './yahoo-finance.service';

jest.mock(
  '@ghostfolio/api/services/cryptocurrency/cryptocurrency.service',
  () => {
    return {
      CryptocurrencyService: jest.fn().mockImplementation(() => {
        return {
          isCryptocurrency: (symbol: string) => {
            switch (symbol) {
              case 'BTCUSD':
                return true;
              case 'DOGEUSD':
                return true;
              default:
                return false;
            }
          }
        };
      })
    };
  }
);

describe('YahooFinanceService', () => {
  let configurationService: ConfigurationService;
  let cryptocurrencyService: CryptocurrencyService;
  let yahooFinanceService: YahooFinanceService;

  beforeAll(async () => {
    configurationService = new ConfigurationService();
    cryptocurrencyService = new CryptocurrencyService();

    yahooFinanceService = new YahooFinanceService(
      configurationService,
      cryptocurrencyService
    );
  });

  it('convertFromYahooFinanceSymbol', async () => {
    expect(
      await yahooFinanceService.convertFromYahooFinanceSymbol('BRK-B')
    ).toEqual('BRK-B');
    expect(
      await yahooFinanceService.convertFromYahooFinanceSymbol('BTC-USD')
    ).toEqual('BTCUSD');
    expect(
      await yahooFinanceService.convertFromYahooFinanceSymbol('EURUSD=X')
    ).toEqual('EURUSD');
  });

  it('convertToYahooFinanceSymbol', async () => {
    expect(
      await yahooFinanceService.convertToYahooFinanceSymbol('BTCUSD')
    ).toEqual('BTC-USD');
    expect(
      await yahooFinanceService.convertToYahooFinanceSymbol('DOGEUSD')
    ).toEqual('DOGE-USD');
    expect(
      await yahooFinanceService.convertToYahooFinanceSymbol('USDCHF')
    ).toEqual('USDCHF=X');
  });
});
