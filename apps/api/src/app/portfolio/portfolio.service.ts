import { AccountBalanceService } from '@ghostfolio/api/app/account-balance/account-balance.service';
import { AccountService } from '@ghostfolio/api/app/account/account.service';
import { CashDetails } from '@ghostfolio/api/app/account/interfaces/cash-details.interface';
import { Activity } from '@ghostfolio/api/app/order/interfaces/activities.interface';
import { OrderService } from '@ghostfolio/api/app/order/order.service';
import { LookupItem } from '@ghostfolio/api/app/symbol/interfaces/lookup-item.interface';
import { UserService } from '@ghostfolio/api/app/user/user.service';
import {
  getFactor,
  getInterval
} from '@ghostfolio/api/helper/portfolio.helper';
import { AccountClusterRiskCurrentInvestment } from '@ghostfolio/api/models/rules/account-cluster-risk/current-investment';
import { AccountClusterRiskSingleAccount } from '@ghostfolio/api/models/rules/account-cluster-risk/single-account';
import { CurrencyClusterRiskBaseCurrencyCurrentInvestment } from '@ghostfolio/api/models/rules/currency-cluster-risk/base-currency-current-investment';
import { CurrencyClusterRiskCurrentInvestment } from '@ghostfolio/api/models/rules/currency-cluster-risk/current-investment';
import { EmergencyFundSetup } from '@ghostfolio/api/models/rules/emergency-fund/emergency-fund-setup';
import { FeeRatioInitialInvestment } from '@ghostfolio/api/models/rules/fees/fee-ratio-initial-investment';
import { DataProviderService } from '@ghostfolio/api/services/data-provider/data-provider.service';
import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.service';
import { ImpersonationService } from '@ghostfolio/api/services/impersonation/impersonation.service';
import { SymbolProfileService } from '@ghostfolio/api/services/symbol-profile/symbol-profile.service';
import {
  DEFAULT_CURRENCY,
  EMERGENCY_FUND_TAG_ID,
  UNKNOWN_KEY
} from '@ghostfolio/common/config';
import {
  DATE_FORMAT,
  getAssetProfileIdentifier,
  getSum,
  parseDate
} from '@ghostfolio/common/helper';
import {
  Accounts,
  EnhancedSymbolProfile,
  Filter,
  HistoricalDataItem,
  InvestmentItem,
  PortfolioDetails,
  PortfolioInvestments,
  PortfolioPerformanceResponse,
  PortfolioPosition,
  PortfolioReport,
  PortfolioSummary,
  Position,
  UserSettings
} from '@ghostfolio/common/interfaces';
import { TimelinePosition } from '@ghostfolio/common/models';
import type {
  AccountWithValue,
  DateRange,
  GroupBy,
  RequestWithUser,
  UserWithSettings
} from '@ghostfolio/common/types';

import { Inject, Injectable } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import {
  Account,
  Type as ActivityType,
  AssetClass,
  AssetSubClass,
  DataSource,
  Order,
  Platform,
  Prisma
} from '@prisma/client';
import { Big } from 'big.js';
import {
  differenceInDays,
  format,
  isAfter,
  isSameMonth,
  isSameYear,
  parseISO,
  set
} from 'date-fns';
import { isEmpty, isNumber, last, uniq, uniqBy } from 'lodash';

import { PortfolioCalculator } from './calculator/portfolio-calculator';
import {
  PerformanceCalculationType,
  PortfolioCalculatorFactory
} from './calculator/portfolio-calculator.factory';
import { PortfolioHoldingDetail } from './interfaces/portfolio-holding-detail.interface';
import { RulesService } from './rules.service';

const asiaPacificMarkets = require('../../assets/countries/asia-pacific-markets.json');
const developedMarkets = require('../../assets/countries/developed-markets.json');
const emergingMarkets = require('../../assets/countries/emerging-markets.json');
const europeMarkets = require('../../assets/countries/europe-markets.json');

@Injectable()
export class PortfolioService {
  public constructor(
    private readonly accountBalanceService: AccountBalanceService,
    private readonly accountService: AccountService,
    private readonly calculatorFactory: PortfolioCalculatorFactory,
    private readonly dataProviderService: DataProviderService,
    private readonly exchangeRateDataService: ExchangeRateDataService,
    private readonly impersonationService: ImpersonationService,
    private readonly orderService: OrderService,
    @Inject(REQUEST) private readonly request: RequestWithUser,
    private readonly rulesService: RulesService,
    private readonly symbolProfileService: SymbolProfileService,
    private readonly userService: UserService
  ) {}

  public async getAccounts({
    filters,
    userId,
    withExcludedAccounts = false
  }: {
    filters?: Filter[];
    userId: string;
    withExcludedAccounts?: boolean;
  }): Promise<AccountWithValue[]> {
    const where: Prisma.AccountWhereInput = { userId };

    const accountFilter = filters?.find(({ type }) => {
      return type === 'ACCOUNT';
    });

    if (accountFilter) {
      where.id = accountFilter.id;
    }

    const [accounts, details] = await Promise.all([
      this.accountService.accounts({
        where,
        include: { Order: true, Platform: true },
        orderBy: { name: 'asc' }
      }),
      this.getDetails({
        filters,
        withExcludedAccounts,
        impersonationId: userId,
        userId: this.request.user.id
      })
    ]);

    const userCurrency = this.request.user.Settings.settings.baseCurrency;

    return accounts.map((account) => {
      let transactionCount = 0;

      for (const order of account.Order) {
        if (!order.isDraft) {
          transactionCount += 1;
        }
      }

      const valueInBaseCurrency =
        details.accounts[account.id]?.valueInBaseCurrency ?? 0;

      const result = {
        ...account,
        transactionCount,
        valueInBaseCurrency,
        balanceInBaseCurrency: this.exchangeRateDataService.toCurrency(
          account.balance,
          account.currency,
          userCurrency
        ),
        value: this.exchangeRateDataService.toCurrency(
          valueInBaseCurrency,
          userCurrency,
          account.currency
        )
      };

      delete result.Order;

      return result;
    });
  }

  public async getAccountsWithAggregations({
    filters,
    userId,
    withExcludedAccounts = false
  }: {
    filters?: Filter[];
    userId: string;
    withExcludedAccounts?: boolean;
  }): Promise<Accounts> {
    const accounts = await this.getAccounts({
      filters,
      userId,
      withExcludedAccounts
    });
    let totalBalanceInBaseCurrency = new Big(0);
    let totalValueInBaseCurrency = new Big(0);
    let transactionCount = 0;

    for (const account of accounts) {
      totalBalanceInBaseCurrency = totalBalanceInBaseCurrency.plus(
        account.balanceInBaseCurrency
      );
      totalValueInBaseCurrency = totalValueInBaseCurrency.plus(
        account.valueInBaseCurrency
      );
      transactionCount += account.transactionCount;
    }

    return {
      accounts,
      transactionCount,
      totalBalanceInBaseCurrency: totalBalanceInBaseCurrency.toNumber(),
      totalValueInBaseCurrency: totalValueInBaseCurrency.toNumber()
    };
  }

  public getAnnualizedPerformancePercent({
    daysInMarket,
    netPerformancePercentage
  }: {
    daysInMarket: number;
    netPerformancePercentage: Big;
  }): Big {
    if (isNumber(daysInMarket) && daysInMarket > 0) {
      const exponent = new Big(365).div(daysInMarket).toNumber();

      return new Big(
        Math.pow(netPerformancePercentage.plus(1).toNumber(), exponent)
      ).minus(1);
    }

    return new Big(0);
  }

