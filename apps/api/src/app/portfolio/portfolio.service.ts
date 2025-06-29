import { AccountBalanceService } from '@ghostfolio/api/app/account-balance/account-balance.service';
import { AccountService } from '@ghostfolio/api/app/account/account.service';
import { CashDetails } from '@ghostfolio/api/app/account/interfaces/cash-details.interface';
import { Activity } from '@ghostfolio/api/app/order/interfaces/activities.interface';
import { OrderService } from '@ghostfolio/api/app/order/order.service';
import { UserService } from '@ghostfolio/api/app/user/user.service';
import { getFactor } from '@ghostfolio/api/helper/portfolio.helper';
import { AccountClusterRiskCurrentInvestment } from '@ghostfolio/api/models/rules/account-cluster-risk/current-investment';
import { AccountClusterRiskSingleAccount } from '@ghostfolio/api/models/rules/account-cluster-risk/single-account';
import { AssetClassClusterRiskEquity } from '@ghostfolio/api/models/rules/asset-class-cluster-risk/equity';
import { AssetClassClusterRiskFixedIncome } from '@ghostfolio/api/models/rules/asset-class-cluster-risk/fixed-income';
import { CurrencyClusterRiskBaseCurrencyCurrentInvestment } from '@ghostfolio/api/models/rules/currency-cluster-risk/base-currency-current-investment';
import { CurrencyClusterRiskCurrentInvestment } from '@ghostfolio/api/models/rules/currency-cluster-risk/current-investment';
import { EconomicMarketClusterRiskDevelopedMarkets } from '@ghostfolio/api/models/rules/economic-market-cluster-risk/developed-markets';
import { EconomicMarketClusterRiskEmergingMarkets } from '@ghostfolio/api/models/rules/economic-market-cluster-risk/emerging-markets';
import { EmergencyFundSetup } from '@ghostfolio/api/models/rules/emergency-fund/emergency-fund-setup';
import { FeeRatioInitialInvestment } from '@ghostfolio/api/models/rules/fees/fee-ratio-initial-investment';
import { RegionalMarketClusterRiskAsiaPacific } from '@ghostfolio/api/models/rules/regional-market-cluster-risk/asia-pacific';
import { RegionalMarketClusterRiskEmergingMarkets } from '@ghostfolio/api/models/rules/regional-market-cluster-risk/emerging-markets';
import { RegionalMarketClusterRiskEurope } from '@ghostfolio/api/models/rules/regional-market-cluster-risk/europe';
import { RegionalMarketClusterRiskJapan } from '@ghostfolio/api/models/rules/regional-market-cluster-risk/japan';
import { RegionalMarketClusterRiskNorthAmerica } from '@ghostfolio/api/models/rules/regional-market-cluster-risk/north-america';
import { BenchmarkService } from '@ghostfolio/api/services/benchmark/benchmark.service';
import { DataProviderService } from '@ghostfolio/api/services/data-provider/data-provider.service';
import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.service';
import { I18nService } from '@ghostfolio/api/services/i18n/i18n.service';
import { ImpersonationService } from '@ghostfolio/api/services/impersonation/impersonation.service';
import { SymbolProfileService } from '@ghostfolio/api/services/symbol-profile/symbol-profile.service';
import {
  getAnnualizedPerformancePercent,
  getIntervalFromDateRange
} from '@ghostfolio/common/calculation-helper';
import {
  DEFAULT_CURRENCY,
  TAG_ID_EMERGENCY_FUND,
  UNKNOWN_KEY
} from '@ghostfolio/common/config';
import { DATE_FORMAT, getSum, parseDate } from '@ghostfolio/common/helper';
import {
  AccountsResponse,
  EnhancedSymbolProfile,
  Filter,
  HistoricalDataItem,
  InvestmentItem,
  PortfolioDetails,
  PortfolioHoldingResponse,
  PortfolioInvestments,
  PortfolioPerformanceResponse,
  PortfolioPosition,
  PortfolioReportResponse,
  PortfolioSummary,
  UserSettings
} from '@ghostfolio/common/interfaces';
import { TimelinePosition } from '@ghostfolio/common/models';
import {
  AccountWithValue,
  DateRange,
  GroupBy,
  RequestWithUser,
  UserWithSettings
} from '@ghostfolio/common/types';
import { PerformanceCalculationType } from '@ghostfolio/common/types/performance-calculation-type.type';

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
  Prisma,
  Tag
} from '@prisma/client';
import { Big } from 'big.js';
import {
  differenceInDays,
  format,
  isAfter,
  isBefore,
  isSameMonth,
  isSameYear,
  parseISO,
  set
} from 'date-fns';
import { isEmpty } from 'lodash';

