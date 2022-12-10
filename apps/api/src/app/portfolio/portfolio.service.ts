import { AccountService } from '@ghostfolio/api/app/account/account.service';
import { CashDetails } from '@ghostfolio/api/app/account/interfaces/cash-details.interface';
import { OrderService } from '@ghostfolio/api/app/order/order.service';
import { CurrentRateService } from '@ghostfolio/api/app/portfolio/current-rate.service';
import { PortfolioOrder } from '@ghostfolio/api/app/portfolio/interfaces/portfolio-order.interface';
import { TransactionPoint } from '@ghostfolio/api/app/portfolio/interfaces/transaction-point.interface';
import { UserService } from '@ghostfolio/api/app/user/user.service';
import { AccountClusterRiskCurrentInvestment } from '@ghostfolio/api/models/rules/account-cluster-risk/current-investment';
import { AccountClusterRiskInitialInvestment } from '@ghostfolio/api/models/rules/account-cluster-risk/initial-investment';
import { AccountClusterRiskSingleAccount } from '@ghostfolio/api/models/rules/account-cluster-risk/single-account';
import { CurrencyClusterRiskBaseCurrencyCurrentInvestment } from '@ghostfolio/api/models/rules/currency-cluster-risk/base-currency-current-investment';
import { CurrencyClusterRiskBaseCurrencyInitialInvestment } from '@ghostfolio/api/models/rules/currency-cluster-risk/base-currency-initial-investment';
import { CurrencyClusterRiskCurrentInvestment } from '@ghostfolio/api/models/rules/currency-cluster-risk/current-investment';
import { CurrencyClusterRiskInitialInvestment } from '@ghostfolio/api/models/rules/currency-cluster-risk/initial-investment';
import { FeeRatioInitialInvestment } from '@ghostfolio/api/models/rules/fees/fee-ratio-initial-investment';
import { ConfigurationService } from '@ghostfolio/api/services/configuration.service';
import { DataProviderService } from '@ghostfolio/api/services/data-provider/data-provider.service';
import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data.service';
import { ImpersonationService } from '@ghostfolio/api/services/impersonation.service';
import { SymbolProfileService } from '@ghostfolio/api/services/symbol-profile.service';
import {
  ASSET_SUB_CLASS_EMERGENCY_FUND,
  MAX_CHART_ITEMS,
  UNKNOWN_KEY
} from '@ghostfolio/common/config';
import { DATE_FORMAT, parseDate } from '@ghostfolio/common/helper';
import {
  Accounts,
  EnhancedSymbolProfile,
  Filter,
  HistoricalDataItem,
  PortfolioDetails,
  PortfolioPerformanceResponse,
  PortfolioPosition,
  PortfolioReport,
  PortfolioSummary,
  Position,
  TimelinePosition,
  UserSettings,
  UserWithSettings
} from '@ghostfolio/common/interfaces';
import { InvestmentItem } from '@ghostfolio/common/interfaces/investment-item.interface';
import type {
  AccountWithValue,
  DateRange,
  GroupBy,
  Market,
  OrderWithAccount,
  RequestWithUser
} from '@ghostfolio/common/types';
import { Inject, Injectable } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import {
  Account,
  AssetClass,
  DataSource,
  Order,
  Platform,
  Prisma,
  Tag,
  Type as TypeOfOrder
} from '@prisma/client';
import Big from 'big.js';
import {
  differenceInDays,
  endOfToday,
  format,
  isAfter,
  isBefore,
  isSameMonth,
  isSameYear,
  max,
  parseISO,
  set,
  setDayOfYear,
  subDays,
  subYears
} from 'date-fns';
import { isEmpty, sortBy, uniq, uniqBy } from 'lodash';

import {
  HistoricalDataContainer,
  PortfolioPositionDetail
} from './interfaces/portfolio-position-detail.interface';
import { PortfolioCalculator } from './portfolio-calculator';
import { RulesService } from './rules.service';

const developedMarkets = require('../../assets/countries/developed-markets.json');
const emergingMarkets = require('../../assets/countries/emerging-markets.json');

@Injectable()
export class PortfolioService {
  private baseCurrency: string;

  public constructor(
    private readonly accountService: AccountService,
    private readonly configurationService: ConfigurationService,
    private readonly currentRateService: CurrentRateService,
    private readonly dataProviderService: DataProviderService,
    private readonly exchangeRateDataService: ExchangeRateDataService,
    private readonly impersonationService: ImpersonationService,
    private readonly orderService: OrderService,
    @Inject(REQUEST) private readonly request: RequestWithUser,
    private readonly rulesService: RulesService,
    private readonly symbolProfileService: SymbolProfileService,
    private readonly userService: UserService
  ) {
    this.baseCurrency = this.configurationService.get('BASE_CURRENCY');
  }

