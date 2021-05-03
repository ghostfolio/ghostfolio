import { baseCurrency, getUtc, getYesterday } from '@ghostfolio/helper';
import { Test } from '@nestjs/testing';
import { AccountType, Currency, DataSource, Role, Type } from '@prisma/client';

import { ConfigurationService } from '../services/configuration.service';
import { DataProviderService } from '../services/data-provider.service';
import { AlphaVantageService } from '../services/data-provider/alpha-vantage/alpha-vantage.service';
import { GhostfolioScraperApiService } from '../services/data-provider/ghostfolio-scraper-api/ghostfolio-scraper-api.service';
import { RakutenRapidApiService } from '../services/data-provider/rakuten-rapid-api/rakuten-rapid-api.service';
import { YahooFinanceService } from '../services/data-provider/yahoo-finance/yahoo-finance.service';
import { ExchangeRateDataService } from '../services/exchange-rate-data.service';
import { MarketState } from '../services/interfaces/interfaces';
import { PrismaService } from '../services/prisma.service';
import { RulesService } from '../services/rules.service';
import { Portfolio } from './portfolio';

const DEFAULT_ACCOUNT_ID = '693a834b-eb89-42c9-ae47-35196c25d269';
const USER_ID = 'ca6ce867-5d31-495a-bce9-5942bbca9237';

