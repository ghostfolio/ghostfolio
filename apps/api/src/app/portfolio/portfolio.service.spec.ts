import { AccountService } from '@ghostfolio/api/app/account/account.service';
import { CashDetails } from '@ghostfolio/api/app/account/interfaces/cash-details.interface';
import { ActivitiesService } from '@ghostfolio/api/app/activities/activities.service';
import { userDummyData } from '@ghostfolio/api/app/portfolio/calculator/portfolio-calculator-test-utils';
import { PortfolioCalculatorFactory } from '@ghostfolio/api/app/portfolio/calculator/portfolio-calculator.factory';
import { UserService } from '@ghostfolio/api/app/user/user.service';
import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';
import { DataProviderService } from '@ghostfolio/api/services/data-provider/data-provider.service';
import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.service';
import { ImpersonationService } from '@ghostfolio/api/services/impersonation/impersonation.service';
import { SymbolProfileService } from '@ghostfolio/api/services/symbol-profile/symbol-profile.service';
import { UNKNOWN_KEY } from '@ghostfolio/common/config';
import { parseDate } from '@ghostfolio/common/helper';

import { Account, DataSource } from '@prisma/client';
import { Big } from 'big.js';
import { randomUUID } from 'node:crypto';

import { PortfolioService } from './portfolio.service';