  public async getAccounts({
    filters,
    userId,
    withExcludedAccounts = false
  }: {
    filters?: Filter[];
    userId: string;
    withExcludedAccounts?: boolean;
  }): Promise<AccountWithValue[]> {
    const where: Prisma.AccountWhereInput = { userId: userId };

    if (filters?.[0].id && filters?.[0].type === 'ACCOUNT') {
      where.id = filters[0].id;
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

      const valueInBaseCurrency = details.accounts[account.id]?.current ?? 0;

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

  public async getDividends({
    dateRange,
    impersonationId,
    groupBy
  }: {
    dateRange: DateRange;
    impersonationId: string;
    groupBy?: GroupBy;
  }): Promise<InvestmentItem[]> {
    const userId = await this.getUserId(impersonationId, this.request.user.id);

    const activities = await this.orderService.getOrders({
      userId,
      types: ['DIVIDEND'],
      userCurrency: this.request.user.Settings.settings.baseCurrency
    });

    let dividends = activities.map((dividend) => {
      return {
        date: format(dividend.date, DATE_FORMAT),
        investment: dividend.valueInBaseCurrency
      };
    });

    if (groupBy === 'month') {
      dividends = this.getDividendsByMonth(dividends);
    }

    const startDate = this.getStartDate(
      dateRange,
      parseDate(dividends[0]?.date)
    );

    return dividends.filter(({ date }) => {
      return !isBefore(parseDate(date), startDate);
    });
  }

  public async getInvestments({
    dateRange,
    impersonationId,
    groupBy
  }: {
    dateRange: DateRange;
    impersonationId: string;
    groupBy?: GroupBy;
  }): Promise<InvestmentItem[]> {
    const userId = await this.getUserId(impersonationId, this.request.user.id);

    const { portfolioOrders, transactionPoints } =
      await this.getTransactionPoints({
        userId,
        includeDrafts: true
      });

    const portfolioCalculator = new PortfolioCalculator({
      currency: this.request.user.Settings.settings.baseCurrency,
      currentRateService: this.currentRateService,
      orders: portfolioOrders
    });

    portfolioCalculator.setTransactionPoints(transactionPoints);
    if (transactionPoints.length === 0) {
      return [];
    }

    let investments: InvestmentItem[];

    if (groupBy === 'month') {
      investments = portfolioCalculator.getInvestmentsByMonth().map((item) => {
        return {
          date: item.date,
          investment: item.investment.toNumber()
        };
      });

      // Add investment of current month
      const dateOfCurrentMonth = format(
        set(new Date(), { date: 1 }),
        DATE_FORMAT
      );
      const investmentOfCurrentMonth = investments.filter(({ date }) => {
        return date === dateOfCurrentMonth;
      });

      if (investmentOfCurrentMonth.length <= 0) {
        investments.push({
          date: dateOfCurrentMonth,
          investment: 0
        });
      }
    } else {
      investments = portfolioCalculator
        .getInvestments()
        .map(({ date, investment }) => {
          return {
            date,
            investment: investment.toNumber()
          };
        });

      // Add investment of today
      const investmentOfToday = investments.filter(({ date }) => {
        return date === format(new Date(), DATE_FORMAT);
      });

      if (investmentOfToday.length <= 0) {
        const pastInvestments = investments.filter(({ date }) => {
          return isBefore(parseDate(date), new Date());
        });
        const lastInvestment = pastInvestments[pastInvestments.length - 1];

        investments.push({
          date: format(new Date(), DATE_FORMAT),
          investment: lastInvestment?.investment ?? 0
        });
      }
    }

    investments = sortBy(investments, (investment) => {
      return investment.date;
    });

    const startDate = this.getStartDate(
      dateRange,
      parseDate(investments[0]?.date)
    );

    return investments.filter(({ date }) => {
      return !isBefore(parseDate(date), startDate);
    });
  }

  public async getChart({
    dateRange = 'max',
    impersonationId,
    userCurrency,
    userId
  }: {
    dateRange?: DateRange;
    impersonationId: string;
    userCurrency: string;
    userId: string;
  }): Promise<HistoricalDataContainer> {
    userId = await this.getUserId(impersonationId, userId);

    const { portfolioOrders, transactionPoints } =
      await this.getTransactionPoints({
        userId
      });

    const portfolioCalculator = new PortfolioCalculator({
      currency: userCurrency,
      currentRateService: this.currentRateService,
      orders: portfolioOrders
    });

    portfolioCalculator.setTransactionPoints(transactionPoints);
    if (transactionPoints.length === 0) {
      return {
        isAllTimeHigh: false,
        isAllTimeLow: false,
        items: []
      };
    }
    const endDate = new Date();

    const portfolioStart = parseDate(transactionPoints[0].date);
    const startDate = this.getStartDate(dateRange, portfolioStart);

    const daysInMarket = differenceInDays(new Date(), startDate);
    const step = Math.round(
      daysInMarket / Math.min(daysInMarket, MAX_CHART_ITEMS)
    );

    const items = await portfolioCalculator.getChartData(
      startDate,
      endDate,
      step
    );

    return {
      items,
      isAllTimeHigh: false,
      isAllTimeLow: false
    };
  }

  public async getDetails({
    impersonationId,
    dateRange = 'max',
    filters,
    userId,
    withExcludedAccounts = false
  }: {
    impersonationId: string;
    dateRange?: DateRange;
    filters?: Filter[];
    userId: string;
    withExcludedAccounts?: boolean;
  }): Promise<PortfolioDetails & { hasErrors: boolean }> {
    userId = await this.getUserId(impersonationId, userId);
    const user = await this.userService.user({ id: userId });
    const userCurrency = this.getUserCurrency(user);

    const emergencyFund = new Big(
      (user.Settings?.settings as UserSettings)?.emergencyFund ?? 0
    );

    const { orders, portfolioOrders, transactionPoints } =
      await this.getTransactionPoints({
        filters,
        userId,
        withExcludedAccounts
      });

    const portfolioCalculator = new PortfolioCalculator({
      currency: userCurrency,
      currentRateService: this.currentRateService,
      orders: portfolioOrders
    });

    portfolioCalculator.setTransactionPoints(transactionPoints);

    const portfolioStart = parseDate(
      transactionPoints[0]?.date ?? format(new Date(), DATE_FORMAT)
    );
    const startDate = this.getStartDate(dateRange, portfolioStart);
    const currentPositions = await portfolioCalculator.getCurrentPositions(
      startDate
    );

    const cashDetails = await this.accountService.getCashDetails({
      filters,
      userId,
      currency: userCurrency
    });

    const holdings: PortfolioDetails['holdings'] = {};
    const totalInvestmentInBaseCurrency = currentPositions.totalInvestment.plus(
      cashDetails.balanceInBaseCurrency
    );
    let filteredValueInBaseCurrency = currentPositions.currentValue;

    if (
      filters?.length === 0 ||
      (filters?.length === 1 &&
        filters[0].type === 'ASSET_CLASS' &&
        filters[0].id === 'CASH')
    ) {
      filteredValueInBaseCurrency = filteredValueInBaseCurrency.plus(
        cashDetails.balanceInBaseCurrency
      );
    }

    const dataGatheringItems = currentPositions.positions.map((position) => {
      return {
        dataSource: position.dataSource,
        symbol: position.symbol
      };
    });
    const symbols = currentPositions.positions.map(
      (position) => position.symbol
    );

    const [dataProviderResponses, symbolProfiles] = await Promise.all([
      this.dataProviderService.getQuotes(dataGatheringItems),
      this.symbolProfileService.getSymbolProfilesBySymbols(symbols)
    ]);

    const symbolProfileMap: { [symbol: string]: EnhancedSymbolProfile } = {};
    for (const symbolProfile of symbolProfiles) {
      symbolProfileMap[symbolProfile.symbol] = symbolProfile;
    }

    const portfolioItemsNow: { [symbol: string]: TimelinePosition } = {};
    for (const position of currentPositions.positions) {
      portfolioItemsNow[position.symbol] = position;
    }

    for (const item of currentPositions.positions) {
      if (item.quantity.lte(0)) {
        // Ignore positions without any quantity
        continue;
      }

      const value = item.quantity.mul(item.marketPrice ?? 0);
      const symbolProfile = symbolProfileMap[item.symbol];
      const dataProviderResponse = dataProviderResponses[item.symbol];

      const markets: { [key in Market]: number } = {
        developedMarkets: 0,
        emergingMarkets: 0,
        otherMarkets: 0
      };

      for (const country of symbolProfile.countries) {
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
      }

      holdings[item.symbol] = {
        markets,
        allocationCurrent: filteredValueInBaseCurrency.eq(0)
          ? 0
          : value.div(filteredValueInBaseCurrency).toNumber(),
        allocationInvestment: item.investment
          .div(totalInvestmentInBaseCurrency)
          .toNumber(),
        assetClass: symbolProfile.assetClass,
        assetSubClass: symbolProfile.assetSubClass,
        countries: symbolProfile.countries,
        currency: item.currency,
        dataSource: symbolProfile.dataSource,
        grossPerformance: item.grossPerformance?.toNumber() ?? 0,
        grossPerformancePercent:
          item.grossPerformancePercentage?.toNumber() ?? 0,
        investment: item.investment.toNumber(),
        marketPrice: item.marketPrice,
        marketState: dataProviderResponse?.marketState ?? 'delayed',
        name: symbolProfile.name,
        netPerformance: item.netPerformance?.toNumber() ?? 0,
        netPerformancePercent: item.netPerformancePercentage?.toNumber() ?? 0,
        quantity: item.quantity.toNumber(),
        sectors: symbolProfile.sectors,
        symbol: item.symbol,
        transactionCount: item.transactionCount,
        url: symbolProfile.url,
        value: value.toNumber()
      };
    }

    if (
      filters?.length === 0 ||
      (filters?.length === 1 &&
        filters[0].type === 'ASSET_CLASS' &&
        filters[0].id === 'CASH')
    ) {
      const cashPositions = await this.getCashPositions({
        cashDetails,
        emergencyFund,
        userCurrency,
        investment: totalInvestmentInBaseCurrency,
        value: filteredValueInBaseCurrency
      });

      for (const symbol of Object.keys(cashPositions)) {
        holdings[symbol] = cashPositions[symbol];
      }
    }

    const accounts = await this.getValueOfAccounts({
      filters,
      orders,
      portfolioItemsNow,
      userCurrency,
      userId,
      withExcludedAccounts
    });

    const summary = await this.getSummary({
      impersonationId,
      userCurrency,
      userId
    });

    return {
      accounts,
      holdings,
      summary,
      filteredValueInBaseCurrency: filteredValueInBaseCurrency.toNumber(),
      filteredValueInPercentage: summary.netWorth
        ? filteredValueInBaseCurrency.div(summary.netWorth).toNumber()
        : 0,
      hasErrors: currentPositions.hasErrors,
      totalValueInBaseCurrency: summary.netWorth
    };
  }

  public async getPosition(
    aDataSource: DataSource,
    aImpersonationId: string,
    aSymbol: string
  ): Promise<PortfolioPositionDetail> {
    const userId = await this.getUserId(aImpersonationId, this.request.user.id);
    const user = await this.userService.user({ id: userId });
    const userCurrency = this.getUserCurrency(user);

    const orders = (
      await this.orderService.getOrders({
        userCurrency,
        userId,
        withExcludedAccounts: true
      })
    ).filter(({ SymbolProfile }) => {
      return (
        SymbolProfile.dataSource === aDataSource &&
        SymbolProfile.symbol === aSymbol
      );
    });

    let tags: Tag[] = [];

    if (orders.length <= 0) {
      return {
        tags,
        averagePrice: undefined,
        firstBuyDate: undefined,
        grossPerformance: undefined,
        grossPerformancePercent: undefined,
        historicalData: [],
        investment: undefined,
        marketPrice: undefined,
        maxPrice: undefined,
        minPrice: undefined,
        netPerformance: undefined,
        netPerformancePercent: undefined,
        orders: [],
        quantity: undefined,
        SymbolProfile: undefined,
        transactionCount: undefined,
        value: undefined
      };
    }

    const positionCurrency = orders[0].SymbolProfile.currency;
    const [SymbolProfile] =
      await this.symbolProfileService.getSymbolProfilesBySymbols([aSymbol]);

    const portfolioOrders: PortfolioOrder[] = orders
      .filter((order) => {
        tags = tags.concat(order.tags);

        return order.type === 'BUY' || order.type === 'SELL';
      })
      .map((order) => ({
        currency: order.SymbolProfile.currency,
        dataSource: order.SymbolProfile.dataSource,
        date: format(order.date, DATE_FORMAT),
        fee: new Big(order.fee),
        name: order.SymbolProfile?.name,
        quantity: new Big(order.quantity),
        symbol: order.SymbolProfile.symbol,
        type: order.type,
        unitPrice: new Big(order.unitPrice)
      }));

    tags = uniqBy(tags, 'id');

    const portfolioCalculator = new PortfolioCalculator({
      currency: positionCurrency,
      currentRateService: this.currentRateService,
      orders: portfolioOrders
    });

    portfolioCalculator.computeTransactionPoints();
    const transactionPoints = portfolioCalculator.getTransactionPoints();

    const portfolioStart = parseDate(transactionPoints[0].date);
    const currentPositions = await portfolioCalculator.getCurrentPositions(
      portfolioStart
    );

    const position = currentPositions.positions.find(
      (item) => item.symbol === aSymbol
    );

    if (position) {
      const {
        averagePrice,
        currency,
        dataSource,
        firstBuyDate,
        marketPrice,
        quantity,
        transactionCount
      } = position;

      // Convert investment, gross and net performance to currency of user
      const investment = this.exchangeRateDataService.toCurrency(
        position.investment?.toNumber(),
        currency,
        userCurrency
      );
      const grossPerformance = this.exchangeRateDataService.toCurrency(
        position.grossPerformance?.toNumber(),
        currency,
        userCurrency
      );
      const netPerformance = this.exchangeRateDataService.toCurrency(
        position.netPerformance?.toNumber(),
        currency,
        userCurrency
      );

      const historicalData = await this.dataProviderService.getHistorical(
        [{ dataSource, symbol: aSymbol }],
        'day',
        parseISO(firstBuyDate),
        new Date()
      );

      const historicalDataArray: HistoricalDataItem[] = [];
      let maxPrice = Math.max(orders[0].unitPrice, marketPrice);
      let minPrice = Math.min(orders[0].unitPrice, marketPrice);

      if (!historicalData?.[aSymbol]?.[firstBuyDate]) {
        // Add historical entry for buy date, if no historical data available
        historicalDataArray.push({
          averagePrice: orders[0].unitPrice,
          date: firstBuyDate,
          value: orders[0].unitPrice
        });
      }

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
          const currentSymbol = transactionPoints[j].items.find(
            (item) => item.symbol === aSymbol
          );
          if (currentSymbol) {
            currentAveragePrice = currentSymbol.quantity.eq(0)
              ? 0
              : currentSymbol.investment.div(currentSymbol.quantity).toNumber();
          }

          historicalDataArray.push({
            date,
            averagePrice: currentAveragePrice,
            value: marketPrice
          });

          maxPrice = Math.max(marketPrice ?? 0, maxPrice);
          minPrice = Math.min(marketPrice ?? Number.MAX_SAFE_INTEGER, minPrice);
        }
      }

      return {
        firstBuyDate,
        grossPerformance,
        investment,
        marketPrice,
        maxPrice,
        minPrice,
        netPerformance,
        orders,
        SymbolProfile,
        tags,
        transactionCount,
        averagePrice: averagePrice.toNumber(),
        grossPerformancePercent:
          position.grossPerformancePercentage?.toNumber(),
        historicalData: historicalDataArray,
        netPerformancePercent: position.netPerformancePercentage?.toNumber(),
        quantity: quantity.toNumber(),
        value: this.exchangeRateDataService.toCurrency(
          quantity.mul(marketPrice ?? 0).toNumber(),
          currency,
          userCurrency
        )
      };
    } else {
      const currentData = await this.dataProviderService.getQuotes([
        { dataSource: DataSource.YAHOO, symbol: aSymbol }
      ]);
      const marketPrice = currentData[aSymbol]?.marketPrice;

      let historicalData = await this.dataProviderService.getHistorical(
        [{ dataSource: DataSource.YAHOO, symbol: aSymbol }],
        'day',
        portfolioStart,
        new Date()
      );

      if (isEmpty(historicalData)) {
        historicalData = await this.dataProviderService.getHistoricalRaw(
          [{ dataSource: DataSource.YAHOO, symbol: aSymbol }],
          portfolioStart,
          new Date()
        );
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
        tags,
        averagePrice: 0,
        firstBuyDate: undefined,
        grossPerformance: undefined,
        grossPerformancePercent: undefined,
        historicalData: historicalDataArray,
        investment: 0,
        netPerformance: undefined,
        netPerformancePercent: undefined,
        quantity: 0,
        transactionCount: undefined,
        value: 0
      };
    }
  }