  public async getDividends({
    activities,
    groupBy
  }: {
    activities: Activity[];
    groupBy?: GroupBy;
  }): Promise<InvestmentItem[]> {
    let dividends = activities.map(({ date, valueInBaseCurrency }) => {
      return {
        date: format(date, DATE_FORMAT),
        investment: valueInBaseCurrency
      };
    });

    if (groupBy) {
      dividends = this.getDividendsByGroup({ dividends, groupBy });
    }

    return dividends;
  }

  public async getInvestments({
    dateRange,
    filters,
    groupBy,
    impersonationId,
    savingsRate
  }: {
    dateRange: DateRange;
    filters?: Filter[];
    groupBy?: GroupBy;
    impersonationId: string;
    savingsRate: number;
  }): Promise<PortfolioInvestments> {
    const userId = await this.getUserId(impersonationId, this.request.user.id);

    const { activities } = await this.orderService.getOrders({
      filters,
      userId,
      includeDrafts: true,
      types: ['BUY', 'SELL'],
      userCurrency: this.getUserCurrency()
    });

    if (activities.length === 0) {
      return {
        investments: [],
        streaks: { currentStreak: 0, longestStreak: 0 }
      };
    }

    const portfolioCalculator = this.calculatorFactory.createCalculator({
      activities,
      dateRange,
      userId,
      calculationType: PerformanceCalculationType.TWR,
      currency: this.request.user.Settings.settings.baseCurrency,
      hasFilters: filters?.length > 0,
      isExperimentalFeatures:
        this.request.user.Settings.settings.isExperimentalFeatures
    });

    const items = await portfolioCalculator.getChart({
      dateRange,
      withDataDecimation: false
    });

    let investments: InvestmentItem[];

    if (groupBy) {
      investments = portfolioCalculator.getInvestmentsByGroup({
        groupBy,
        data: items
      });
    } else {
      investments = items.map(({ date, investmentValueWithCurrencyEffect }) => {
        return {
          date,
          investment: investmentValueWithCurrencyEffect
        };
      });
    }

    let streaks: PortfolioInvestments['streaks'];

    if (savingsRate) {
      streaks = this.getStreaks({
        investments,
        savingsRate: groupBy === 'year' ? 12 * savingsRate : savingsRate
      });
    }

    return {
      investments,
      streaks
    };
  }

  public async getLookup({
    filters,
    impersonationId,
    userId
  }: {
    dateRange?: DateRange;
    filters?: Filter[];
    impersonationId: string;
    userId: string;
  }): Promise<LookupItem[]> {
    userId = await this.getUserId(impersonationId, userId);
    const user = await this.userService.user({ id: userId });
    const userCurrency = this.getUserCurrency(user);

    const { activities } = await this.orderService.getOrders({
      filters,
      userCurrency,
      userId
    });

    return uniqBy(activities, (activity) => {
      return getAssetProfileIdentifier({
        dataSource: activity.SymbolProfile.dataSource,
        symbol: activity.SymbolProfile.symbol
      });
    }).map((activity) => ({
      assetClass: activity.SymbolProfile.assetClass,
      assetSubClass: activity.SymbolProfile.assetSubClass,
      currency: activity.SymbolProfile.currency,
      dataProviderInfo: {
        isPremium: false,
        name: 'Ghostfolio API'
      },
      dataSource: activity.SymbolProfile.dataSource,
      name: activity.SymbolProfile.name,
      symbol: activity.SymbolProfile.symbol
    }));
  }