describe('PortfolioService', () => {
  let accountService: AccountService;
  let activitiesService: ActivitiesService;
  let configurationService: ConfigurationService;
  let dataProviderService: DataProviderService;
  let exchangeRateDataService: ExchangeRateDataService;
  let impersonationService: ImpersonationService;
  let portfolioCalculatorFactory: PortfolioCalculatorFactory;
  let portfolioService: PortfolioService;
  let symbolProfileService: SymbolProfileService;
  let userService: UserService;

  beforeEach(() => {
    configurationService = new ConfigurationService();

    dataProviderService = new DataProviderService(
      configurationService,
      null,
      null,
      null,
      null,
      null
    );

    exchangeRateDataService = new ExchangeRateDataService(
      null,
      null,
      null,
      null
    );

    accountService = new AccountService(
      null,
      null,
      exchangeRateDataService,
      null
    );

    activitiesService = new ActivitiesService(
      null,
      accountService,
      null,
      null,
      dataProviderService,
      null,
      exchangeRateDataService,
      null,
      null,
      null
    );

    impersonationService = new ImpersonationService(null, null);

    portfolioCalculatorFactory = new PortfolioCalculatorFactory(
      configurationService,
      null,
      exchangeRateDataService,
      null,
      null
    );

    symbolProfileService = new SymbolProfileService(null);

    userService = new UserService(
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null
    );

    portfolioService = new PortfolioService(
      null,
      accountService,
      activitiesService,
      null,
      portfolioCalculatorFactory,
      dataProviderService,
      exchangeRateDataService,
      null,
      impersonationService,
      null,
      null,
      symbolProfileService,
      userService
    );
  });

  describe('getAggregatedMarkets', () => {
    const getAggregatedMarkets = (holdings: object) => {
      return (
        portfolioService as unknown as {
          getAggregatedMarkets: (aHoldings: object) => {
            markets: Record<
              string,
              { valueInBaseCurrency: number; valueInPercentage: number }
            >;
            marketsAdvanced: Record<string, { valueInBaseCurrency: number }>;
          };
        }
      ).getAggregatedMarkets(holdings);
    };

    it('should distribute holdings with countries to their market and route holdings without countries (e.g. commodities, cryptocurrencies) to the unknown bucket', () => {
      const holdings = {
        'GC=F': {
          // Gold
          assetProfile: { countries: [] },
          markets: { developedMarkets: 0, emergingMarkets: 0, otherMarkets: 0 },
          marketsAdvanced: {
            asiaPacific: 0,
            emergingMarkets: 0,
            europe: 0,
            japan: 0,
            northAmerica: 0,
            otherMarkets: 0
          },
          valueInBaseCurrency: 500
        },
        MSFT: {
          assetProfile: { countries: [{ code: 'US', weight: 1 }] },
          markets: { developedMarkets: 1, emergingMarkets: 0, otherMarkets: 0 },
          marketsAdvanced: {
            asiaPacific: 0,
            emergingMarkets: 0,
            europe: 0,
            japan: 0,
            northAmerica: 1,
            otherMarkets: 0
          },
          valueInBaseCurrency: 1000
        }
      };

      const { markets, marketsAdvanced } = getAggregatedMarkets(holdings);

      expect(markets.developedMarkets.valueInBaseCurrency).toBe(1000);
      expect(markets[UNKNOWN_KEY].valueInBaseCurrency).toBe(500);

      expect(markets.developedMarkets.valueInPercentage).toBeCloseTo(
        1000 / 1500
      );
      expect(markets[UNKNOWN_KEY].valueInPercentage).toBeCloseTo(500 / 1500);

      expect(marketsAdvanced.northAmerica.valueInBaseCurrency).toBe(1000);
      expect(marketsAdvanced[UNKNOWN_KEY].valueInBaseCurrency).toBe(500);
    });
  });

  describe('getCashSymbolProfiles', () => {
    it('should use the exchange-rate data source so the symbol-profile join in getDetails matches the calculator positions', () => {
      jest
        .spyOn(dataProviderService, 'getDataSourceForExchangeRates')
        .mockReturnValue(DataSource.YAHOO);

      const cashDetails: CashDetails = {
        accounts: [
          {
            balance: 2000,
            comment: null,
            createdAt: parseDate('2024-01-01'),
            currency: 'USD',
            id: randomUUID(),
            isExcluded: false,
            name: 'USD',
            platformId: null,
            updatedAt: parseDate('2024-01-01'),
            userId: userDummyData.id
          }
        ],
        balanceInBaseCurrency: 1820
      };

      const assetProfiles = (
        portfolioService as unknown as {
          getCashSymbolProfiles: (
            aCashDetails: CashDetails
          ) => { dataSource: DataSource; symbol: string }[];
        }
      ).getCashSymbolProfiles(cashDetails);

      expect(assetProfiles).toHaveLength(1);
      expect(assetProfiles[0].dataSource).toBe(DataSource.YAHOO);
      expect(assetProfiles[0].symbol).toBe('USD');
    });
  });

  describe('getDetails', () => {
    it('should return cash holdings when the calculator emits cash positions with the exchange-rate data source', async () => {
      const accountId = randomUUID();

      const cashAccount: Account = {
        balance: 2000,
        comment: null,
        createdAt: parseDate('2024-01-01'),
        currency: 'USD',
        id: accountId,
        isExcluded: false,
        name: 'USD',
        platformId: null,
        updatedAt: parseDate('2024-01-01'),
        userId: userDummyData.id
      };

      jest.spyOn(accountService, 'getCashDetails').mockResolvedValue({
        accounts: [cashAccount],
        balanceInBaseCurrency: 1820
      });

      jest
        .spyOn(activitiesService, 'getActivitiesForPortfolioCalculator')
        .mockResolvedValue({ activities: [], count: 0 });

      jest
        .spyOn(dataProviderService, 'getDataSourceForExchangeRates')
        .mockReturnValue(DataSource.YAHOO);

      jest
        .spyOn(impersonationService, 'validateImpersonationId')
        .mockResolvedValue(null);

      jest
        .spyOn(symbolProfileService, 'getSymbolProfiles')
        .mockResolvedValue([]);

      jest.spyOn(userService, 'user').mockResolvedValue({
        accessesGet: [],
        accounts: [],
        activityCount: 0,
        dataProviderGhostfolioDailyRequests: 0,
        id: userDummyData.id,
        settings: {
          settings: {
            baseCurrency: 'CHF'
          }
        }
      } as unknown as Awaited<ReturnType<typeof userService.user>>);

      const usdPosition = {
        activitiesCount: 1,
        averagePrice: new Big(1),
        currency: 'USD',
        dataSource: DataSource.YAHOO,
        dateOfFirstActivity: '2024-01-01',
        dividend: new Big(0),
        dividendInBaseCurrency: new Big(0),
        fee: new Big(0),
        feeInBaseCurrency: new Big(0),
        grossPerformance: new Big(0),
        grossPerformancePercentage: new Big(0),
        grossPerformancePercentageWithCurrencyEffect: new Big(0),
        grossPerformanceWithCurrencyEffect: new Big(0),
        investment: new Big(1820),
        investmentWithCurrencyEffect: new Big(1820),
        marketPrice: 1,
        marketPriceInBaseCurrency: 0.91,
        netPerformance: new Big(0),
        netPerformancePercentage: new Big(0),
        netPerformancePercentageWithCurrencyEffectMap: {},
        netPerformanceWithCurrencyEffectMap: {},
        quantity: new Big(2000),
        symbol: 'USD',
        tags: [],
        timeWeightedInvestment: new Big(0),
        timeWeightedInvestmentWithCurrencyEffect: new Big(0),
        valueInBaseCurrency: new Big(1820)
      };

      jest
        .spyOn(portfolioCalculatorFactory, 'createCalculator')
        .mockReturnValue({
          getSnapshot: jest.fn().mockResolvedValue({
            activitiesCount: 1,
            createdAt: parseDate('2024-01-01'),
            currentValueInBaseCurrency: new Big(1820),
            errors: [],
            hasErrors: false,
            historicalData: [],
            positions: [usdPosition],
            totalFeesWithCurrencyEffect: new Big(0),
            totalInterestWithCurrencyEffect: new Big(0),
            totalInvestment: new Big(1820),
            totalInvestmentWithCurrencyEffect: new Big(1820),
            totalLiabilitiesWithCurrencyEffect: new Big(0)
          })
        } as unknown as ReturnType<
          typeof portfolioCalculatorFactory.createCalculator
        >);

      jest
        .spyOn(
          portfolioService as unknown as {
            getValueOfAccountsAndPlatforms: () => Promise<{
              accounts: object;
              platforms: object;
            }>;
          },
          'getValueOfAccountsAndPlatforms'
        )
        .mockResolvedValue({ accounts: {}, platforms: {} });

      const { holdings } = await portfolioService.getDetails({
        filters: [],
        impersonationId: userDummyData.id,
        userId: userDummyData.id
      });

      expect(holdings['USD']).toBeDefined();
      expect(holdings['USD'].assetProfile.dataSource).toBe(DataSource.YAHOO);
      expect(holdings['USD'].assetProfile.symbol).toBe('USD');
    });
  });

  describe('getValueOfAccountsAndPlatforms', () => {
    const getValueOfAccountsAndPlatforms = (args: object) => {
      return (
        portfolioService as unknown as {
          getValueOfAccountsAndPlatforms: (aArgs: object) => Promise<{
            accounts: Record<string, { valueInBaseCurrency: number }>;
            platforms: Record<string, { valueInBaseCurrency: number }>;
          }>;
        }
      ).getValueOfAccountsAndPlatforms(args);
    };

    const account = {
      balance: 100,
      currency: 'USD',
      id: randomUUID(),
      isExcluded: false,
      name: 'Account 1',
      platform: { name: 'Platform 1' },
      platformId: randomUUID()
    };

    beforeEach(() => {
      jest
        .spyOn(accountService, 'getAccounts')
        .mockResolvedValue([account] as unknown as Account[]);

      jest
        .spyOn(exchangeRateDataService, 'toCurrency')
        .mockImplementation((aValue) => aValue);
    });

    it('should group activities without an account into the unknown bucket of accounts and platforms', async () => {
      const { accounts, platforms } = await getValueOfAccountsAndPlatforms({
        activities: [
          {
            account,
            accountId: account.id,
            quantity: 1,
            SymbolProfile: { symbol: 'AAPL' },
            type: 'BUY'
          },
          {
            account: null,
            accountId: null,
            quantity: 2,
            SymbolProfile: { symbol: 'BABA' },
            type: 'BUY'
          }
        ],
        filters: [],
        portfolioItemsNow: {
          AAPL: { marketPriceInBaseCurrency: 10 },
          BABA: { marketPriceInBaseCurrency: 20 }
        },
        userCurrency: 'USD',
        userId: userDummyData.id
      });

      // 100 (balance) + 1 * 10 (activity)
      expect(accounts[account.id].valueInBaseCurrency).toBe(110);
      expect(platforms[account.platformId].valueInBaseCurrency).toBe(110);

      // 2 * 20 (activity without an account)
      expect(accounts[UNKNOWN_KEY].valueInBaseCurrency).toBe(40);
      expect(platforms[UNKNOWN_KEY].valueInBaseCurrency).toBe(40);
    });

    it('should not create an unknown bucket when every activity has an account', async () => {
      const { accounts, platforms } = await getValueOfAccountsAndPlatforms({
        activities: [
          {
            account,
            accountId: account.id,
            quantity: 1,
            SymbolProfile: { symbol: 'AAPL' },
            type: 'BUY'
          }
        ],
        filters: [],
        portfolioItemsNow: {
          AAPL: { marketPriceInBaseCurrency: 10 }
        },
        userCurrency: 'USD',
        userId: userDummyData.id
      });

      expect(accounts[UNKNOWN_KEY]).toBeUndefined();
      expect(platforms[UNKNOWN_KEY]).toBeUndefined();
    });
  });
});