  public async getPositions(
    aImpersonationId: string,
    aDateRange: DateRange = 'max'
  ): Promise<{ hasErrors: boolean; positions: Position[] }> {
    const userId = await this.getUserId(aImpersonationId, this.request.user.id);

    const { portfolioOrders, transactionPoints } =
      await this.getTransactionPoints({
        userId
      });

    const portfolioCalculator = new PortfolioCalculator({
      currency: this.request.user.Settings.settings.baseCurrency,
      currentRateService: this.currentRateService,
      orders: portfolioOrders
    });

    if (transactionPoints?.length <= 0) {
      return {
        hasErrors: false,
        positions: []
      };
    }

    portfolioCalculator.setTransactionPoints(transactionPoints);

    const portfolioStart = parseDate(transactionPoints[0].date);
    const startDate = this.getStartDate(aDateRange, portfolioStart);
    const currentPositions = await portfolioCalculator.getCurrentPositions(
      startDate
    );

    const positions = currentPositions.positions.filter(
      (item) => !item.quantity.eq(0)
    );
    const dataGatheringItem = positions.map((position) => {
      return {
        dataSource: position.dataSource,
        symbol: position.symbol
      };
    });
    const symbols = positions.map((position) => position.symbol);

    const [dataProviderResponses, symbolProfiles] = await Promise.all([
      this.dataProviderService.getQuotes(dataGatheringItem),
      this.symbolProfileService.getSymbolProfilesBySymbols(symbols)
    ]);

    const symbolProfileMap: { [symbol: string]: EnhancedSymbolProfile } = {};
    for (const symbolProfile of symbolProfiles) {
      symbolProfileMap[symbolProfile.symbol] = symbolProfile;
    }

    return {
      hasErrors: currentPositions.hasErrors,
      positions: positions.map((position) => {
        return {
          ...position,
          assetClass: symbolProfileMap[position.symbol].assetClass,
          averagePrice: new Big(position.averagePrice).toNumber(),
          grossPerformance: position.grossPerformance?.toNumber() ?? null,
          grossPerformancePercentage:
            position.grossPerformancePercentage?.toNumber() ?? null,
          investment: new Big(position.investment).toNumber(),
          marketState:
            dataProviderResponses[position.symbol]?.marketState ?? 'delayed',
          name: symbolProfileMap[position.symbol].name,
          netPerformance: position.netPerformance?.toNumber() ?? null,
          netPerformancePercentage:
            position.netPerformancePercentage?.toNumber() ?? null,
          quantity: new Big(position.quantity).toNumber()
        };
      })
    };
  }