  public async getDetails({
    dateRange = 'max',
    filters,
    impersonationId,
    userId,
    withExcludedAccounts = false,
    withMarkets = false,
    withSummary = false
  }: {
    dateRange?: DateRange;
    filters?: Filter[];
    impersonationId: string;
    userId: string;
    withExcludedAccounts?: boolean;
    withMarkets?: boolean;
    withSummary?: boolean;
  }): Promise<PortfolioDetails & { hasErrors: boolean }> {
    userId = await this.getUserId(impersonationId, userId);
    const user = await this.userService.user({ id: userId });
    const userCurrency = this.getUserCurrency(user);

    const emergencyFund = new Big(
      (user.Settings?.settings as UserSettings)?.emergencyFund ?? 0
    );

    const { activities } = await this.orderService.getOrders({
      filters,
      userCurrency,
      userId,
      withExcludedAccounts
    });

    const portfolioCalculator = this.calculatorFactory.createCalculator({
      activities,
      dateRange,
      userId,
      calculationType: PerformanceCalculationType.TWR,
      currency: userCurrency,
      hasFilters: true, // disable cache
      isExperimentalFeatures:
        this.request.user?.Settings.settings.isExperimentalFeatures
    });

    const { currentValueInBaseCurrency, hasErrors, positions } =
      await portfolioCalculator.getSnapshot();

    const cashDetails = await this.accountService.getCashDetails({
      filters,
      userId,
      currency: userCurrency
    });

    const holdings: PortfolioDetails['holdings'] = {};

    const totalValueInBaseCurrency = currentValueInBaseCurrency.plus(
      cashDetails.balanceInBaseCurrency
    );

    const isFilteredByAccount =
      filters?.some(({ type }) => {
        return type === 'ACCOUNT';
      }) ?? false;

    const isFilteredByCash = filters?.some(({ id, type }) => {
      return id === AssetClass.LIQUIDITY && type === 'ASSET_CLASS';
    });

    const isFilteredByClosedHoldings =
      filters?.some(({ id, type }) => {
        return id === 'CLOSED' && type === 'HOLDING_TYPE';
      }) ?? false;

    let filteredValueInBaseCurrency = isFilteredByAccount
      ? totalValueInBaseCurrency
      : currentValueInBaseCurrency;

    if (
      filters?.length === 0 ||
      (filters?.length === 1 &&
        filters[0].id === AssetClass.LIQUIDITY &&
        filters[0].type === 'ASSET_CLASS')
    ) {
      filteredValueInBaseCurrency = filteredValueInBaseCurrency.plus(
        cashDetails.balanceInBaseCurrency
      );
    }

    const dataGatheringItems = positions.map(({ dataSource, symbol }) => {
      return {
        dataSource,
        symbol
      };
    });

    const [dataProviderResponses, symbolProfiles] = await Promise.all([
      this.dataProviderService.getQuotes({ user, items: dataGatheringItems }),
      this.symbolProfileService.getSymbolProfiles(dataGatheringItems)
    ]);

    const symbolProfileMap: { [symbol: string]: EnhancedSymbolProfile } = {};
    for (const symbolProfile of symbolProfiles) {
      symbolProfileMap[symbolProfile.symbol] = symbolProfile;
    }

    const portfolioItemsNow: { [symbol: string]: TimelinePosition } = {};
    for (const position of positions) {
      portfolioItemsNow[position.symbol] = position;
    }

    for (const {
      currency,
      dividend,
      firstBuyDate,
      grossPerformance,
      grossPerformanceWithCurrencyEffect,
      grossPerformancePercentage,
      grossPerformancePercentageWithCurrencyEffect,
      investment,
      marketPrice,
      netPerformance,
      netPerformancePercentage,
      netPerformancePercentageWithCurrencyEffect,
      netPerformanceWithCurrencyEffect,
      quantity,
      symbol,
      tags,
      transactionCount,
      valueInBaseCurrency
    } of positions) {
      if (isFilteredByClosedHoldings === true) {
        if (!quantity.eq(0)) {
          // Ignore positions with a quantity
          continue;
        }
      } else {
        if (quantity.eq(0)) {
          // Ignore positions without any quantity
          continue;
        }
      }

      const assetProfile = symbolProfileMap[symbol];
      const dataProviderResponse = dataProviderResponses[symbol];

      let markets: PortfolioPosition['markets'];
      let marketsAdvanced: PortfolioPosition['marketsAdvanced'];

      if (withMarkets) {
        ({ markets, marketsAdvanced } = this.getMarkets({
          assetProfile,
          valueInBaseCurrency
        }));
      }

      holdings[symbol] = {
        currency,
        markets,
        marketsAdvanced,
        marketPrice,
        symbol,
        tags,
        transactionCount,
        allocationInPercentage: filteredValueInBaseCurrency.eq(0)
          ? 0
          : valueInBaseCurrency.div(filteredValueInBaseCurrency).toNumber(),
        assetClass: assetProfile.assetClass,
        assetSubClass: assetProfile.assetSubClass,
        countries: assetProfile.countries,
        dataSource: assetProfile.dataSource,
        dateOfFirstActivity: parseDate(firstBuyDate),
        dividend: dividend?.toNumber() ?? 0,
        grossPerformance: grossPerformance?.toNumber() ?? 0,
        grossPerformancePercent: grossPerformancePercentage?.toNumber() ?? 0,
        grossPerformancePercentWithCurrencyEffect:
          grossPerformancePercentageWithCurrencyEffect?.toNumber() ?? 0,
        grossPerformanceWithCurrencyEffect:
          grossPerformanceWithCurrencyEffect?.toNumber() ?? 0,
        holdings: assetProfile.holdings,
        investment: investment.toNumber(),
        marketState: dataProviderResponse?.marketState ?? 'delayed',
        name: assetProfile.name,
        netPerformance: netPerformance?.toNumber() ?? 0,
        netPerformancePercent: netPerformancePercentage?.toNumber() ?? 0,
        netPerformancePercentWithCurrencyEffect:
          netPerformancePercentageWithCurrencyEffect?.toNumber() ?? 0,
        netPerformanceWithCurrencyEffect:
          netPerformanceWithCurrencyEffect?.toNumber() ?? 0,
        quantity: quantity.toNumber(),
        sectors: assetProfile.sectors,
        url: assetProfile.url,
        valueInBaseCurrency: valueInBaseCurrency.toNumber()
      };
    }

    if (filters?.length === 0 || isFilteredByAccount || isFilteredByCash) {
      const cashPositions = await this.getCashPositions({
        cashDetails,
        userCurrency,
        value: filteredValueInBaseCurrency
      });

      for (const symbol of Object.keys(cashPositions)) {
        holdings[symbol] = cashPositions[symbol];
      }
    }

    const { accounts, platforms } = await this.getValueOfAccountsAndPlatforms({
      activities,
      filters,
      portfolioItemsNow,
      userCurrency,
      userId,
      withExcludedAccounts
    });

    if (
      filters?.length === 1 &&
      filters[0].id === EMERGENCY_FUND_TAG_ID &&
      filters[0].type === 'TAG'
    ) {
      const emergencyFundCashPositions = await this.getCashPositions({
        cashDetails,
        userCurrency,
        value: filteredValueInBaseCurrency
      });

      const emergencyFundInCash = emergencyFund
        .minus(
          this.getEmergencyFundPositionsValueInBaseCurrency({
            holdings
          })
        )
        .toNumber();

      filteredValueInBaseCurrency = emergencyFund;

      accounts[UNKNOWN_KEY] = {
        balance: 0,
        currency: userCurrency,
        name: UNKNOWN_KEY,
        valueInBaseCurrency: emergencyFundInCash
      };

      holdings[userCurrency] = {
        ...emergencyFundCashPositions[userCurrency],
        investment: emergencyFundInCash,
        valueInBaseCurrency: emergencyFundInCash
      };
    }

    let summary: PortfolioSummary;

    if (withSummary) {
      summary = await this.getSummary({
        filteredValueInBaseCurrency,
        holdings,
        impersonationId,
        portfolioCalculator,
        userCurrency,
        userId,
        balanceInBaseCurrency: cashDetails.balanceInBaseCurrency,
        emergencyFundPositionsValueInBaseCurrency:
          this.getEmergencyFundPositionsValueInBaseCurrency({
            holdings
          })
      });
    }

    return {
      accounts,
      hasErrors,
      holdings,
      platforms,
      summary
    };
  }

