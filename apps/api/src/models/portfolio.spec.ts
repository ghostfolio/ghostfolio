import { AccountService } from '@ghostfolio/api/app/account/account.service';
import { UNKNOWN_KEY, baseCurrency } from '@ghostfolio/common/config';
import { DATE_FORMAT, getUtc, getYesterday } from '@ghostfolio/common/helper';
import {
  AccountType,
  Currency,
  DataSource,
  Role,
  Type,
  ViewMode
} from '@prisma/client';
import { format } from 'date-fns';

import { DataProviderService } from '../services/data-provider.service';
import { ExchangeRateDataService } from '../services/exchange-rate-data.service';
import { MarketState } from '../services/interfaces/interfaces';
import { RulesService } from '../services/rules.service';
import { Portfolio } from './portfolio';

jest.mock('../app/account/account.service', () => {
  return {
    AccountService: jest.fn().mockImplementation(() => {
      return {
        getCashDetails: () => Promise.resolve({ accounts: [], balance: 0 })
      };
    })
  };
});

jest.mock('../services/data-provider.service', () => {
  return {
    DataProviderService: jest.fn().mockImplementation(() => {
      const today = format(new Date(), DATE_FORMAT);
      const yesterday = format(getYesterday(), DATE_FORMAT);

      return {
        get: () => {
          return Promise.resolve({
            BTCUSD: {
              currency: Currency.USD,
              dataSource: DataSource.YAHOO,
              exchange: UNKNOWN_KEY,
              marketPrice: 57973.008,
              marketState: MarketState.open,
              name: 'Bitcoin USD',
              type: 'Cryptocurrency'
            },
            ETHUSD: {
              currency: Currency.USD,
              dataSource: DataSource.YAHOO,
              exchange: UNKNOWN_KEY,
              marketPrice: 3915.337,
              marketState: MarketState.open,
              name: 'Ethereum USD',
              type: 'Cryptocurrency'
            }
          });
        },
        getHistorical: () => {
          return Promise.resolve({
            BTCUSD: {
              [yesterday]: 56710.122,
              [today]: 57973.008
            },
            ETHUSD: {
              [yesterday]: 3641.984,
              [today]: 3915.337
            }
          });
        }
      };
    })
  };
});