  public async getPerformance({
    dateRange = 'max',
    impersonationId,
    userId
  }: {
    dateRange?: DateRange;
    impersonationId: string;
    userId: string;
  }): Promise<PortfolioPerformanceResponse> {
    userId = await this.getUserId(impersonationId, userId);
    const user = await this.userService.user({ id: userId });
    const userCurrency = this.getUserCurrency(user);

    const { portfolioOrders, transactionPoints } =
      await this.getTransactionPoints({
        userId
      });

    const portfolioCalculator = new PortfolioCalculator({
      currency: userCurrency,
      currentRateService: this.currentRateService,
      orders: portfolioOrders
    });

    if (transactionPoints?.length <= 0) {
      return {
        chart: [],
        firstOrderDate: undefined,
        hasErrors: false,
        performance: {
          currentGrossPerformance: 0,
          currentGrossPerformancePercent: 0,
          currentNetPerformance: 0,
          currentNetPerformancePercent: 0,
          currentValue: 0,
          totalInvestment: 0
        }
      };
    }

    portfolioCalculator.setTransactionPoints(transactionPoints);

    const portfolioStart = parseDate(transactionPoints[0].date);
    const startDate = this.getStartDate(dateRange, portfolioStart);
    const currentPositions = await portfolioCalculator.getCurrentPositions(
      startDate
    );

    const hasErrors = currentPositions.hasErrors;
    const currentValue = currentPositions.currentValue.toNumber();
    const currentGrossPerformance = currentPositions.grossPerformance;
    const currentGrossPerformancePercent =
      currentPositions.grossPerformancePercentage;
    let currentNetPerformance = currentPositions.netPerformance;
    let currentNetPerformancePercent =
      currentPositions.netPerformancePercentage;
    const totalInvestment = currentPositions.totalInvestment;

    // if (currentGrossPerformance.mul(currentGrossPerformancePercent).lt(0)) {
    //   // If algebraic sign is different, harmonize it
    //   currentGrossPerformancePercent = currentGrossPerformancePercent.mul(-1);
    // }

    // if (currentNetPerformance.mul(currentNetPerformancePercent).lt(0)) {
    //   // If algebraic sign is different, harmonize it
    //   currentNetPerformancePercent = currentNetPerformancePercent.mul(-1);
    // }

    const historicalDataContainer = await this.getChart({
      dateRange,
      impersonationId,
      userCurrency,
      userId
    });

    const itemOfToday = historicalDataContainer.items.find((item) => {
      return item.date === format(new Date(), DATE_FORMAT);
    });

    if (itemOfToday) {
      currentNetPerformance = new Big(itemOfToday.netPerformance);
      currentNetPerformancePercent = new Big(
        itemOfToday.netPerformanceInPercentage
      ).div(100);
    }

    return {
      chart: historicalDataContainer.items.map(
        ({
          date,
          netPerformance,
          netPerformanceInPercentage,
          totalInvestment,
          value
        }) => {
          return {
            date,
            netPerformance,
            netPerformanceInPercentage,
            totalInvestment,
            value
          };
        }
      ),
      errors: currentPositions.errors,
      firstOrderDate: parseDate(historicalDataContainer.items[0]?.date),
      hasErrors: currentPositions.hasErrors || hasErrors,
      performance: {
        currentValue,
        currentGrossPerformance: currentGrossPerformance.toNumber(),
        currentGrossPerformancePercent:
          currentGrossPerformancePercent.toNumber(),
        currentNetPerformance: currentNetPerformance.toNumber(),
        currentNetPerformancePercent: currentNetPerformancePercent.toNumber(),
        totalInvestment: totalInvestment.toNumber()
      }
    };
  }