  public async getPosition(
    aDataSource: DataSource,
    aImpersonationId: string,
    aSymbol: string
  ): Promise<PortfolioHoldingDetail> {
    const userId = await this.getUserId(aImpersonationId, this.request.user.id);
    const user = await this.userService.user({ id: userId });
    const userCurrency = this.getUserCurrency(user);

    const { activities } = await this.orderService.getOrders({
      userCurrency,
      userId,
      withExcludedAccounts: true
    });

    const orders = activities.filter(({ SymbolProfile }) => {
      return (
        SymbolProfile.dataSource === aDataSource &&
        SymbolProfile.symbol === aSymbol
      );
    });

    if (orders.length <= 0) {
      return {
        accounts: [],
        averagePrice: undefined,
        dataProviderInfo: undefined,
        dividendInBaseCurrency: undefined,
        dividendYieldPercent: undefined,
        dividendYieldPercentWithCurrencyEffect: undefined,
        feeInBaseCurrency: undefined,
        firstBuyDate: undefined,
        grossPerformance: undefined,
        grossPerformancePercent: undefined,
        grossPerformancePercentWithCurrencyEffect: undefined,
        grossPerformanceWithCurrencyEffect: undefined,
        historicalData: [],
        investment: undefined,
        marketPrice: undefined,
        maxPrice: undefined,
        minPrice: undefined,
        netPerformance: undefined,
        netPerformancePercent: undefined,
        netPerformancePercentWithCurrencyEffect: undefined,
        netPerformanceWithCurrencyEffect: undefined,
        orders: [],
        quantity: undefined,
        SymbolProfile: undefined,
        tags: [],
        transactionCount: undefined,
        value: undefined
      };
    }

    const [SymbolProfile] = await this.symbolProfileService.getSymbolProfiles([
      { dataSource: aDataSource, symbol: aSymbol }
    ]);

    const portfolioCalculator = this.calculatorFactory.createCalculator({
      userId,
      activities: orders.filter((order) => {
        return ['BUY', 'DIVIDEND', 'ITEM', 'SELL'].includes(order.type);
      }),
      calculationType: PerformanceCalculationType.TWR,
      currency: userCurrency,
      hasFilters: true,
      isExperimentalFeatures:
        this.request.user.Settings.settings.isExperimentalFeatures
    });

    const portfolioStart = portfolioCalculator.getStartDate();
    const transactionPoints = portfolioCalculator.getTransactionPoints();

    const { positions } = await portfolioCalculator.getSnapshot();

    const position = positions.find(({ symbol }) => {
      return symbol === aSymbol;
    });

    if (position) {
      const {
        averagePrice,
        currency,
        dataSource,
        dividendInBaseCurrency,
        fee,
        firstBuyDate,
        marketPrice,
        quantity,
        tags,
        timeWeightedInvestment,
        timeWeightedInvestmentWithCurrencyEffect,
        transactionCount
      } = position;

      const accounts: PortfolioHoldingDetail['accounts'] = uniqBy(
        orders.filter(({ Account }) => {
          return Account;
        }),
        'Account.id'
      ).map(({ Account }) => {
        return Account;
      });

      const dividendYieldPercent = this.getAnnualizedPerformancePercent({
        daysInMarket: differenceInDays(new Date(), parseDate(firstBuyDate)),
        netPerformancePercentage: timeWeightedInvestment.eq(0)
          ? new Big(0)
          : dividendInBaseCurrency.div(timeWeightedInvestment)
      });

      const dividendYieldPercentWithCurrencyEffect =
        this.getAnnualizedPerformancePercent({
          daysInMarket: differenceInDays(new Date(), parseDate(firstBuyDate)),
          netPerformancePercentage: timeWeightedInvestmentWithCurrencyEffect.eq(
            0
          )
            ? new Big(0)
            : dividendInBaseCurrency.div(
                timeWeightedInvestmentWithCurrencyEffect
              )
        });

      const historicalData = await this.dataProviderService.getHistorical(
        [{ dataSource, symbol: aSymbol }],
        'day',
        parseISO(firstBuyDate),
        new Date()
      );

      const historicalDataArray: HistoricalDataItem[] = [];
      let maxPrice = Math.max(orders[0].unitPrice, marketPrice);
      let minPrice = Math.min(orders[0].unitPrice, marketPrice);

      if (historicalData[aSymbol]) {
        let j = -1;
        for (const [date, { marketPrice }] of Object.entries(
          historicalData[aSymbol]
        )) {
          while (
            j + 1 < transactionPoints.length &&
            !isAfter(parseDate(transactionPoints[j + 1].date), parseDate(date))
          ) {
            j++;
          }

          let currentAveragePrice = 0;
          let currentQuantity = 0;

          const currentSymbol = transactionPoints[j]?.items.find(
            ({ symbol }) => {
              return symbol === aSymbol;
            }
          );

          if (currentSymbol) {
            currentAveragePrice = currentSymbol.averagePrice.toNumber();
            currentQuantity = currentSymbol.quantity.toNumber();
          }

          historicalDataArray.push({
            date,
            averagePrice: currentAveragePrice,
            marketPrice:
              historicalDataArray.length > 0
                ? marketPrice
                : currentAveragePrice,
            quantity: currentQuantity
          });

          maxPrice = Math.max(marketPrice ?? 0, maxPrice);
          minPrice = Math.min(marketPrice ?? Number.MAX_SAFE_INTEGER, minPrice);
        }
      } else {
        // Add historical entry for buy date, if no historical data available
        historicalDataArray.push({
          averagePrice: orders[0].unitPrice,
          date: firstBuyDate,
          marketPrice: orders[0].unitPrice,
          quantity: orders[0].quantity
        });
      }

      return {
        accounts,
        firstBuyDate,
        marketPrice,
        maxPrice,
        minPrice,
        orders,
        SymbolProfile,
        tags,
        transactionCount,
        averagePrice: averagePrice.toNumber(),
        dataProviderInfo: portfolioCalculator.getDataProviderInfos()?.[0],
        dividendInBaseCurrency: dividendInBaseCurrency.toNumber(),
        dividendYieldPercent: dividendYieldPercent.toNumber(),
        dividendYieldPercentWithCurrencyEffect:
          dividendYieldPercentWithCurrencyEffect.toNumber(),
        feeInBaseCurrency: this.exchangeRateDataService.toCurrency(
          fee.toNumber(),
          SymbolProfile.currency,
          userCurrency
        ),
        grossPerformance: position.grossPerformance?.toNumber(),
        grossPerformancePercent:
          position.grossPerformancePercentage?.toNumber(),
        grossPerformancePercentWithCurrencyEffect:
          position.grossPerformancePercentageWithCurrencyEffect?.toNumber(),
        grossPerformanceWithCurrencyEffect:
          position.grossPerformanceWithCurrencyEffect?.toNumber(),
        historicalData: historicalDataArray,
        investment: position.investment?.toNumber(),
        netPerformance: position.netPerformance?.toNumber(),
        netPerformancePercent: position.netPerformancePercentage?.toNumber(),
        netPerformancePercentWithCurrencyEffect:
          position.netPerformancePercentageWithCurrencyEffect?.toNumber(),
        netPerformanceWithCurrencyEffect:
          position.netPerformanceWithCurrencyEffect?.toNumber(),
        quantity: quantity.toNumber(),
        value: this.exchangeRateDataService.toCurrency(
          quantity.mul(marketPrice ?? 0).toNumber(),
          currency,
          userCurrency
        )
      };
    } else {
      const currentData = await this.dataProviderService.getQuotes({
        user,
        items: [{ dataSource: DataSource.YAHOO, symbol: aSymbol }]
      });
      const marketPrice = currentData[aSymbol]?.marketPrice;

      let historicalData = await this.dataProviderService.getHistorical(
        [{ dataSource: DataSource.YAHOO, symbol: aSymbol }],
        'day',
        portfolioStart,
        new Date()
      );

      if (isEmpty(historicalData)) {
        try {
          historicalData = await this.dataProviderService.getHistoricalRaw({
            dataGatheringItems: [
              { dataSource: DataSource.YAHOO, symbol: aSymbol }
            ],
            from: portfolioStart,
            to: new Date()
          });
        } catch {
          historicalData = {
            [aSymbol]: {}
          };
        }
      }

      const historicalDataArray: HistoricalDataItem[] = [];
      let maxPrice = marketPrice;
      let minPrice = marketPrice;

      for (const [date, { marketPrice }] of Object.entries(
        historicalData[aSymbol]
      )) {
        historicalDataArray.push({
          date,
          value: marketPrice
        });

        maxPrice = Math.max(marketPrice ?? 0, maxPrice);
        minPrice = Math.min(marketPrice ?? Number.MAX_SAFE_INTEGER, minPrice);
      }

      return {
        marketPrice,
        maxPrice,
        minPrice,
        orders,
        SymbolProfile,
        accounts: [],
        averagePrice: 0,
        dataProviderInfo: undefined,
        dividendInBaseCurrency: 0,
        dividendYieldPercent: 0,
        dividendYieldPercentWithCurrencyEffect: 0,
        feeInBaseCurrency: 0,
        firstBuyDate: undefined,
        grossPerformance: undefined,
        grossPerformancePercent: undefined,
        grossPerformancePercentWithCurrencyEffect: undefined,
        grossPerformanceWithCurrencyEffect: undefined,
        historicalData: historicalDataArray,
        investment: 0,
        netPerformance: undefined,
        netPerformancePercent: undefined,
        netPerformancePercentWithCurrencyEffect: undefined,
        netPerformanceWithCurrencyEffect: undefined,
        quantity: 0,
        tags: [],
        transactionCount: undefined,
        value: 0
      };
    }
  }