jest.mock('../services/exchange-rate-data.service', () => {
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

jest.mock('../services/rules.service');

const DEFAULT_ACCOUNT_ID = '693a834b-eb89-42c9-ae47-35196c25d269';
const USER_ID = 'ca6ce867-5d31-495a-bce9-5942bbca9237';

describe('Portfolio', () => {
  let accountService: AccountService;
  let dataProviderService: DataProviderService;
  let exchangeRateDataService: ExchangeRateDataService;
  let portfolio: Portfolio;
  let rulesService: RulesService;

  beforeAll(async () => {
    accountService = new AccountService(null, null, null);
    dataProviderService = new DataProviderService(
      null,
      null,
      null,
      null,
      null,
      null
    );
    exchangeRateDataService = new ExchangeRateDataService(null);
    rulesService = new RulesService();

    await exchangeRateDataService.initialize();

    portfolio = new Portfolio(
      accountService,
      dataProviderService,
      exchangeRateDataService,
      rulesService
    );
    portfolio.setUser({
      accessToken: null,
      Account: [
        {
          accountType: AccountType.SECURITIES,
          balance: 0,
          createdAt: new Date(),
          currency: Currency.USD,
          id: DEFAULT_ACCOUNT_ID,
          isDefault: true,
          name: 'Default Account',
          platformId: null,
          updatedAt: new Date(),
          userId: USER_ID
        }
      ],
      alias: 'Test',
      authChallenge: null,
      createdAt: new Date(),
      id: USER_ID,
      provider: null,
      role: Role.USER,
      Settings: {
        currency: Currency.CHF,
        updatedAt: new Date(),
        userId: USER_ID,
        viewMode: ViewMode.DEFAULT
      },
      thirdPartyId: null,
      updatedAt: new Date()
    });
  });

  describe('works with no orders', () => {
    it('should return []', () => {
      expect(portfolio.get(new Date())).toEqual([]);
      expect(portfolio.getFees()).toEqual(0);
      expect(portfolio.getPositions(new Date())).toEqual({});
    });

    it('should return empty details', async () => {
      const details = await portfolio.getDetails('1d');
      expect(details).toMatchObject({
        _GF_CASH: {
          accounts: {},
          allocationCurrent: NaN, // TODO
          allocationInvestment: NaN, // TODO
          countries: [],
          currency: 'CHF',
          grossPerformance: 0,
          grossPerformancePercent: 0,
          investment: 0,
          marketPrice: 0,
          marketState: 'open',
          name: 'Cash',
          quantity: 0,
          sectors: [],
          symbol: '_GF_CASH',
          transactionCount: 0,
          type: 'Cash',
          value: 0
        }
      });
    });

    it('should return empty details', async () => {
      const details = await portfolio.getDetails('max');
      expect(details).toMatchObject({
        _GF_CASH: {
          accounts: {},
          allocationCurrent: NaN, // TODO
          allocationInvestment: NaN, // TODO
          countries: [],
          currency: 'CHF',
          grossPerformance: 0,
          grossPerformancePercent: 0,
          investment: 0,
          marketPrice: 0,
          marketState: 'open',
          name: 'Cash',
          quantity: 0,
          sectors: [],
          symbol: '_GF_CASH',
          transactionCount: 0,
          type: 'Cash',
          value: 0
        }
      });
    });
  });

  describe(`works with today's orders`, () => {
    it('should return ["BTC"]', async () => {
      await portfolio.setOrders([
        {
          accountId: DEFAULT_ACCOUNT_ID,
          accountUserId: USER_ID,
          createdAt: null,
          currency: Currency.USD,
          dataSource: DataSource.YAHOO,
          fee: 0,
          date: new Date(),
          id: '8d999347-dee2-46ee-88e1-26b344e71fcc',
          quantity: 1,
          symbol: 'BTCUSD',
          symbolProfileId: null,
          type: Type.BUY,
          unitPrice: 49631.24,
          updatedAt: null,
          userId: USER_ID
        }
      ]);

      expect(portfolio.getCommittedFunds()).toEqual(
        exchangeRateDataService.toCurrency(
          1 * 49631.24,
          Currency.USD,
          baseCurrency
        )
      );

      const details = await portfolio.getDetails('1d');
      expect(details).toMatchObject({
        BTCUSD: {
          accounts: {
            [UNKNOWN_KEY]: {
              /*current: exchangeRateDataService.toCurrency(
                1 * 49631.24,
                Currency.USD,
                baseCurrency
              ),*/
              original: exchangeRateDataService.toCurrency(
                1 * 49631.24,
                Currency.USD,
                baseCurrency
              )
            }
          },
          allocationCurrent: 1,
          allocationInvestment: 1,
          countries: [],
          currency: Currency.USD,
          exchange: UNKNOWN_KEY,
          grossPerformance: 0,
          grossPerformancePercent: 0,
          investment: exchangeRateDataService.toCurrency(
            1 * 49631.24,
            Currency.USD,
            baseCurrency
          ),
          marketPrice: 57973.008,
          marketState: MarketState.open,
          name: 'Bitcoin USD',
          quantity: 1,
          symbol: 'BTCUSD',
          transactionCount: 1,
          type: 'Cryptocurrency'
        }
      });

      expect(portfolio.getFees()).toEqual(0);

      expect(portfolio.getPositions(getYesterday())).toMatchObject({});

      expect(portfolio.getSymbols(getYesterday())).toEqual([]);

      expect(portfolio.getSymbols(new Date())).toEqual(['BTCUSD']);
    });
  });

  describe('works with orders', () => {
    it('should return ["ETHUSD"]', async () => {
      await portfolio.setOrders([
        {
          accountId: DEFAULT_ACCOUNT_ID,
          accountUserId: USER_ID,
          createdAt: null,
          currency: Currency.USD,
          dataSource: DataSource.YAHOO,
          fee: 0,
          date: new Date(getUtc('2018-01-05')),
          id: '4a5a5c6e-659d-45cc-9fd4-fd6c873b50fb',
          quantity: 0.2,
          symbol: 'ETHUSD',
          symbolProfileId: null,
          type: Type.BUY,
          unitPrice: 991.49,
          updatedAt: null,
          userId: USER_ID
        }
      ]);

      expect(portfolio.getCommittedFunds()).toEqual(
        exchangeRateDataService.toCurrency(
          0.2 * 991.49,
          Currency.USD,
          baseCurrency
        )
      );

      expect(portfolio.getFees()).toEqual(0);

      expect(portfolio.getPositions(getYesterday())).toMatchObject({
        ETHUSD: {
          averagePrice: 991.49,
          currency: Currency.USD,
          firstBuyDate: '2018-01-05T00:00:00.000Z',
          investment: exchangeRateDataService.toCurrency(
            0.2 * 991.49,
            Currency.USD,
            baseCurrency
          ),
          investmentInOriginalCurrency: 0.2 * 991.49,
          // marketPrice: 3915.337,
          quantity: 0.2
        }
      });

      expect(portfolio.getSymbols(getYesterday())).toEqual(['ETHUSD']);
    });

    it('should return ["ETHUSD"]', async () => {
      await portfolio.setOrders([
        {
          accountId: DEFAULT_ACCOUNT_ID,
          accountUserId: USER_ID,
          createdAt: null,
          currency: Currency.USD,
          dataSource: DataSource.YAHOO,
          fee: 0,
          date: new Date(getUtc('2018-01-05')),
          id: '4a5a5c6e-659d-45cc-9fd4-fd6c873b50fb',
          quantity: 0.2,
          symbol: 'ETHUSD',
          symbolProfileId: null,
          type: Type.BUY,
          unitPrice: 991.49,
          updatedAt: null,
          userId: USER_ID
        },
        {
          accountId: DEFAULT_ACCOUNT_ID,
          accountUserId: USER_ID,
          createdAt: null,
          currency: Currency.USD,
          dataSource: DataSource.YAHOO,
          fee: 0,
          date: new Date(getUtc('2018-01-28')),
          id: '4a5a5c6e-659d-45cc-9fd4-fd6c873b50fc',
          quantity: 0.3,
          symbol: 'ETHUSD',
          symbolProfileId: null,
          type: Type.BUY,
          unitPrice: 1050,
          updatedAt: null,
          userId: USER_ID
        }
      ]);

      expect(portfolio.getCommittedFunds()).toEqual(
        exchangeRateDataService.toCurrency(
          0.2 * 991.49,
          Currency.USD,
          baseCurrency
        ) +
          exchangeRateDataService.toCurrency(
            0.3 * 1050,
            Currency.USD,
            baseCurrency
          )
      );

      expect(portfolio.getFees()).toEqual(0);

      expect(portfolio.getPositions(getYesterday())).toMatchObject({
        ETHUSD: {
          averagePrice: (0.2 * 991.49 + 0.3 * 1050) / (0.2 + 0.3),
          currency: Currency.USD,
          firstBuyDate: '2018-01-05T00:00:00.000Z',
          investment:
            exchangeRateDataService.toCurrency(
              0.2 * 991.49,
              Currency.USD,
              baseCurrency
            ) +
            exchangeRateDataService.toCurrency(
              0.3 * 1050,
              Currency.USD,
              baseCurrency
            ),
          investmentInOriginalCurrency: 0.2 * 991.49 + 0.3 * 1050,
          // marketPrice: 3641.984,
          quantity: 0.5
        }
      });

      expect(portfolio.getSymbols(getYesterday())).toEqual(['ETHUSD']);
    });

    it('should return ["BTCUSD", "ETHUSD"]', async () => {
      await portfolio.setOrders([
        {
          accountId: DEFAULT_ACCOUNT_ID,
          accountUserId: USER_ID,
          createdAt: null,
          currency: Currency.EUR,
          dataSource: DataSource.YAHOO,
          date: new Date(getUtc('2017-08-16')),
          fee: 2.99,
          id: 'd96795b2-6ae6-420e-aa21-fabe5e45d475',
          quantity: 0.05614682,
          symbol: 'BTCUSD',
          symbolProfileId: null,
          type: Type.BUY,
          unitPrice: 3562.089535970158,
          updatedAt: null,
          userId: USER_ID
        },
        {
          accountId: DEFAULT_ACCOUNT_ID,
          accountUserId: USER_ID,
          createdAt: null,
          currency: Currency.USD,
          dataSource: DataSource.YAHOO,
          fee: 2.99,
          date: new Date(getUtc('2018-01-05')),
          id: '4a5a5c6e-659d-45cc-9fd4-fd6c873b50fb',
          quantity: 0.2,
          symbol: 'ETHUSD',
          symbolProfileId: null,
          type: Type.BUY,
          unitPrice: 991.49,
          updatedAt: null,
          userId: USER_ID
        }
      ]);

      expect(portfolio.getCommittedFunds()).toEqual(
        exchangeRateDataService.toCurrency(
          0.05614682 * 3562.089535970158,
          Currency.EUR,
          baseCurrency
        ) +
          exchangeRateDataService.toCurrency(
            0.2 * 991.49,
            Currency.USD,
            baseCurrency
          )
      );

      expect(portfolio.getFees()).toEqual(
        exchangeRateDataService.toCurrency(2.99, Currency.EUR, baseCurrency) +
          exchangeRateDataService.toCurrency(2.99, Currency.USD, baseCurrency)
      );

      expect(portfolio.getPositions(getYesterday())).toMatchObject({
        BTCUSD: {
          averagePrice: 3562.089535970158,
          currency: Currency.EUR,
          firstBuyDate: '2017-08-16T00:00:00.000Z',
          investment: exchangeRateDataService.toCurrency(
            0.05614682 * 3562.089535970158,
            Currency.EUR,
            baseCurrency
          ),
          investmentInOriginalCurrency: 0.05614682 * 3562.089535970158,
          // marketPrice: 0,
          quantity: 0.05614682
        },
        ETHUSD: {
          averagePrice: 991.49,
          currency: Currency.USD,
          firstBuyDate: '2018-01-05T00:00:00.000Z',
          investment: exchangeRateDataService.toCurrency(
            0.2 * 991.49,
            Currency.USD,
            baseCurrency
          ),
          investmentInOriginalCurrency: 0.2 * 991.49,
          // marketPrice: 0,
          quantity: 0.2
        }
      });

      expect(portfolio.getSymbols(getYesterday())).toEqual([
        'BTCUSD',
        'ETHUSD'
      ]);
    });

    it('should work with buy and sell', async () => {
      await portfolio.setOrders([
        {
          accountId: DEFAULT_ACCOUNT_ID,
          accountUserId: USER_ID,
          createdAt: null,
          currency: Currency.USD,
          dataSource: DataSource.YAHOO,
          fee: 1.0,
          date: new Date(getUtc('2018-01-05')),
          id: '4a5a5c6e-659d-45cc-9fd4-fd6c873b50fb',
          quantity: 0.2,
          symbol: 'ETHUSD',
          symbolProfileId: null,
          type: Type.BUY,
          unitPrice: 991.49,
          updatedAt: null,
          userId: USER_ID
        },
        {
          accountId: DEFAULT_ACCOUNT_ID,
          accountUserId: USER_ID,
          createdAt: null,
          currency: Currency.USD,
          dataSource: DataSource.YAHOO,
          fee: 1.0,
          date: new Date(getUtc('2018-01-28')),
          id: '4a5a5c6e-659d-45cc-9fd4-fd6c873b50fc',
          quantity: 0.1,
          symbol: 'ETHUSD',
          symbolProfileId: null,
          type: Type.SELL,
          unitPrice: 1050,
          updatedAt: null,
          userId: USER_ID
        },
        {
          accountId: DEFAULT_ACCOUNT_ID,
          accountUserId: USER_ID,
          createdAt: null,
          currency: Currency.USD,
          dataSource: DataSource.YAHOO,
          fee: 1.0,
          date: new Date(getUtc('2018-01-31')),
          id: '4a5a5c6e-659d-45cc-9fd4-fd6c873b50fc',
          quantity: 0.2,
          symbol: 'ETHUSD',
          symbolProfileId: null,
          type: Type.BUY,
          unitPrice: 1050,
          updatedAt: null,
          userId: USER_ID
        }
      ]);

      expect(portfolio.getCommittedFunds()).toEqual(
        exchangeRateDataService.toCurrency(
          0.2 * 991.49,
          Currency.USD,
          baseCurrency
        ) -
          exchangeRateDataService.toCurrency(
            0.1 * 1050,
            Currency.USD,
            baseCurrency
          ) +
          exchangeRateDataService.toCurrency(
            0.2 * 1050,
            Currency.USD,
            baseCurrency
          )
      );

      expect(portfolio.getFees()).toEqual(
        exchangeRateDataService.toCurrency(3, Currency.USD, baseCurrency)
      );

      expect(portfolio.getPositions(getYesterday())).toMatchObject({
        ETHUSD: {
          averagePrice:
            (0.2 * 991.49 - 0.1 * 1050 + 0.2 * 1050) / (0.2 - 0.1 + 0.2),
          currency: Currency.USD,
          firstBuyDate: '2018-01-05T00:00:00.000Z',
          investment: exchangeRateDataService.toCurrency(
            0.2 * 991.49 - 0.1 * 1050 + 0.2 * 1050,
            Currency.USD,
            baseCurrency
          ),
          investmentInOriginalCurrency: 0.2 * 991.49 - 0.1 * 1050 + 0.2 * 1050,
          // marketPrice: 0,
          quantity: 0.2 - 0.1 + 0.2
        }
      });

      expect(portfolio.getSymbols(getYesterday())).toEqual(['ETHUSD']);
    });
  });
});