  public async getReport(impersonationId: string): Promise<PortfolioReport> {
    const userId = await this.getUserId(impersonationId, this.request.user.id);
    const user = await this.userService.user({ id: userId });
    const userCurrency = this.getUserCurrency(user);

    const { orders, portfolioOrders, transactionPoints } =
      await this.getTransactionPoints({
        userId
      });

    if (isEmpty(orders)) {
      return {
        rules: {}
      };
    }

    const portfolioCalculator = new PortfolioCalculator({
      currency: userCurrency,
      currentRateService: this.currentRateService,
      orders: portfolioOrders
    });

    portfolioCalculator.setTransactionPoints(transactionPoints);

    const portfolioStart = parseDate(transactionPoints[0].date);
    const currentPositions = await portfolioCalculator.getCurrentPositions(
      portfolioStart
    );

    const portfolioItemsNow: { [symbol: string]: TimelinePosition } = {};
    for (const position of currentPositions.positions) {
      portfolioItemsNow[position.symbol] = position;
    }
    const accounts = await this.getValueOfAccounts({
      orders,
      portfolioItemsNow,
      userId,
      userCurrency
    });
    return {
      rules: {
        accountClusterRisk: await this.rulesService.evaluate(
          [
            new AccountClusterRiskInitialInvestment(
              this.exchangeRateDataService,
              accounts
            ),
            new AccountClusterRiskCurrentInvestment(
              this.exchangeRateDataService,
              accounts
            ),
            new AccountClusterRiskSingleAccount(
              this.exchangeRateDataService,
              accounts
            )
          ],
          <UserSettings>this.request.user.Settings.settings
        ),
        currencyClusterRisk: await this.rulesService.evaluate(
          [
            new CurrencyClusterRiskBaseCurrencyInitialInvestment(
              this.exchangeRateDataService,
              currentPositions
            ),
            new CurrencyClusterRiskBaseCurrencyCurrentInvestment(
              this.exchangeRateDataService,
              currentPositions
            ),
            new CurrencyClusterRiskInitialInvestment(
              this.exchangeRateDataService,
              currentPositions
            ),
            new CurrencyClusterRiskCurrentInvestment(
              this.exchangeRateDataService,
              currentPositions
            )
          ],
          <UserSettings>this.request.user.Settings.settings
        ),
        fees: await this.rulesService.evaluate(
          [
            new FeeRatioInitialInvestment(
              this.exchangeRateDataService,
              currentPositions.totalInvestment.toNumber(),
              this.getFees({ orders, userCurrency }).toNumber()
            )
          ],
          <UserSettings>this.request.user.Settings.settings
        )
      }
    };
  }

