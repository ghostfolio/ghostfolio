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
      dataProviderService,
      null,
      exchangeRateDataService,
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
});