  public async getPositions({
    dateRange = 'max',
    filters,
    impersonationId
  }: {
    dateRange?: DateRange;
    filters?: Filter[];
    impersonationId: string;
  }): Promise<{ hasErrors: boolean; positions: Position[] }> {
    const searchQuery = filters.find(({ type }) => {
      return type === 'SEARCH_QUERY';
    })?.id;
    const userId = await this.getUserId(impersonationId, this.request.user.id);
    const user = await this.userService.user({ id: userId });

    const { endDate } = getInterval(dateRange);

    const { activities } = await this.orderService.getOrders({
      endDate,
      filters,
      userId,
      userCurrency: this.getUserCurrency()
    });

    if (activities?.length <= 0) {
      return {
        hasErrors: false,
        positions: []
      };
    }

    const portfolioCalculator = this.calculatorFactory.createCalculator({
      activities,
      dateRange,
      userId,
      calculationType: PerformanceCalculationType.TWR,
      currency: this.request.user.Settings.settings.baseCurrency,
      hasFilters: filters?.length > 0,
      isExperimentalFeatures:
        this.request.user.Settings.settings.isExperimentalFeatures
    });

    let { hasErrors, positions } = await portfolioCalculator.getSnapshot();

    positions = positions.filter(({ quantity }) => {
      return !quantity.eq(0);
    });

    const dataGatheringItems = positions.map(({ dataSource, symbol }) => {
      return {
        dataSource,
        symbol
      };
    });

    const [dataProviderResponses, symbolProfiles] = await Promise.all([
      this.dataProviderService.getQuotes({ user, items: dataGatheringItems }),
      this.symbolProfileService.getSymbolProfiles(
        positions.map(({ dataSource, symbol }) => {
          return { dataSource, symbol };
        })
      )
    ]);

    const symbolProfileMap: { [symbol: string]: EnhancedSymbolProfile } = {};

    for (const symbolProfile of symbolProfiles) {
      symbolProfileMap[symbolProfile.symbol] = symbolProfile;
    }

    if (searchQuery) {
      positions = positions.filter(({ symbol }) => {
        const enhancedSymbolProfile = symbolProfileMap[symbol];

        return (
          enhancedSymbolProfile.isin?.toLowerCase().startsWith(searchQuery) ||
          enhancedSymbolProfile.name?.toLowerCase().startsWith(searchQuery) ||
          enhancedSymbolProfile.symbol?.toLowerCase().startsWith(searchQuery)
        );
      });
    }

    return {
      hasErrors,
      positions: positions.map(
        ({
          averagePrice,
          currency,
          dataSource,
          firstBuyDate,
          grossPerformance,
          grossPerformancePercentage,
          grossPerformancePercentageWithCurrencyEffect,
          grossPerformanceWithCurrencyEffect,
          investment,
          investmentWithCurrencyEffect,
          netPerformance,
          netPerformancePercentage,
          netPerformancePercentageWithCurrencyEffect,
          netPerformanceWithCurrencyEffect,
          quantity,
          symbol,
          timeWeightedInvestment,
          timeWeightedInvestmentWithCurrencyEffect,
          transactionCount
        }) => {
          return {
            currency,
            dataSource,
            firstBuyDate,
            symbol,
            transactionCount,
            assetClass: symbolProfileMap[symbol].assetClass,
            assetSubClass: symbolProfileMap[symbol].assetSubClass,
            averagePrice: averagePrice.toNumber(),
            grossPerformance: grossPerformance?.toNumber() ?? null,
            grossPerformancePercentage:
              grossPerformancePercentage?.toNumber() ?? null,
            grossPerformancePercentageWithCurrencyEffect:
              grossPerformancePercentageWithCurrencyEffect?.toNumber() ?? null,
            grossPerformanceWithCurrencyEffect:
              grossPerformanceWithCurrencyEffect?.toNumber() ?? null,
            investment: investment.toNumber(),
            investmentWithCurrencyEffect:
              investmentWithCurrencyEffect?.toNumber(),
            marketState:
              dataProviderResponses[symbol]?.marketState ?? 'delayed',
            name: symbolProfileMap[symbol].name,
            netPerformance: netPerformance?.toNumber() ?? null,
            netPerformancePercentage:
              netPerformancePercentage?.toNumber() ?? null,
            netPerformancePercentageWithCurrencyEffect:
              netPerformancePercentageWithCurrencyEffect?.toNumber() ?? null,
            netPerformanceWithCurrencyEffect:
              netPerformanceWithCurrencyEffect?.toNumber() ?? null,
            quantity: quantity.toNumber(),
            timeWeightedInvestment: timeWeightedInvestment?.toNumber(),
            timeWeightedInvestmentWithCurrencyEffect:
              timeWeightedInvestmentWithCurrencyEffect?.toNumber()
          };
        }
      )
    };
  }

  public async getPerformance({
    dateRange = 'max',
    filters,
    impersonationId,
    userId,
    withExcludedAccounts = false
  }: {
    dateRange?: DateRange;
    filters?: Filter[];
    impersonationId: string;
    userId: string;
    withExcludedAccounts?: boolean;
  }): Promise<PortfolioPerformanceResponse> {
    userId = await this.getUserId(impersonationId, userId);
    const user = await this.userService.user({ id: userId });
    const userCurrency = this.getUserCurrency(user);

    const accountBalances = await this.accountBalanceService.getAccountBalances(
      { filters, user, withExcludedAccounts }
    );

    let accountBalanceItems: HistoricalDataItem[] = Object.values(
      // Reduce the array to a map with unique dates as keys
      accountBalances.balances.reduce(
        (
          map: { [date: string]: HistoricalDataItem },
          { date, valueInBaseCurrency }
        ) => {
          const formattedDate = format(date, DATE_FORMAT);

          if (map[formattedDate]) {
            // If the value exists, add the current value to the existing one
            map[formattedDate].value += valueInBaseCurrency;
          } else {
            // Otherwise, initialize the value for that date
            map[formattedDate] = {
              date: formattedDate,
              value: valueInBaseCurrency
            };
          }

          return map;
        },
        {}
      )
    );

    const { endDate } = getInterval(dateRange);

    const { activities } = await this.orderService.getOrders({
      endDate,
      filters,
      userCurrency,
      userId,
      withExcludedAccounts
    });

    if (accountBalanceItems?.length <= 0 && activities?.length <= 0) {
      return {
        chart: [],
        firstOrderDate: undefined,
        hasErrors: false,
        performance: {
          currentNetWorth: 0,
          currentValueInBaseCurrency: 0,
          grossPerformance: 0,
          grossPerformancePercentage: 0,
          grossPerformancePercentageWithCurrencyEffect: 0,
          grossPerformanceWithCurrencyEffect: 0,
          netPerformance: 0,
          netPerformancePercentage: 0,
          netPerformancePercentageWithCurrencyEffect: 0,
          netPerformanceWithCurrencyEffect: 0,
          totalInvestment: 0
        }
      };
    }

    const portfolioCalculator = this.calculatorFactory.createCalculator({
      accountBalanceItems,
      activities,
      dateRange,
      userId,
      calculationType: PerformanceCalculationType.TWR,
      currency: userCurrency,
      hasFilters: filters?.length > 0,
      isExperimentalFeatures:
        this.request.user.Settings.settings.isExperimentalFeatures
    });

    const {
      currentValueInBaseCurrency,
      errors,
      grossPerformance,
      grossPerformancePercentage,
      grossPerformancePercentageWithCurrencyEffect,
      grossPerformanceWithCurrencyEffect,
      hasErrors,
      netPerformance,
      netPerformancePercentage,
      netPerformancePercentageWithCurrencyEffect,
      netPerformanceWithCurrencyEffect,
      totalInvestment
    } = await portfolioCalculator.getSnapshot();

    let currentNetPerformance = netPerformance;

    let currentNetPerformancePercentage = netPerformancePercentage;

    let currentNetPerformancePercentageWithCurrencyEffect =
      netPerformancePercentageWithCurrencyEffect;

    let currentNetPerformanceWithCurrencyEffect =
      netPerformanceWithCurrencyEffect;

    let currentNetWorth = 0;

    const items = await portfolioCalculator.getChart({
      dateRange
    });

    const itemOfToday = items.find(({ date }) => {
      return date === format(new Date(), DATE_FORMAT);
    });

    if (itemOfToday) {
      currentNetPerformance = new Big(itemOfToday.netPerformance);

      currentNetPerformancePercentage = new Big(
        itemOfToday.netPerformanceInPercentage
      ).div(100);

      currentNetPerformancePercentageWithCurrencyEffect = new Big(
        itemOfToday.netPerformanceInPercentageWithCurrencyEffect
      ).div(100);

      currentNetPerformanceWithCurrencyEffect = new Big(
        itemOfToday.netPerformanceWithCurrencyEffect
      );

      currentNetWorth = itemOfToday.netWorth;
    }

    return {
      errors,
      hasErrors,
      chart: items,
      firstOrderDate: parseDate(items[0]?.date),
      performance: {
        currentNetWorth,
        currentValueInBaseCurrency: currentValueInBaseCurrency.toNumber(),
        grossPerformance: grossPerformance.toNumber(),
        grossPerformancePercentage: grossPerformancePercentage.toNumber(),
        grossPerformancePercentageWithCurrencyEffect:
          grossPerformancePercentageWithCurrencyEffect.toNumber(),
        grossPerformanceWithCurrencyEffect:
          grossPerformanceWithCurrencyEffect.toNumber(),
        netPerformance: currentNetPerformance.toNumber(),
        netPerformancePercentage: currentNetPerformancePercentage.toNumber(),
        netPerformancePercentageWithCurrencyEffect:
          currentNetPerformancePercentageWithCurrencyEffect.toNumber(),
        netPerformanceWithCurrencyEffect:
          currentNetPerformanceWithCurrencyEffect.toNumber(),
        totalInvestment: totalInvestment.toNumber()
      }
    };
  }