  private async getCashPositions({
    cashDetails,
    emergencyFund,
    investment,
    userCurrency,
    value
  }: {
    cashDetails: CashDetails;
    emergencyFund: Big;
    investment: Big;
    value: Big;
    userCurrency: string;
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
        cashPositions[account.currency].value += convertedBalance;
      } else {
        cashPositions[account.currency] = this.getInitialCashPosition({
          balance: convertedBalance,
          currency: account.currency
        });
      }
    }

    if (emergencyFund.gt(0)) {
      cashPositions[ASSET_SUB_CLASS_EMERGENCY_FUND] = {
        ...cashPositions[userCurrency],
        assetSubClass: ASSET_SUB_CLASS_EMERGENCY_FUND,
        investment: emergencyFund.toNumber(),
        name: ASSET_SUB_CLASS_EMERGENCY_FUND,
        symbol: ASSET_SUB_CLASS_EMERGENCY_FUND,
        value: emergencyFund.toNumber()
      };

      cashPositions[userCurrency].investment = new Big(
        cashPositions[userCurrency].investment
      )
        .minus(emergencyFund)
        .toNumber();
      cashPositions[userCurrency].value = new Big(
        cashPositions[userCurrency].value
      )
        .minus(emergencyFund)
        .toNumber();
    }

    for (const symbol of Object.keys(cashPositions)) {
      // Calculate allocations for each currency
      cashPositions[symbol].allocationCurrent = value.gt(0)
        ? new Big(cashPositions[symbol].value).div(value).toNumber()
        : 0;
      cashPositions[symbol].allocationInvestment = investment.gt(0)
        ? new Big(cashPositions[symbol].investment).div(investment).toNumber()
        : 0;
    }