import { PortfolioCalculator } from './calculator/portfolio-calculator';
import { PortfolioCalculatorFactory } from './calculator/portfolio-calculator.factory';
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
    private readonly benchmarkService: BenchmarkService,
    private readonly calculatorFactory: PortfolioCalculatorFactory,
    private readonly dataProviderService: DataProviderService,
    private readonly exchangeRateDataService: ExchangeRateDataService,
    private readonly i18nService: I18nService,
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

    const filterByAccount = filters?.find(({ type }) => {
      return type === 'ACCOUNT';
    })?.id;

    const filterByDataSource = filters?.find(({ type }) => {
      return type === 'DATA_SOURCE';
    })?.id;

    const filterBySymbol = filters?.find(({ type }) => {
      return type === 'SYMBOL';
    })?.id;

    if (filterByAccount) {
      where.id = filterByAccount;
    }

    if (filterByDataSource && filterBySymbol) {
      where.activities = {
        some: {
          SymbolProfile: {
            AND: [
              { dataSource: filterByDataSource as DataSource },
              { symbol: filterBySymbol }
            ]
          }
        }
      };
    }

    const [accounts, details] = await Promise.all([
      this.accountService.accounts({
        where,
        include: {
          activities: true,
          platform: true
        },
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

      for (const { isDraft } of account.activities) {
        if (!isDraft) {
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

      delete result.activities;

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
  }): Promise<AccountsResponse> {
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

  public async getDividends({
    activities,
    groupBy
  }: {
    activities: Activity[];
    groupBy?: GroupBy;
  }): Promise<InvestmentItem[]> {
    let dividends = activities.map(({ currency, date, value }) => {
      return {
        date: format(date, DATE_FORMAT),
        investment: this.exchangeRateDataService.toCurrency(
          value,
          currency,
          this.getUserCurrency()
        )
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
    const user = await this.userService.user({ id: userId });
    const userCurrency = this.getUserCurrency(user);

    const { endDate, startDate } = getIntervalFromDateRange(dateRange);

    const { activities } =
      await this.orderService.getOrdersForPortfolioCalculator({
        filters,
        userCurrency,
        userId
      });

    if (activities.length === 0) {
      return {
        investments: [],
        streaks: { currentStreak: 0, longestStreak: 0 }
      };
    }

    const portfolioCalculator = this.calculatorFactory.createCalculator({
      activities,
      filters,
      userId,
      calculationType: this.getUserPerformanceCalculationType(user),
      currency: userCurrency
    });

    const { historicalData } = await portfolioCalculator.getSnapshot();

    const items = historicalData.filter(({ date }) => {
      return !isBefore(date, startDate) && !isAfter(date, endDate);
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

    const { activities } =
      await this.orderService.getOrdersForPortfolioCalculator({
        filters,
        userCurrency,
        userId
      });

    const portfolioCalculator = this.calculatorFactory.createCalculator({
      activities,
      filters,
      userId,
      calculationType: this.getUserPerformanceCalculationType(user),
      currency: userCurrency
    });

    const { createdAt, currentValueInBaseCurrency, hasErrors, positions } =
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

    const assetProfileIdentifiers = positions.map(({ dataSource, symbol }) => {
      return {
        dataSource,
        symbol
      };
    });

    const symbolProfiles = await this.symbolProfileService.getSymbolProfiles(
      assetProfileIdentifiers
    );

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
      netPerformancePercentageWithCurrencyEffectMap,
      netPerformanceWithCurrencyEffectMap,
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

      let markets: PortfolioPosition['markets'];
      let marketsAdvanced: PortfolioPosition['marketsAdvanced'];

      if (withMarkets) {
        ({ markets, marketsAdvanced } = this.getMarkets({
          assetProfile
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
        holdings: assetProfile.holdings.map(
          ({ allocationInPercentage, name }) => {
            return {
              allocationInPercentage,
              name,
              valueInBaseCurrency: valueInBaseCurrency
                .mul(allocationInPercentage)
                .toNumber()
            };
          }
        ),
        investment: investment.toNumber(),
        name: assetProfile.name,
        netPerformance: netPerformance?.toNumber() ?? 0,
        netPerformancePercent: netPerformancePercentage?.toNumber() ?? 0,
        netPerformancePercentWithCurrencyEffect:
          netPerformancePercentageWithCurrencyEffectMap?.[
            dateRange
          ]?.toNumber() ?? 0,
        netPerformanceWithCurrencyEffect:
          netPerformanceWithCurrencyEffectMap?.[dateRange]?.toNumber() ?? 0,
        quantity: quantity.toNumber(),
        sectors: assetProfile.sectors,
        url: assetProfile.url,
        valueInBaseCurrency: valueInBaseCurrency.toNumber()
      };
    }

    if (filters?.length === 0 || isFilteredByAccount || isFilteredByCash) {
      const cashPositions = this.getCashPositions({
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
      filters[0].id === TAG_ID_EMERGENCY_FUND &&
      filters[0].type === 'TAG'
    ) {
      const emergencyFundCashPositions = this.getCashPositions({
        cashDetails,
        userCurrency,
        value: filteredValueInBaseCurrency
      });

      const emergencyFundInCash = emergencyFund
        .minus(
          this.getEmergencyFundHoldingsValueInBaseCurrency({
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

    let markets: PortfolioDetails['markets'];
    let marketsAdvanced: PortfolioDetails['marketsAdvanced'];

    if (withMarkets) {
      ({ markets, marketsAdvanced } = this.getAggregatedMarkets(holdings));
    }

    let summary: PortfolioSummary;

    if (withSummary) {
      summary = await this.getSummary({
        filteredValueInBaseCurrency,
        impersonationId,
        portfolioCalculator,
        userCurrency,
        userId,
        balanceInBaseCurrency: cashDetails.balanceInBaseCurrency,
        emergencyFundHoldingsValueInBaseCurrency:
          this.getEmergencyFundHoldingsValueInBaseCurrency({
            holdings
          })
      });
    }

    return {
      accounts,
      createdAt,
      hasErrors,
      holdings,
      markets,
      marketsAdvanced,
      platforms,
      summary
    };
  }

  public async getHolding(
    aDataSource: DataSource,
    aImpersonationId: string,
    aSymbol: string
  ): Promise<PortfolioHoldingResponse> {
    const userId = await this.getUserId(aImpersonationId, this.request.user.id);
    const user = await this.userService.user({ id: userId });
    const userCurrency = this.getUserCurrency(user);

    const { activities } =
      await this.orderService.getOrdersForPortfolioCalculator({
        userCurrency,
        userId
      });

    if (activities.length === 0) {
      return {
        activities: [],
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
        investmentInBaseCurrencyWithCurrencyEffect: undefined,
        marketPrice: undefined,
        marketPriceMax: undefined,
        marketPriceMin: undefined,
        netPerformance: undefined,
        netPerformancePercent: undefined,
        netPerformancePercentWithCurrencyEffect: undefined,
        netPerformanceWithCurrencyEffect: undefined,
        performances: undefined,
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
      activities,
      userId,
      calculationType: this.getUserPerformanceCalculationType(user),
      currency: userCurrency
    });

    const portfolioStart = portfolioCalculator.getStartDate();
    const transactionPoints = portfolioCalculator.getTransactionPoints();

    const { positions } = await portfolioCalculator.getSnapshot();

    const position = positions.find(({ dataSource, symbol }) => {
      return dataSource === aDataSource && symbol === aSymbol;
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
        symbol,
        tags,
        timeWeightedInvestment,
        timeWeightedInvestmentWithCurrencyEffect,
        transactionCount
      } = position;

      const activitiesOfHolding = activities.filter(({ SymbolProfile }) => {
        return (
          SymbolProfile.dataSource === dataSource &&
          SymbolProfile.symbol === symbol
        );
      });

      const dividendYieldPercent = getAnnualizedPerformancePercent({
        daysInMarket: differenceInDays(new Date(), parseDate(firstBuyDate)),
        netPerformancePercentage: timeWeightedInvestment.eq(0)
          ? new Big(0)
          : dividendInBaseCurrency.div(timeWeightedInvestment)
      });

      const dividendYieldPercentWithCurrencyEffect =
        getAnnualizedPerformancePercent({
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
      let marketPriceMax = Math.max(
        activitiesOfHolding[0].unitPriceInAssetProfileCurrency,
        marketPrice
      );
      let marketPriceMaxDate =
        marketPrice > activitiesOfHolding[0].unitPriceInAssetProfileCurrency
          ? new Date()
          : activitiesOfHolding[0].date;
      let marketPriceMin = Math.min(
        activitiesOfHolding[0].unitPriceInAssetProfileCurrency,
        marketPrice
      );

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

          if (marketPrice > marketPriceMax) {
            marketPriceMax = marketPrice;
            marketPriceMaxDate = parseISO(date);
          }
          marketPriceMin = Math.min(
            marketPrice ?? Number.MAX_SAFE_INTEGER,
            marketPriceMin
          );
        }
      } else {
        // Add historical entry for buy date, if no historical data available
        historicalDataArray.push({
          averagePrice: activitiesOfHolding[0].unitPriceInAssetProfileCurrency,
          date: firstBuyDate,
          marketPrice: activitiesOfHolding[0].unitPriceInAssetProfileCurrency,
          quantity: activitiesOfHolding[0].quantity
        });
      }

      const performancePercent =
        this.benchmarkService.calculateChangeInPercentage(
          marketPriceMax,
          marketPrice
        );

      return {
        firstBuyDate,
        marketPrice,
        marketPriceMax,
        marketPriceMin,
        SymbolProfile,
        tags,
        transactionCount,
        activities: activitiesOfHolding,
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
        investmentInBaseCurrencyWithCurrencyEffect:
          position.investmentWithCurrencyEffect?.toNumber(),
        netPerformance: position.netPerformance?.toNumber(),
        netPerformancePercent: position.netPerformancePercentage?.toNumber(),
        netPerformancePercentWithCurrencyEffect:
          position.netPerformancePercentageWithCurrencyEffectMap?.[
            'max'
          ]?.toNumber(),
        netPerformanceWithCurrencyEffect:
          position.netPerformanceWithCurrencyEffectMap?.['max']?.toNumber(),
        performances: {
          allTimeHigh: {
            performancePercent,
            date: marketPriceMaxDate
          }
        },
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
            assetProfileIdentifiers: [
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
      let marketPriceMax = marketPrice;
      let marketPriceMaxDate = new Date();
      let marketPriceMin = marketPrice;

      for (const [date, { marketPrice }] of Object.entries(
        historicalData[aSymbol]
      )) {
        historicalDataArray.push({
          date,
          value: marketPrice
        });

        if (marketPrice > marketPriceMax) {
          marketPriceMax = marketPrice;
          marketPriceMaxDate = parseISO(date);
        }
        marketPriceMin = Math.min(
          marketPrice ?? Number.MAX_SAFE_INTEGER,
          marketPriceMin
        );
      }

      const performancePercent =
        this.benchmarkService.calculateChangeInPercentage(
          marketPriceMax,
          marketPrice
        );

      return {
        marketPrice,
        marketPriceMax,
        marketPriceMin,
        SymbolProfile,
        activities: [],
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
        investmentInBaseCurrencyWithCurrencyEffect: 0,
        netPerformance: undefined,
        netPerformancePercent: undefined,
        netPerformancePercentWithCurrencyEffect: undefined,
        netPerformanceWithCurrencyEffect: undefined,
        performances: {
          allTimeHigh: {
            performancePercent,
            date: marketPriceMaxDate
          }
        },
        quantity: 0,
        tags: [],
        transactionCount: undefined,
        value: 0
      };
    }
  }

  public async getPerformance({
    dateRange = 'max',
    filters,
    impersonationId,
    userId
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

    const [accountBalanceItems, { activities }] = await Promise.all([
      this.accountBalanceService.getAccountBalanceItems({
        filters,
        userId,
        userCurrency
      }),
      this.orderService.getOrdersForPortfolioCalculator({
        filters,
        userCurrency,
        userId
      })
    ]);

    if (accountBalanceItems.length === 0 && activities.length === 0) {
      return {
        chart: [],
        firstOrderDate: undefined,
        hasErrors: false,
        performance: {
          currentNetWorth: 0,
          currentValueInBaseCurrency: 0,
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
      filters,
      userId,
      calculationType: this.getUserPerformanceCalculationType(user),
      currency: userCurrency
    });

    const { errors, hasErrors, historicalData } =
      await portfolioCalculator.getSnapshot();

    const { endDate, startDate } = getIntervalFromDateRange(dateRange);

    const { chart } = await portfolioCalculator.getPerformance({
      end: endDate,
      start: startDate
    });

    const {
      netPerformance,
      netPerformanceInPercentage,
      netPerformanceInPercentageWithCurrencyEffect,
      netPerformanceWithCurrencyEffect,
      netWorth,
      totalInvestment,
      valueWithCurrencyEffect
    } = chart?.at(-1) ?? {
      netPerformance: 0,
      netPerformanceInPercentage: 0,
      netPerformanceInPercentageWithCurrencyEffect: 0,
      netPerformanceWithCurrencyEffect: 0,
      netWorth: 0,
      totalInvestment: 0,
      valueWithCurrencyEffect: 0
    };

    return {
      chart,
      errors,
      hasErrors,
      firstOrderDate: parseDate(historicalData[0]?.date),
      performance: {
        netPerformance,
        netPerformanceWithCurrencyEffect,
        totalInvestment,
        currentNetWorth: netWorth,
        currentValueInBaseCurrency: valueWithCurrencyEffect,
        netPerformancePercentage: netPerformanceInPercentage,
        netPerformancePercentageWithCurrencyEffect:
          netPerformanceInPercentageWithCurrencyEffect
      }
    };
  }

  public async getReport(
    impersonationId: string
  ): Promise<PortfolioReportResponse> {
    const userId = await this.getUserId(impersonationId, this.request.user.id);
    const userSettings = this.request.user.Settings.settings as UserSettings;

    const { accounts, holdings, markets, marketsAdvanced, summary } =
      await this.getDetails({
        impersonationId,
        userId,
        withMarkets: true,
        withSummary: true
      });

    const marketsAdvancedTotalInBaseCurrency = getSum(
      Object.values(marketsAdvanced).map(({ valueInBaseCurrency }) => {
        return new Big(valueInBaseCurrency);
      })
    ).toNumber();

    const marketsTotalInBaseCurrency = getSum(
      Object.values(markets).map(({ valueInBaseCurrency }) => {
        return new Big(valueInBaseCurrency);
      })
    ).toNumber();

    const rules: PortfolioReportResponse['rules'] = {
      accountClusterRisk:
        summary.activityCount > 0
          ? await this.rulesService.evaluate(
              [
                new AccountClusterRiskCurrentInvestment(
                  this.exchangeRateDataService,
                  this.i18nService,
                  userSettings.language,
                  accounts
                ),
                new AccountClusterRiskSingleAccount(
                  this.exchangeRateDataService,
                  this.i18nService,
                  userSettings.language,
                  accounts
                )
              ],
              userSettings
            )
          : undefined,
      assetClassClusterRisk:
        summary.activityCount > 0
          ? await this.rulesService.evaluate(
              [
                new AssetClassClusterRiskEquity(
                  this.exchangeRateDataService,
                  this.i18nService,
                  userSettings.language,
                  Object.values(holdings)
                ),
                new AssetClassClusterRiskFixedIncome(
                  this.exchangeRateDataService,
                  this.i18nService,
                  userSettings.language,
                  Object.values(holdings)
                )
              ],
              userSettings
            )
          : undefined,
      currencyClusterRisk:
        summary.activityCount > 0
          ? await this.rulesService.evaluate(
              [
                new CurrencyClusterRiskBaseCurrencyCurrentInvestment(
                  this.exchangeRateDataService,
                  this.i18nService,
                  Object.values(holdings),
                  userSettings.language
                ),
                new CurrencyClusterRiskCurrentInvestment(
                  this.exchangeRateDataService,
                  this.i18nService,
                  Object.values(holdings),
                  userSettings.language
                )
              ],
              userSettings
            )
          : undefined,
      economicMarketClusterRisk:
        summary.activityCount > 0
          ? await this.rulesService.evaluate(
              [
                new EconomicMarketClusterRiskDevelopedMarkets(
                  this.exchangeRateDataService,
                  marketsTotalInBaseCurrency,
                  markets.developedMarkets.valueInBaseCurrency
                ),
                new EconomicMarketClusterRiskEmergingMarkets(
                  this.exchangeRateDataService,
                  marketsTotalInBaseCurrency,
                  markets.emergingMarkets.valueInBaseCurrency
                )
              ],
              userSettings
            )
          : undefined,
      emergencyFund: await this.rulesService.evaluate(
        [
          new EmergencyFundSetup(
            this.exchangeRateDataService,
            this.i18nService,
            userSettings.language,
            this.getTotalEmergencyFund({
              userSettings,
              emergencyFundHoldingsValueInBaseCurrency:
                this.getEmergencyFundHoldingsValueInBaseCurrency({ holdings })
            }).toNumber()
          )
        ],
        userSettings
      ),
      fees: await this.rulesService.evaluate(
        [
          new FeeRatioInitialInvestment(
            this.exchangeRateDataService,
            this.i18nService,
            userSettings.language,
            summary.committedFunds,
            summary.fees
          )
        ],
        userSettings
      ),
      regionalMarketClusterRisk:
        summary.activityCount > 0
          ? await this.rulesService.evaluate(
              [
                new RegionalMarketClusterRiskAsiaPacific(
                  this.exchangeRateDataService,
                  marketsAdvancedTotalInBaseCurrency,
                  marketsAdvanced.asiaPacific.valueInBaseCurrency
                ),
                new RegionalMarketClusterRiskEmergingMarkets(
                  this.exchangeRateDataService,
                  marketsAdvancedTotalInBaseCurrency,
                  marketsAdvanced.emergingMarkets.valueInBaseCurrency
                ),
                new RegionalMarketClusterRiskEurope(
                  this.exchangeRateDataService,
                  marketsAdvancedTotalInBaseCurrency,
                  marketsAdvanced.europe.valueInBaseCurrency
                ),
                new RegionalMarketClusterRiskJapan(
                  this.exchangeRateDataService,
                  marketsAdvancedTotalInBaseCurrency,
                  marketsAdvanced.japan.valueInBaseCurrency
                ),
                new RegionalMarketClusterRiskNorthAmerica(
                  this.exchangeRateDataService,
                  marketsAdvancedTotalInBaseCurrency,
                  marketsAdvanced.northAmerica.valueInBaseCurrency
                )
              ],
              userSettings
            )
          : undefined
    };

    return { rules, statistics: this.getReportStatistics(rules) };
  }

  public async updateTags({
    dataSource,
    impersonationId,
    symbol,
    tags,
    userId
  }: {
    dataSource: DataSource;
    impersonationId: string;
    symbol: string;
    tags: Tag[];
    userId: string;
  }) {
    userId = await this.getUserId(impersonationId, userId);

    await this.orderService.assignTags({ dataSource, symbol, tags, userId });
  }

  private getAggregatedMarkets(holdings: Record<string, PortfolioPosition>): {
    markets: PortfolioDetails['markets'];
    marketsAdvanced: PortfolioDetails['marketsAdvanced'];
  } {
    const markets: PortfolioDetails['markets'] = {
      [UNKNOWN_KEY]: {
        id: UNKNOWN_KEY,
        valueInBaseCurrency: 0,
        valueInPercentage: 0
      },
      developedMarkets: {
        id: 'developedMarkets',
        valueInBaseCurrency: 0,
        valueInPercentage: 0
      },
      emergingMarkets: {
        id: 'emergingMarkets',
        valueInBaseCurrency: 0,
        valueInPercentage: 0
      },
      otherMarkets: {
        id: 'otherMarkets',
        valueInBaseCurrency: 0,
        valueInPercentage: 0
      }
    };

    const marketsAdvanced: PortfolioDetails['marketsAdvanced'] = {
      [UNKNOWN_KEY]: {
        id: UNKNOWN_KEY,
        valueInBaseCurrency: 0,
        valueInPercentage: 0
      },
      asiaPacific: {
        id: 'asiaPacific',
        valueInBaseCurrency: 0,
        valueInPercentage: 0
      },
      emergingMarkets: {
        id: 'emergingMarkets',
        valueInBaseCurrency: 0,
        valueInPercentage: 0
      },
      europe: {
        id: 'europe',
        valueInBaseCurrency: 0,
        valueInPercentage: 0
      },
      japan: {
        id: 'japan',
        valueInBaseCurrency: 0,
        valueInPercentage: 0
      },
      northAmerica: {
        id: 'northAmerica',
        valueInBaseCurrency: 0,
        valueInPercentage: 0
      },
      otherMarkets: {
        id: 'otherMarkets',
        valueInBaseCurrency: 0,
        valueInPercentage: 0
      }
    };

    for (const [, position] of Object.entries(holdings)) {
      const value = position.valueInBaseCurrency;

      if (position.assetClass !== AssetClass.LIQUIDITY) {
        if (position.countries.length > 0) {
          markets.developedMarkets.valueInBaseCurrency +=
            position.markets.developedMarkets * value;
          markets.emergingMarkets.valueInBaseCurrency +=
            position.markets.emergingMarkets * value;
          markets.otherMarkets.valueInBaseCurrency +=
            position.markets.otherMarkets * value;

          marketsAdvanced.asiaPacific.valueInBaseCurrency +=
            position.marketsAdvanced.asiaPacific * value;
          marketsAdvanced.emergingMarkets.valueInBaseCurrency +=
            position.marketsAdvanced.emergingMarkets * value;
          marketsAdvanced.europe.valueInBaseCurrency +=
            position.marketsAdvanced.europe * value;
          marketsAdvanced.japan.valueInBaseCurrency +=
            position.marketsAdvanced.japan * value;
          marketsAdvanced.northAmerica.valueInBaseCurrency +=
            position.marketsAdvanced.northAmerica * value;
          marketsAdvanced.otherMarkets.valueInBaseCurrency +=
            position.marketsAdvanced.otherMarkets * value;
        } else {
          markets[UNKNOWN_KEY].valueInBaseCurrency += value;
          marketsAdvanced[UNKNOWN_KEY].valueInBaseCurrency += value;
        }
      }
    }

    const marketsTotalInBaseCurrency = getSum(
      Object.values(markets).map(({ valueInBaseCurrency }) => {
        return new Big(valueInBaseCurrency);
      })
    ).toNumber();

    markets.developedMarkets.valueInPercentage =
      markets.developedMarkets.valueInBaseCurrency / marketsTotalInBaseCurrency;
    markets.emergingMarkets.valueInPercentage =
      markets.emergingMarkets.valueInBaseCurrency / marketsTotalInBaseCurrency;
    markets.otherMarkets.valueInPercentage =
      markets.otherMarkets.valueInBaseCurrency / marketsTotalInBaseCurrency;
    markets[UNKNOWN_KEY].valueInPercentage =
      markets[UNKNOWN_KEY].valueInBaseCurrency / marketsTotalInBaseCurrency;

    const marketsAdvancedTotal =
      marketsAdvanced.asiaPacific.valueInBaseCurrency +
      marketsAdvanced.emergingMarkets.valueInBaseCurrency +
      marketsAdvanced.europe.valueInBaseCurrency +
      marketsAdvanced.japan.valueInBaseCurrency +
      marketsAdvanced.northAmerica.valueInBaseCurrency +
      marketsAdvanced.otherMarkets.valueInBaseCurrency +
      marketsAdvanced[UNKNOWN_KEY].valueInBaseCurrency;

    marketsAdvanced.asiaPacific.valueInPercentage =
      marketsAdvanced.asiaPacific.valueInBaseCurrency / marketsAdvancedTotal;
    marketsAdvanced.emergingMarkets.valueInPercentage =
      marketsAdvanced.emergingMarkets.valueInBaseCurrency /
      marketsAdvancedTotal;
    marketsAdvanced.europe.valueInPercentage =
      marketsAdvanced.europe.valueInBaseCurrency / marketsAdvancedTotal;
    marketsAdvanced.japan.valueInPercentage =
      marketsAdvanced.japan.valueInBaseCurrency / marketsAdvancedTotal;
    marketsAdvanced.northAmerica.valueInPercentage =
      marketsAdvanced.northAmerica.valueInBaseCurrency / marketsAdvancedTotal;
    marketsAdvanced.otherMarkets.valueInPercentage =
      marketsAdvanced.otherMarkets.valueInBaseCurrency / marketsAdvancedTotal;
    marketsAdvanced[UNKNOWN_KEY].valueInPercentage =
      marketsAdvanced[UNKNOWN_KEY].valueInBaseCurrency / marketsAdvancedTotal;

    return { markets, marketsAdvanced };
  }

  private getCashPositions({
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

  private getEmergencyFundHoldingsValueInBaseCurrency({
    holdings
  }: {
    holdings: PortfolioDetails['holdings'];
  }) {
    // TODO: Use current value of activities instead of holdings
    // tagged with EMERGENCY_FUND_TAG_ID
    const emergencyFundHoldings = Object.values(holdings).filter(({ tags }) => {
      return (
        tags?.some(({ id }) => {
          return id === TAG_ID_EMERGENCY_FUND;
        }) ?? false
      );
    });

    let valueInBaseCurrencyOfEmergencyFundHoldings = new Big(0);

    for (const { valueInBaseCurrency } of emergencyFundHoldings) {
      valueInBaseCurrencyOfEmergencyFundHoldings =
        valueInBaseCurrencyOfEmergencyFundHoldings.plus(valueInBaseCurrency);
    }

    return valueInBaseCurrencyOfEmergencyFundHoldings.toNumber();
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
    assetProfile
  }: {
    assetProfile: EnhancedSymbolProfile;
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
    }

    markets[UNKNOWN_KEY] = new Big(1)
      .minus(markets.developedMarkets)
      .minus(markets.emergingMarkets)
      .minus(markets.otherMarkets)
      .toNumber();

    marketsAdvanced[UNKNOWN_KEY] = new Big(1)
      .minus(marketsAdvanced.asiaPacific)
      .minus(marketsAdvanced.emergingMarkets)
      .minus(marketsAdvanced.europe)
      .minus(marketsAdvanced.japan)
      .minus(marketsAdvanced.northAmerica)
      .minus(marketsAdvanced.otherMarkets)
      .toNumber();

    return { markets, marketsAdvanced };
  }

  private getReportStatistics(
    evaluatedRules: PortfolioReportResponse['rules']
  ): PortfolioReportResponse['statistics'] {
    const rulesActiveCount = Object.values(evaluatedRules)
      .flat()
      .filter((rule) => {
        return rule?.isActive === true;
      }).length;

    const rulesFulfilledCount = Object.values(evaluatedRules)
      .flat()
      .filter((rule) => {
        return rule?.value === true;
      }).length;

    return { rulesActiveCount, rulesFulfilledCount };
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
    emergencyFundHoldingsValueInBaseCurrency,
    filteredValueInBaseCurrency,
    impersonationId,
    portfolioCalculator,
    userCurrency,
    userId
  }: {
    balanceInBaseCurrency: number;
    emergencyFundHoldingsValueInBaseCurrency: number;
    filteredValueInBaseCurrency: Big;
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
      if (activity.account?.isExcluded) {
        excludedActivities.push(activity);
      } else {
        nonExcludedActivities.push(activity);
      }
    }

    const { currentValueInBaseCurrency, totalInvestment } =
      await portfolioCalculator.getSnapshot();

    const { performance } = await this.getPerformance({
      impersonationId,
      userId
    });

    const {
      netPerformance,
      netPerformancePercentage,
      netPerformancePercentageWithCurrencyEffect,
      netPerformanceWithCurrencyEffect
    } = performance;

    const dividendInBaseCurrency =
      await portfolioCalculator.getDividendInBaseCurrency();

    const totalEmergencyFund = this.getTotalEmergencyFund({
      emergencyFundHoldingsValueInBaseCurrency,
      userSettings: user.Settings?.settings as UserSettings
    });

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
      .minus(totalEmergencyFund)
      .plus(emergencyFundHoldingsValueInBaseCurrency)
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

    const annualizedPerformancePercent = getAnnualizedPerformancePercent({
      daysInMarket,
      netPerformancePercentage: new Big(netPerformancePercentage)
    })?.toNumber();

    const annualizedPerformancePercentWithCurrencyEffect =
      getAnnualizedPerformancePercent({
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
      netPerformance,
      netPerformancePercentage,
      netPerformancePercentageWithCurrencyEffect,
      netPerformanceWithCurrencyEffect,
      totalBuy,
      totalSell,
      activityCount: activities.filter(({ type }) => {
        return ['BUY', 'SELL'].includes(type);
      }).length,
      committedFunds: committedFunds.toNumber(),
      currentValueInBaseCurrency: currentValueInBaseCurrency.toNumber(),
      dividendInBaseCurrency: dividendInBaseCurrency.toNumber(),
      emergencyFund: {
        assets: emergencyFundHoldingsValueInBaseCurrency,
        cash: totalEmergencyFund
          .minus(emergencyFundHoldingsValueInBaseCurrency)
          .toNumber(),
        total: totalEmergencyFund.toNumber()
      },
      fees: fees.toNumber(),
      filteredValueInBaseCurrency: filteredValueInBaseCurrency.toNumber(),
      filteredValueInPercentage: netWorth
        ? filteredValueInBaseCurrency.div(netWorth).toNumber()
        : undefined,
      fireWealth: new Big(currentValueInBaseCurrency)
        .minus(emergencyFundHoldingsValueInBaseCurrency)
        .toNumber(),
      grossPerformance: new Big(netPerformance).plus(fees).toNumber(),
      grossPerformanceWithCurrencyEffect: new Big(
        netPerformanceWithCurrencyEffect
      )
        .plus(fees)
        .toNumber(),
      interest: interest.toNumber(),
      items: valuables.toNumber(),
      liabilities: liabilities.toNumber(),
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

  private getTotalEmergencyFund({
    emergencyFundHoldingsValueInBaseCurrency,
    userSettings
  }: {
    emergencyFundHoldingsValueInBaseCurrency: number;
    userSettings: UserSettings;
  }) {
    return new Big(
      Math.max(
        emergencyFundHoldingsValueInBaseCurrency,
        userSettings?.emergencyFund ?? 0
      )
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

  private getUserPerformanceCalculationType(
    aUser: UserWithSettings
  ): PerformanceCalculationType {
    return aUser?.Settings?.settings.performanceCalculationType;
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
    portfolioItemsNow: Record<string, TimelinePosition>;
    userCurrency: string;
    userId: string;
    withExcludedAccounts?: boolean;
  }) {
    const accounts: PortfolioDetails['accounts'] = {};
    const platforms: PortfolioDetails['platforms'] = {};

    let currentAccounts: (Account & {
      Order?: Order[];
      platform?: Platform;
    })[] = [];

    if (filters.length === 0) {
      currentAccounts = await this.accountService.getAccounts(userId);
    } else if (filters.length === 1 && filters[0].type === 'ACCOUNT') {
      currentAccounts = await this.accountService.accounts({
        include: { platform: true },
        where: { id: filters[0].id }
      });
    } else {
      const accountIds = Array.from(
        new Set(
          activities
            .filter(({ accountId }) => {
              return accountId;
            })
            .map(({ accountId }) => {
              return accountId;
            })
        )
      );

      currentAccounts = await this.accountService.accounts({
        include: { platform: true },
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

      if (platforms[account.platformId || UNKNOWN_KEY]?.valueInBaseCurrency) {
        platforms[account.platformId || UNKNOWN_KEY].valueInBaseCurrency +=
          this.exchangeRateDataService.toCurrency(
            account.balance,
            account.currency,
            userCurrency
          );
      } else {
        platforms[account.platformId || UNKNOWN_KEY] = {
          balance: account.balance,
          currency: account.currency,
          name: account.platform?.name,
          valueInBaseCurrency: this.exchangeRateDataService.toCurrency(
            account.balance,
            account.currency,
            userCurrency
          )
        };
      }

      for (const {
        account,
        quantity,
        SymbolProfile,
        type
      } of ordersByAccount) {
        const currentValueOfSymbolInBaseCurrency =
          getFactor(type) *
          quantity *
          (portfolioItemsNow[SymbolProfile.symbol]?.marketPriceInBaseCurrency ??
            0);

        if (accounts[account?.id || UNKNOWN_KEY]?.valueInBaseCurrency) {
          accounts[account?.id || UNKNOWN_KEY].valueInBaseCurrency +=
            currentValueOfSymbolInBaseCurrency;
        } else {
          accounts[account?.id || UNKNOWN_KEY] = {
            balance: 0,
            currency: account?.currency,
            name: account.name,
            valueInBaseCurrency: currentValueOfSymbolInBaseCurrency
          };
        }

        if (
          platforms[account?.platformId || UNKNOWN_KEY]?.valueInBaseCurrency
        ) {
          platforms[account?.platformId || UNKNOWN_KEY].valueInBaseCurrency +=
            currentValueOfSymbolInBaseCurrency;
        } else {
          platforms[account?.platformId || UNKNOWN_KEY] = {
            balance: 0,
            currency: account?.currency,
            name: account.platform?.name,
            valueInBaseCurrency: currentValueOfSymbolInBaseCurrency
          };
        }
      }
    }

    return { accounts, platforms };
  }
}