  public async getReport(impersonationId: string): Promise<PortfolioReport> {
    const userId = await this.getUserId(impersonationId, this.request.user.id);
    const user = await this.userService.user({ id: userId });
    const userCurrency = this.getUserCurrency(user);

    const { activities } = await this.orderService.getOrders({
      userCurrency,
      userId
    });

    const portfolioCalculator = this.calculatorFactory.createCalculator({
      activities,
      userId,
      calculationType: PerformanceCalculationType.TWR,
      currency: this.request.user.Settings.settings.baseCurrency,
      hasFilters: false,
      isExperimentalFeatures:
        this.request.user.Settings.settings.isExperimentalFeatures
    });

    let { totalFeesWithCurrencyEffect, positions, totalInvestment } =
      await portfolioCalculator.getSnapshot();

    positions = positions.filter((item) => !item.quantity.eq(0));

    const portfolioItemsNow: { [symbol: string]: TimelinePosition } = {};

    for (const position of positions) {
      portfolioItemsNow[position.symbol] = position;
    }

    const { accounts } = await this.getValueOfAccountsAndPlatforms({
      activities,
      portfolioItemsNow,
      userCurrency,
      userId
    });

    const userSettings = <UserSettings>this.request.user.Settings.settings;

    return {
      rules: {
        accountClusterRisk: isEmpty(activities)
          ? undefined
          : await this.rulesService.evaluate(
              [
                new AccountClusterRiskCurrentInvestment(
                  this.exchangeRateDataService,
                  accounts
                ),
                new AccountClusterRiskSingleAccount(
                  this.exchangeRateDataService,
                  accounts
                )
              ],
              userSettings
            ),
        currencyClusterRisk: isEmpty(activities)
          ? undefined
          : await this.rulesService.evaluate(
              [
                new CurrencyClusterRiskBaseCurrencyCurrentInvestment(
                  this.exchangeRateDataService,
                  positions
                ),
                new CurrencyClusterRiskCurrentInvestment(
                  this.exchangeRateDataService,
                  positions
                )
              ],
              userSettings
            ),
        emergencyFund: await this.rulesService.evaluate(
          [
            new EmergencyFundSetup(
              this.exchangeRateDataService,
              userSettings.emergencyFund
            )
          ],
          userSettings
        ),
        fees: await this.rulesService.evaluate(
          [
            new FeeRatioInitialInvestment(
              this.exchangeRateDataService,
              totalInvestment.toNumber(),
              totalFeesWithCurrencyEffect.toNumber()
            )
          ],
          userSettings
        )
      }
    };
  }

  private async getCashPositions({
    cashDetails,
    userCurrency,
    value
  }: {
    cashDetails: CashDetails;
    userCurrency: string;
    value: Big;
  }) {
    const cashPositions: PortfolioDetails['holdings'] = {
      [userCurrency]: this.getInitialCashPosition({
        balance: 0,
        currency: userCurrency
      })
    };

    for (const account of cashDetails.accounts) {
      const convertedBalance = this.exchangeRateDataService.toCurrency(
        account.balance,
        account.currency,
        userCurrency
      );

      if (convertedBalance === 0) {
        continue;
      }

      if (cashPositions[account.currency]) {
        cashPositions[account.currency].investment += convertedBalance;
        cashPositions[account.currency].valueInBaseCurrency += convertedBalance;
      } else {
        cashPositions[account.currency] = this.getInitialCashPosition({
          balance: convertedBalance,
          currency: account.currency
        });
      }
    }

    for (const symbol of Object.keys(cashPositions)) {
      // Calculate allocations for each currency
      cashPositions[symbol].allocationInPercentage = value.gt(0)
        ? new Big(cashPositions[symbol].valueInBaseCurrency)
            .div(value)
            .toNumber()
        : 0;
    }

    return cashPositions;
  }

  private getDividendsByGroup({
    dividends,
    groupBy
  }: {
    dividends: InvestmentItem[];
    groupBy: GroupBy;
  }): InvestmentItem[] {
    if (dividends.length === 0) {
      return [];
    }

    const dividendsByGroup: InvestmentItem[] = [];
    let currentDate: Date;
    let investmentByGroup = new Big(0);

    for (const [index, dividend] of dividends.entries()) {
      if (
        isSameYear(parseDate(dividend.date), currentDate) &&
        (groupBy === 'year' ||
          isSameMonth(parseDate(dividend.date), currentDate))
      ) {
        // Same group: Add up dividends

        investmentByGroup = investmentByGroup.plus(dividend.investment);
      } else {
        // New group: Store previous group and reset

        if (currentDate) {
          dividendsByGroup.push({
            date: format(
              set(currentDate, {
                date: 1,
                month: groupBy === 'year' ? 0 : currentDate.getMonth()
              }),
              DATE_FORMAT
            ),
            investment: investmentByGroup.toNumber()
          });
        }

        currentDate = parseDate(dividend.date);
        investmentByGroup = new Big(dividend.investment);
      }

      if (index === dividends.length - 1) {
        // Store current month (latest order)
        dividendsByGroup.push({
          date: format(
            set(currentDate, {
              date: 1,
              month: groupBy === 'year' ? 0 : currentDate.getMonth()
            }),
            DATE_FORMAT
          ),
          investment: investmentByGroup.toNumber()
        });
      }
    }

    return dividendsByGroup;
  }

  private getEmergencyFundPositionsValueInBaseCurrency({
    holdings
  }: {
    holdings: PortfolioDetails['holdings'];
  }) {
    const emergencyFundHoldings = Object.values(holdings).filter(({ tags }) => {
      return (
        tags?.some(({ id }) => {
          return id === EMERGENCY_FUND_TAG_ID;
        }) ?? false
      );
    });

    let valueInBaseCurrencyOfEmergencyFundPositions = new Big(0);

    for (const { valueInBaseCurrency } of emergencyFundHoldings) {
      valueInBaseCurrencyOfEmergencyFundPositions =
        valueInBaseCurrencyOfEmergencyFundPositions.plus(valueInBaseCurrency);
    }

    return valueInBaseCurrencyOfEmergencyFundPositions.toNumber();
  }