    return cashPositions;
  }

  private getDividend({
    date = new Date(0),
    orders,
    userCurrency
  }: {
    date?: Date;
    orders: OrderWithAccount[];
    userCurrency: string;
  }) {
    return orders
      .filter((order) => {
        // Filter out all orders before given date and type dividend
        return (
          isBefore(date, new Date(order.date)) &&
          order.type === TypeOfOrder.DIVIDEND
        );
      })
      .map((order) => {
        return this.exchangeRateDataService.toCurrency(
          new Big(order.quantity).mul(order.unitPrice).toNumber(),
          order.SymbolProfile.currency,
          userCurrency
        );
      })
      .reduce(
        (previous, current) => new Big(previous).plus(current),
        new Big(0)
      );
  }

  private getDividendsByMonth(aDividends: InvestmentItem[]): InvestmentItem[] {
    if (aDividends.length === 0) {
      return [];
    }

    const dividends = [];
    let currentDate: Date;
    let investmentByMonth = new Big(0);

    for (const [index, dividend] of aDividends.entries()) {
      if (
        isSameMonth(parseDate(dividend.date), currentDate) &&
        isSameYear(parseDate(dividend.date), currentDate)
      ) {
        // Same month: Add up divididends

        investmentByMonth = investmentByMonth.plus(dividend.investment);
      } else {
        // New month: Store previous month and reset

        if (currentDate) {
          dividends.push({
            date: format(set(currentDate, { date: 1 }), DATE_FORMAT),
            investment: investmentByMonth
          });
        }

        currentDate = parseDate(dividend.date);
        investmentByMonth = new Big(dividend.investment);
      }

      if (index === aDividends.length - 1) {
        // Store current month (latest order)
        dividends.push({
          date: format(set(currentDate, { date: 1 }), DATE_FORMAT),
          investment: investmentByMonth
        });
      }
    }

    return dividends;
  }

  private getFees({
    date = new Date(0),
    orders,
    userCurrency
  }: {
    date?: Date;
    orders: OrderWithAccount[];
    userCurrency: string;
  }) {
    return orders
      .filter((order) => {
        // Filter out all orders before given date
        return isBefore(date, new Date(order.date));
      })
      .map((order) => {
        return this.exchangeRateDataService.toCurrency(
          order.fee,
          order.SymbolProfile.currency,
          userCurrency
        );
      })
      .reduce(
        (previous, current) => new Big(previous).plus(current),
        new Big(0)
      );
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
      allocationCurrent: 0,
      allocationInvestment: 0,
      assetClass: AssetClass.CASH,
      assetSubClass: AssetClass.CASH,
      countries: [],
      dataSource: undefined,
      grossPerformance: 0,
      grossPerformancePercent: 0,
      investment: balance,
      marketPrice: 0,
      marketState: 'open',
      name: currency,
      netPerformance: 0,
      netPerformancePercent: 0,
      quantity: 0,
      sectors: [],
      symbol: currency,
      transactionCount: 0,
      value: balance
    };
  }

  private getItems(orders: OrderWithAccount[], date = new Date(0)) {
    return orders
      .filter((order) => {
        // Filter out all orders before given date and type item
        return (
          isBefore(date, new Date(order.date)) &&
          order.type === TypeOfOrder.ITEM
        );
      })
      .map((order) => {
        return this.exchangeRateDataService.toCurrency(
          new Big(order.quantity).mul(order.unitPrice).toNumber(),
          order.SymbolProfile.currency,
          this.request.user.Settings.settings.baseCurrency
        );
      })
      .reduce(
        (previous, current) => new Big(previous).plus(current),
        new Big(0)
      );
  }

  private getStartDate(aDateRange: DateRange, portfolioStart: Date) {
    switch (aDateRange) {
      case '1d':
        portfolioStart = max([portfolioStart, subDays(new Date(), 1)]);
        break;
      case 'ytd':
        portfolioStart = max([portfolioStart, setDayOfYear(new Date(), 1)]);
        break;
      case '1y':
        portfolioStart = max([portfolioStart, subYears(new Date(), 1)]);
        break;
      case '5y':
        portfolioStart = max([portfolioStart, subYears(new Date(), 5)]);
        break;
    }
    return portfolioStart;
  }

  private async getSummary({
    impersonationId,
    userCurrency,
    userId
  }: {
    impersonationId: string;
    userCurrency: string;
    userId: string;
  }): Promise<PortfolioSummary> {
    userId = await this.getUserId(impersonationId, userId);
    const user = await this.userService.user({ id: userId });

    const performanceInformation = await this.getPerformance({
      impersonationId,
      userId
    });

    const { balanceInBaseCurrency } = await this.accountService.getCashDetails({
      userId,
      currency: userCurrency
    });
    const orders = await this.orderService.getOrders({
      userCurrency,
      userId
    });

    const excludedActivities = (
      await this.orderService.getOrders({
        userCurrency,
        userId,
        withExcludedAccounts: true
      })
    ).filter(({ Account: account }) => {
      return account?.isExcluded ?? false;
    });

    const dividend = this.getDividend({ orders, userCurrency }).toNumber();
    const emergencyFund = new Big(
      (user.Settings?.settings as UserSettings)?.emergencyFund ?? 0
    );
    const fees = this.getFees({ orders, userCurrency }).toNumber();
    const firstOrderDate = orders[0]?.date;
    const items = this.getItems(orders).toNumber();

    const totalBuy = this.getTotalByType(orders, userCurrency, 'BUY');
    const totalSell = this.getTotalByType(orders, userCurrency, 'SELL');

    const cash = new Big(balanceInBaseCurrency).minus(emergencyFund).toNumber();
    const committedFunds = new Big(totalBuy).minus(totalSell);
    const totalOfExcludedActivities = new Big(
      this.getTotalByType(excludedActivities, userCurrency, 'BUY')
    ).minus(this.getTotalByType(excludedActivities, userCurrency, 'SELL'));

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
      .plus(performanceInformation.performance.currentValue)
      .plus(items)
      .plus(excludedAccountsAndActivities)
      .toNumber();

    const daysInMarket = differenceInDays(new Date(), firstOrderDate);

    const annualizedPerformancePercent = new PortfolioCalculator({
      currency: userCurrency,
      currentRateService: this.currentRateService,
      orders: []
    })
      .getAnnualizedPerformancePercent({
        daysInMarket,
        netPerformancePercent: new Big(
          performanceInformation.performance.currentNetPerformancePercent
        )
      })
      ?.toNumber();

    return {
      ...performanceInformation.performance,
      annualizedPerformancePercent,
      cash,
      dividend,
      excludedAccountsAndActivities,
      fees,
      firstOrderDate,
      items,
      netWorth,
      totalBuy,
      totalSell,
      committedFunds: committedFunds.toNumber(),
      emergencyFund: emergencyFund.toNumber(),
      ordersCount: orders.filter((order) => {
        return order.type === 'BUY' || order.type === 'SELL';
      }).length
    };
  }

  private async getTransactionPoints({
    filters,
    includeDrafts = false,
    userId,
    withExcludedAccounts
  }: {
    filters?: Filter[];
    includeDrafts?: boolean;
    userId: string;
    withExcludedAccounts?: boolean;
  }): Promise<{
    transactionPoints: TransactionPoint[];
    orders: OrderWithAccount[];
    portfolioOrders: PortfolioOrder[];
  }> {
    const userCurrency =
      this.request.user?.Settings?.settings.baseCurrency ?? this.baseCurrency;

    const orders = await this.orderService.getOrders({
      filters,
      includeDrafts,
      userCurrency,
      userId,
      withExcludedAccounts,
      types: ['BUY', 'SELL']
    });

    if (orders.length <= 0) {
      return { transactionPoints: [], orders: [], portfolioOrders: [] };
    }

    const portfolioOrders: PortfolioOrder[] = orders.map((order) => ({
      currency: order.SymbolProfile.currency,
      dataSource: order.SymbolProfile.dataSource,
      date: format(order.date, DATE_FORMAT),
      fee: new Big(
        this.exchangeRateDataService.toCurrency(
          order.fee,
          order.SymbolProfile.currency,
          userCurrency
        )
      ),
      name: order.SymbolProfile?.name,
      quantity: new Big(order.quantity),
      symbol: order.SymbolProfile.symbol,
      type: order.type,
      unitPrice: new Big(
        this.exchangeRateDataService.toCurrency(
          order.unitPrice,
          order.SymbolProfile.currency,
          userCurrency
        )
      )
    }));

    const portfolioCalculator = new PortfolioCalculator({
      currency: userCurrency,
      currentRateService: this.currentRateService,
      orders: portfolioOrders
    });

    portfolioCalculator.computeTransactionPoints();

    return {
      orders,
      portfolioOrders,
      transactionPoints: portfolioCalculator.getTransactionPoints()
    };
  }

  private async getValueOfAccounts({
    filters = [],
    orders,
    portfolioItemsNow,
    userCurrency,
    userId,
    withExcludedAccounts
  }: {
    filters?: Filter[];
    orders: OrderWithAccount[];
    portfolioItemsNow: { [p: string]: TimelinePosition };
    userCurrency: string;
    userId: string;
    withExcludedAccounts?: boolean;
  }) {
    const accounts: PortfolioDetails['accounts'] = {};

    let currentAccounts: (Account & {
      Order?: Order[];
      Platform?: Platform;
    })[] = [];

    if (filters.length === 0) {
      currentAccounts = await this.accountService.getAccounts(userId);
    } else if (filters.length === 1 && filters[0].type === 'ACCOUNT') {
      currentAccounts = await this.accountService.accounts({
        where: { id: filters[0].id }
      });
    } else {
      const accountIds = uniq(
        orders.map(({ accountId }) => {
          return accountId;
        })
      );

      currentAccounts = await this.accountService.accounts({
        where: { id: { in: accountIds } }
      });
    }

    currentAccounts = currentAccounts.filter((account) => {
      return withExcludedAccounts || account.isExcluded === false;
    });

    for (const account of currentAccounts) {
      const ordersByAccount = orders.filter(({ accountId }) => {
        return accountId === account.id;
      });

      accounts[account.id] = {
        balance: account.balance,
        currency: account.currency,
        current: this.exchangeRateDataService.toCurrency(
          account.balance,
          account.currency,
          userCurrency
        ),
        name: account.name,
        original: this.exchangeRateDataService.toCurrency(
          account.balance,
          account.currency,
          userCurrency
        )
      };

      for (const order of ordersByAccount) {
        let currentValueOfSymbolInBaseCurrency =
          order.quantity *
          portfolioItemsNow[order.SymbolProfile.symbol].marketPrice;
        let originalValueOfSymbolInBaseCurrency =
          this.exchangeRateDataService.toCurrency(
            order.quantity * order.unitPrice,
            order.SymbolProfile.currency,
            userCurrency
          );

        if (order.type === 'SELL') {
          currentValueOfSymbolInBaseCurrency *= -1;
          originalValueOfSymbolInBaseCurrency *= -1;
        }

        if (accounts[order.Account?.id || UNKNOWN_KEY]?.current) {
          accounts[order.Account?.id || UNKNOWN_KEY].current +=
            currentValueOfSymbolInBaseCurrency;
          accounts[order.Account?.id || UNKNOWN_KEY].original +=
            originalValueOfSymbolInBaseCurrency;
        } else {
          accounts[order.Account?.id || UNKNOWN_KEY] = {
            balance: 0,
            currency: order.Account?.currency,
            current: currentValueOfSymbolInBaseCurrency,
            name: account.name,
            original: originalValueOfSymbolInBaseCurrency
          };
        }
      }
    }

    return accounts;
  }

  private async getUserId(aImpersonationId: string, aUserId: string) {
    const impersonationUserId =
      await this.impersonationService.validateImpersonationId(
        aImpersonationId,
        aUserId
      );

    return impersonationUserId || aUserId;
  }

  private getTotalByType(
    orders: OrderWithAccount[],
    currency: string,
    type: TypeOfOrder
  ) {
    return orders
      .filter(
        (order) => !isAfter(order.date, endOfToday()) && order.type === type
      )
      .map((order) => {
        return this.exchangeRateDataService.toCurrency(
          order.quantity * order.unitPrice,
          order.SymbolProfile.currency,
          currency
        );
      })
      .reduce((previous, current) => previous + current, 0);
  }

  private getUserCurrency(aUser: UserWithSettings) {
    return (
      aUser.Settings?.settings.baseCurrency ??
      this.request.user?.Settings?.settings.baseCurrency ??
      this.baseCurrency
    );
  }
}