describe('Portfolio', () => {
  let alphaVantageService: AlphaVantageService;
  let configurationService: ConfigurationService;
  let dataProviderService: DataProviderService;
  let exchangeRateDataService: ExchangeRateDataService;
  let ghostfolioScraperApiService: GhostfolioScraperApiService;
  let portfolio: Portfolio;
  let prismaService: PrismaService;
  let rakutenRapidApiService: RakutenRapidApiService;
  let rulesService: RulesService;
  let yahooFinanceService: YahooFinanceService;

  beforeAll(async () => {
    const app = await Test.createTestingModule({
      imports: [],
      providers: [
        AlphaVantageService,
        ConfigurationService,
        DataProviderService,
        ExchangeRateDataService,
        GhostfolioScraperApiService,
        PrismaService,
        RakutenRapidApiService,
        RulesService,
        YahooFinanceService
      ]
    }).compile();

    alphaVantageService = app.get<AlphaVantageService>(AlphaVantageService);
    configurationService = app.get<ConfigurationService>(ConfigurationService);
    dataProviderService = app.get<DataProviderService>(DataProviderService);
    exchangeRateDataService = app.get<ExchangeRateDataService>(
      ExchangeRateDataService
    );
    ghostfolioScraperApiService = app.get<GhostfolioScraperApiService>(
      GhostfolioScraperApiService
    );
    prismaService = app.get<PrismaService>(PrismaService);
    rakutenRapidApiService = app.get<RakutenRapidApiService>(
      RakutenRapidApiService
    );
    rulesService = app.get<RulesService>(RulesService);
    yahooFinanceService = app.get<YahooFinanceService>(YahooFinanceService);

    await exchangeRateDataService.initialize();

    portfolio = new Portfolio(
      dataProviderService,
      exchangeRateDataService,
      rulesService
    );
    portfolio.setUser({
      accessToken: null,
      Account: [
        {
          accountType: AccountType.SECURITIES,
          createdAt: new Date(),
          id: DEFAULT_ACCOUNT_ID,
          isDefault: true,
          name: 'Default Account',
          platformId: null,
          updatedAt: new Date(),
          userId: USER_ID
        }
      ],
      alias: 'Test',
      createdAt: new Date(),
      id: USER_ID,
      provider: null,
      role: Role.USER,
      Settings: {
        currency: Currency.CHF,
        updatedAt: new Date(),
        userId: USER_ID
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
      expect(details).toEqual({});
    });

    it('should return empty details', async () => {
      const details = await portfolio.getDetails('max');
      expect(details).toEqual({});
    });

    it('should return zero performance for 1d', async () => {
      const performance = await portfolio.getPerformance('1d');
      expect(performance).toEqual({
        currentGrossPerformance: 0,
        currentGrossPerformancePercent: 0,
        currentNetPerformance: 0,
        currentNetPerformancePercent: 0,
        currentValue: 0
      });
    });

    it('should return zero performance for max', async () => {
      const performance = await portfolio.getPerformance('max');
      expect(performance).toEqual({
        currentGrossPerformance: 0,
        currentGrossPerformancePercent: 0,
        currentNetPerformance: 0,
        currentNetPerformancePercent: 0,
        currentValue: 0
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
            Other: {
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
          currency: Currency.USD,
          exchange: 'Other',
          grossPerformance: 0,
          grossPerformancePercent: 0,
          investment: exchangeRateDataService.toCurrency(
            1 * 49631.24,
            Currency.USD,
            baseCurrency
          ),
          // marketPrice: 57973.008,
          marketState: MarketState.open,
          name: 'Bitcoin USD',
          quantity: 1,
          // shareCurrent: 0.9999999559148652,
          shareInvestment: 1,
          symbol: 'BTCUSD',
          transactionCount: 1,
          type: 'Cryptocurrency'
        }
      });

      expect(portfolio.getFees()).toEqual(0);

      /*const performance1d = await portfolio.getPerformance('1d');
      expect(performance1d).toEqual({
        currentGrossPerformance: 0,
        currentGrossPerformancePercent: 0,
        currentNetPerformance: 0,
        currentNetPerformancePercent: 0,
        currentValue: exchangeRateDataService.toBaseCurrency(
          1 * 49631.24,
          Currency.USD,
          baseCurrency
        )
      });*/

      /*const performanceMax = await portfolio.getPerformance('max');
      expect(performanceMax).toEqual({
        currentGrossPerformance: 0,
        currentGrossPerformancePercent: 0,
        currentNetPerformance: 0,
        currentNetPerformancePercent: 0,
        currentValue: exchangeRateDataService.toBaseCurrency(
          1 * 49631.24,
          Currency.USD,
          baseCurrency
        )
      });*/

      expect(portfolio.getPositions(getYesterday())).toMatchObject({});

      expect(portfolio.getSymbols(getYesterday())).toEqual(['BTCUSD']);
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

      const details = await portfolio.getDetails('1d');
      expect(details).toMatchObject({
        ETHUSD: {
          accounts: {
            Other: {
              /*current: exchangeRateDataService.toCurrency(
                0.2 * 991.49,
                Currency.USD,
                baseCurrency
              ),*/
              original: exchangeRateDataService.toCurrency(
                0.2 * 991.49,
                Currency.USD,
                baseCurrency
              )
            }
          },
          currency: Currency.USD,
          exchange: 'Other',
          // grossPerformance: 0,
          // grossPerformancePercent: 0,
          investment: exchangeRateDataService.toCurrency(
            0.2 * 991.49,
            Currency.USD,
            baseCurrency
          ),
          // marketPrice: 57973.008,
          name: 'Ethereum USD',
          quantity: 0.2,
          // shareCurrent: 1,
          shareInvestment: 1,
          transactionCount: 1,
          symbol: 'ETHUSD',
          type: 'Cryptocurrency'
        }
      });

      expect(portfolio.getFees()).toEqual(0);

      /*const performance = await portfolio.getPerformance('max');
      expect(performance).toEqual({
        currentGrossPerformance: 0,
        currentGrossPerformancePercent: 0,
        currentNetPerformance: 0,
        currentNetPerformancePercent: 0,
        currentValue: 0
      });*/

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
          // marketPrice: 0,
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
          // marketPrice: 0,
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
          type: Type.BUY,
          unitPrice: 1050,
          updatedAt: null,
          userId: USER_ID
        }
      ]);

      // TODO: Fix
      /*expect(portfolio.getCommittedFunds()).toEqual(
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
      );*/

      expect(portfolio.getFees()).toEqual(
        exchangeRateDataService.toCurrency(3, Currency.USD, baseCurrency)
      );

      expect(portfolio.getPositions(getYesterday())).toMatchObject({
        ETHUSD: {
          averagePrice:
            (0.2 * 991.49 - 0.1 * 1050 + 0.2 * 1050) / (0.2 - 0.1 + 0.2),
          currency: Currency.USD,
          firstBuyDate: '2018-01-05T00:00:00.000Z',
          // TODO: Fix
          /*investment: exchangeRateDataService.toCurrency(
            0.2 * 991.49 - 0.1 * 1050 + 0.2 * 1050,
            Currency.USD,
            baseCurrency
          ),*/
          investmentInOriginalCurrency: 0.2 * 991.49 - 0.1 * 1050 + 0.2 * 1050,
          // marketPrice: 0,
          quantity: 0.2 - 0.1 + 0.2
        }
      });

      expect(portfolio.getSymbols(getYesterday())).toEqual(['ETHUSD']);
    });
  });

  afterAll(async () => {
    prismaService.$disconnect();
  });
});