  private getInitialCashPosition({
    balance,
    currency
  }: {
    balance: number;
    currency: string;
  }): PortfolioPosition {
    return {
      currency,
      allocationInPercentage: 0,
      assetClass: AssetClass.LIQUIDITY,
      assetSubClass: AssetSubClass.CASH,
      countries: [],
      dataSource: undefined,
      dateOfFirstActivity: undefined,
      dividend: 0,
      grossPerformance: 0,
      grossPerformancePercent: 0,
      grossPerformancePercentWithCurrencyEffect: 0,
      grossPerformanceWithCurrencyEffect: 0,
      holdings: [],
      investment: balance,
      marketPrice: 0,
      marketState: 'open',
      name: currency,
      netPerformance: 0,
      netPerformancePercent: 0,
      netPerformancePercentWithCurrencyEffect: 0,
      netPerformanceWithCurrencyEffect: 0,
      quantity: 0,
      sectors: [],
      symbol: currency,
      tags: [],
      transactionCount: 0,
      valueInBaseCurrency: balance
    };
  }

  private getMarkets({
    assetProfile,
    valueInBaseCurrency
  }: {
    assetProfile: EnhancedSymbolProfile;
    valueInBaseCurrency: Big;
  }) {
    const markets = {
      [UNKNOWN_KEY]: 0,
      developedMarkets: 0,
      emergingMarkets: 0,
      otherMarkets: 0
    };
    const marketsAdvanced = {
      [UNKNOWN_KEY]: 0,
      asiaPacific: 0,
      emergingMarkets: 0,
      europe: 0,
      japan: 0,
      northAmerica: 0,
      otherMarkets: 0
    };

    if (assetProfile.countries.length > 0) {
      for (const country of assetProfile.countries) {
        if (developedMarkets.includes(country.code)) {
          markets.developedMarkets = new Big(markets.developedMarkets)
            .plus(country.weight)
            .toNumber();
        } else if (emergingMarkets.includes(country.code)) {
          markets.emergingMarkets = new Big(markets.emergingMarkets)
            .plus(country.weight)
            .toNumber();
        } else {
          markets.otherMarkets = new Big(markets.otherMarkets)
            .plus(country.weight)
            .toNumber();
        }

        if (country.code === 'JP') {
          marketsAdvanced.japan = new Big(marketsAdvanced.japan)
            .plus(country.weight)
            .toNumber();
        } else if (country.code === 'CA' || country.code === 'US') {
          marketsAdvanced.northAmerica = new Big(marketsAdvanced.northAmerica)
            .plus(country.weight)
            .toNumber();
        } else if (asiaPacificMarkets.includes(country.code)) {
          marketsAdvanced.asiaPacific = new Big(marketsAdvanced.asiaPacific)
            .plus(country.weight)
            .toNumber();
        } else if (emergingMarkets.includes(country.code)) {
          marketsAdvanced.emergingMarkets = new Big(
            marketsAdvanced.emergingMarkets
          )
            .plus(country.weight)
            .toNumber();
        } else if (europeMarkets.includes(country.code)) {
          marketsAdvanced.europe = new Big(marketsAdvanced.europe)
            .plus(country.weight)
            .toNumber();
        } else {
          marketsAdvanced.otherMarkets = new Big(marketsAdvanced.otherMarkets)
            .plus(country.weight)
            .toNumber();
        }
      }
    } else {
      markets[UNKNOWN_KEY] = new Big(markets[UNKNOWN_KEY])
        .plus(valueInBaseCurrency)
        .toNumber();

      marketsAdvanced[UNKNOWN_KEY] = new Big(marketsAdvanced[UNKNOWN_KEY])
        .plus(valueInBaseCurrency)
        .toNumber();
    }

    return { markets, marketsAdvanced };
  }

  private getStreaks({
    investments,
    savingsRate
  }: {
    investments: InvestmentItem[];
    savingsRate: number;
  }) {
    let currentStreak = 0;
    let longestStreak = 0;

    for (const { investment } of investments) {
      if (investment >= savingsRate) {
        currentStreak++;
        longestStreak = Math.max(longestStreak, currentStreak);
      } else {
        currentStreak = 0;
      }
    }

    return { currentStreak, longestStreak };
  }

  private async getSummary({
    balanceInBaseCurrency,
    emergencyFundPositionsValueInBaseCurrency,
    filteredValueInBaseCurrency,
    holdings,
    impersonationId,
    portfolioCalculator,
    userCurrency,
    userId
  }: {
    balanceInBaseCurrency: number;
    emergencyFundPositionsValueInBaseCurrency: number;
    filteredValueInBaseCurrency: Big;
    holdings: PortfolioDetails['holdings'];
    impersonationId: string;
    portfolioCalculator: PortfolioCalculator;
    userCurrency: string;
    userId: string;
  }): Promise<PortfolioSummary> {
    userId = await this.getUserId(impersonationId, userId);
    const user = await this.userService.user({ id: userId });

    const { activities } = await this.orderService.getOrders({
      userCurrency,
      userId,
      withExcludedAccounts: true
    });

    const excludedActivities: Activity[] = [];
    const nonExcludedActivities: Activity[] = [];

    for (const activity of activities) {
      if (activity.Account?.isExcluded) {
        excludedActivities.push(activity);
      } else {
        nonExcludedActivities.push(activity);
      }
    }

    const {
      currentValueInBaseCurrency,
      grossPerformance,
      grossPerformancePercentage,
      grossPerformancePercentageWithCurrencyEffect,
      grossPerformanceWithCurrencyEffect,
      netPerformance,
      netPerformancePercentage,
      netPerformancePercentageWithCurrencyEffect,
      netPerformanceWithCurrencyEffect,
      totalInvestment
    } = await portfolioCalculator.getSnapshot();

    const dividendInBaseCurrency =
      await portfolioCalculator.getDividendInBaseCurrency();

    const emergencyFund = new Big(
      Math.max(
        emergencyFundPositionsValueInBaseCurrency,
        (user.Settings?.settings as UserSettings)?.emergencyFund ?? 0
      )
    );

    const fees = await portfolioCalculator.getFeesInBaseCurrency();

    const firstOrderDate = portfolioCalculator.getStartDate();

    const interest = await portfolioCalculator.getInterestInBaseCurrency();

    const liabilities =
      await portfolioCalculator.getLiabilitiesInBaseCurrency();

    const valuables = await portfolioCalculator.getValuablesInBaseCurrency();

    const totalBuy = this.getSumOfActivityType({
      userCurrency,
      activities: nonExcludedActivities,
      activityType: 'BUY'
    }).toNumber();

    const totalSell = this.getSumOfActivityType({
      userCurrency,
      activities: nonExcludedActivities,
      activityType: 'SELL'
    }).toNumber();

    const cash = new Big(balanceInBaseCurrency)
      .minus(emergencyFund)
      .plus(emergencyFundPositionsValueInBaseCurrency)
      .toNumber();

    const committedFunds = new Big(totalBuy).minus(totalSell);

    const totalOfExcludedActivities = this.getSumOfActivityType({
      userCurrency,
      activities: excludedActivities,
      activityType: 'BUY'
    }).minus(
      this.getSumOfActivityType({
        userCurrency,
        activities: excludedActivities,
        activityType: 'SELL'
      })
    );

    const cashDetailsWithExcludedAccounts =
      await this.accountService.getCashDetails({
        userId,
        currency: userCurrency,
        withExcludedAccounts: true
      });

    const excludedBalanceInBaseCurrency = new Big(
      cashDetailsWithExcludedAccounts.balanceInBaseCurrency
    ).minus(balanceInBaseCurrency);

    const excludedAccountsAndActivities = excludedBalanceInBaseCurrency
      .plus(totalOfExcludedActivities)
      .toNumber();

    const netWorth = new Big(balanceInBaseCurrency)
      .plus(currentValueInBaseCurrency)
      .plus(valuables)
      .plus(excludedAccountsAndActivities)
      .minus(liabilities)
      .toNumber();

    const daysInMarket = differenceInDays(new Date(), firstOrderDate);

    const annualizedPerformancePercent = this.getAnnualizedPerformancePercent({
      daysInMarket,
      netPerformancePercentage: new Big(netPerformancePercentage)
    })?.toNumber();

    const annualizedPerformancePercentWithCurrencyEffect =
      this.getAnnualizedPerformancePercent({
        daysInMarket,
        netPerformancePercentage: new Big(
          netPerformancePercentageWithCurrencyEffect
        )
      })?.toNumber();

    return {
      annualizedPerformancePercent,
      annualizedPerformancePercentWithCurrencyEffect,
      cash,
      excludedAccountsAndActivities,
      firstOrderDate,
      totalBuy,
      totalSell,
      committedFunds: committedFunds.toNumber(),
      currentValueInBaseCurrency: currentValueInBaseCurrency.toNumber(),
      dividendInBaseCurrency: dividendInBaseCurrency.toNumber(),
      emergencyFund: {
        assets: emergencyFundPositionsValueInBaseCurrency,
        cash: emergencyFund
          .minus(emergencyFundPositionsValueInBaseCurrency)
          .toNumber(),
        total: emergencyFund.toNumber()
      },
      fees: fees.toNumber(),
      filteredValueInBaseCurrency: filteredValueInBaseCurrency.toNumber(),
      filteredValueInPercentage: netWorth
        ? filteredValueInBaseCurrency.div(netWorth).toNumber()
        : undefined,
      fireWealth: new Big(currentValueInBaseCurrency)
        .minus(emergencyFundPositionsValueInBaseCurrency)
        .toNumber(),
      grossPerformance: grossPerformance.toNumber(),
      grossPerformancePercentage: grossPerformancePercentage.toNumber(),
      grossPerformancePercentageWithCurrencyEffect:
        grossPerformancePercentageWithCurrencyEffect.toNumber(),
      grossPerformanceWithCurrencyEffect:
        grossPerformanceWithCurrencyEffect.toNumber(),
      interest: interest.toNumber(),
      items: valuables.toNumber(),
      liabilities: liabilities.toNumber(),
      netPerformance: netPerformance.toNumber(),
      netPerformancePercentage: netPerformancePercentage.toNumber(),
      netPerformancePercentageWithCurrencyEffect:
        netPerformancePercentageWithCurrencyEffect.toNumber(),
      netPerformanceWithCurrencyEffect:
        netPerformanceWithCurrencyEffect.toNumber(),
      ordersCount: activities.filter(({ type }) => {
        return ['BUY', 'SELL'].includes(type);
      }).length,
      totalInvestment: totalInvestment.toNumber(),
      totalValueInBaseCurrency: netWorth
    };
  }

