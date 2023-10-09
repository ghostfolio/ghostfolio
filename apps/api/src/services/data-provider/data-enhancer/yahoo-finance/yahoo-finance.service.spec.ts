import { CryptocurrencyService } from '@ghostfolio/api/services/cryptocurrency/cryptocurrency.service';

import { YahooFinanceDataEnhancerService } from './yahoo-finance.service';

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

describe('YahooFinanceDataEnhancerService', () => {
  let cryptocurrencyService: CryptocurrencyService;
  let yahooFinanceDataEnhancerService: YahooFinanceDataEnhancerService;

  beforeAll(async () => {
    cryptocurrencyService = new CryptocurrencyService();

    yahooFinanceDataEnhancerService = new YahooFinanceDataEnhancerService(
      cryptocurrencyService
    );
  });

  it('convertFromYahooFinanceSymbol', async () => {
    expect(
      await yahooFinanceDataEnhancerService.convertFromYahooFinanceSymbol(
        'BRK-B'
      )
    ).toEqual('BRK-B');
    expect(
      await yahooFinanceDataEnhancerService.convertFromYahooFinanceSymbol(
        'BTC-USD'
      )
    ).toEqual('BTCUSD');
    expect(
      await yahooFinanceDataEnhancerService.convertFromYahooFinanceSymbol(
        'EURUSD=X'
      )
    ).toEqual('EURUSD');
  });

  it('convertToYahooFinanceSymbol', async () => {
    expect(
      await yahooFinanceDataEnhancerService.convertToYahooFinanceSymbol(
        'BTCUSD'
      )
    ).toEqual('BTC-USD');
    expect(
      await yahooFinanceDataEnhancerService.convertToYahooFinanceSymbol(
        'DOGEUSD'
      )
    ).toEqual('DOGE-USD');
    expect(
      await yahooFinanceDataEnhancerService.convertToYahooFinanceSymbol(
        'USDCHF'
      )
    ).toEqual('USDCHF=X');
  });
});