  private getSumOfActivityType({
    activities,
    activityType,
    userCurrency
  }: {
    activities: Activity[];
    activityType: ActivityType;
    userCurrency: string;
  }) {
    return getSum(
      activities
        .filter(({ isDraft, type }) => {
          return isDraft === false && type === activityType;
        })
        .map(({ quantity, SymbolProfile, unitPrice }) => {
          return new Big(
            this.exchangeRateDataService.toCurrency(
              new Big(quantity).mul(unitPrice).toNumber(),
              SymbolProfile.currency,
              userCurrency
            )
          );
        })
    );
  }

  private getUserCurrency(aUser?: UserWithSettings) {
    return (
      aUser?.Settings?.settings.baseCurrency ??
      this.request.user?.Settings?.settings.baseCurrency ??
      DEFAULT_CURRENCY
    );
  }

  private async getUserId(aImpersonationId: string, aUserId: string) {
    const impersonationUserId =
      await this.impersonationService.validateImpersonationId(aImpersonationId);

    return impersonationUserId || aUserId;
  }

  private async getValueOfAccountsAndPlatforms({
    activities,
    filters = [],
    portfolioItemsNow,
    userCurrency,
    userId,
    withExcludedAccounts = false
  }: {
    activities: Activity[];
    filters?: Filter[];
    portfolioItemsNow: { [p: string]: TimelinePosition };
    userCurrency: string;
    userId: string;
    withExcludedAccounts?: boolean;
  }) {
    const accounts: PortfolioDetails['accounts'] = {};
    const platforms: PortfolioDetails['platforms'] = {};

    let currentAccounts: (Account & {
      Order?: Order[];
      Platform?: Platform;
    })[] = [];

    if (filters.length === 0) {
      currentAccounts = await this.accountService.getAccounts(userId);
    } else if (filters.length === 1 && filters[0].type === 'ACCOUNT') {
      currentAccounts = await this.accountService.accounts({
        include: { Platform: true },
        where: { id: filters[0].id }
      });
    } else {
      const accountIds = uniq(
        activities
          .filter(({ accountId }) => {
            return accountId;
          })
          .map(({ accountId }) => {
            return accountId;
          })
      );

      currentAccounts = await this.accountService.accounts({
        include: { Platform: true },
        where: { id: { in: accountIds } }
      });
    }

    currentAccounts = currentAccounts.filter((account) => {
      return withExcludedAccounts || account.isExcluded === false;
    });

    for (const account of currentAccounts) {
      const ordersByAccount = activities.filter(({ accountId }) => {
        return accountId === account.id;
      });

      accounts[account.id] = {
        balance: account.balance,
        currency: account.currency,
        name: account.name,
        valueInBaseCurrency: this.exchangeRateDataService.toCurrency(
          account.balance,
          account.currency,
          userCurrency
        )
      };

      if (platforms[account.Platform?.id || UNKNOWN_KEY]?.valueInBaseCurrency) {
        platforms[account.Platform?.id || UNKNOWN_KEY].valueInBaseCurrency +=
          this.exchangeRateDataService.toCurrency(
            account.balance,
            account.currency,
            userCurrency
          );
      } else {
        platforms[account.Platform?.id || UNKNOWN_KEY] = {
          balance: account.balance,
          currency: account.currency,
          name: account.Platform?.name,
          valueInBaseCurrency: this.exchangeRateDataService.toCurrency(
            account.balance,
            account.currency,
            userCurrency
          )
        };
      }

      for (const {
        Account,
        quantity,
        SymbolProfile,
        type
      } of ordersByAccount) {
        let currentValueOfSymbolInBaseCurrency =
          getFactor(type) *
          quantity *
          (portfolioItemsNow[SymbolProfile.symbol]?.marketPriceInBaseCurrency ??
            0);

        if (accounts[Account?.id || UNKNOWN_KEY]?.valueInBaseCurrency) {
          accounts[Account?.id || UNKNOWN_KEY].valueInBaseCurrency +=
            currentValueOfSymbolInBaseCurrency;
        } else {
          accounts[Account?.id || UNKNOWN_KEY] = {
            balance: 0,
            currency: Account?.currency,
            name: account.name,
            valueInBaseCurrency: currentValueOfSymbolInBaseCurrency
          };
        }

        if (
          platforms[Account?.Platform?.id || UNKNOWN_KEY]?.valueInBaseCurrency
        ) {
          platforms[Account?.Platform?.id || UNKNOWN_KEY].valueInBaseCurrency +=
            currentValueOfSymbolInBaseCurrency;
        } else {
          platforms[Account?.Platform?.id || UNKNOWN_KEY] = {
            balance: 0,
            currency: Account?.currency,
            name: account.Platform?.name,
            valueInBaseCurrency: currentValueOfSymbolInBaseCurrency
          };
        }
      }
    }

    return { accounts, platforms };
  }
}
