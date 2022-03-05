import { AccountService } from '@ghostfolio/api/app/account/account.service';
import { CashDetails } from '@ghostfolio/api/app/account/interfaces/cash-details.interface';
import { OrderService } from '@ghostfolio/api/app/order/order.service';
import { CurrentRateService } from '@ghostfolio/api/app/portfolio/current-rate.service';
import { PortfolioOrder } from '@ghostfolio/api/app/portfolio/interfaces/portfolio-order.interface';
import { TimelineSpecification } from '@ghostfolio/api/app/portfolio/interfaces/timeline-specification.interface';
import { TransactionPoint } from '@ghostfolio/api/app/portfolio/interfaces/transaction-point.interface';
import { AccountClusterRiskCurrentInvestment } from '@ghostfolio/api/models/rules/account-cluster-risk/current-investment';
import { AccountClusterRiskInitialInvestment } from '@ghostfolio/api/models/rules/account-cluster-risk/initial-investment';
import { AccountClusterRiskSingleAccount } from '@ghostfolio/api/models/rules/account-cluster-risk/single-account';
import { CurrencyClusterRiskBaseCurrencyCurrentInvestment } from '@ghostfolio/api/models/rules/currency-cluster-risk/base-currency-current-investment';
import { CurrencyClusterRiskBaseCurrencyInitialInvestment } from '@ghostfolio/api/models/rules/currency-cluster-risk/base-currency-initial-investment';
import { CurrencyClusterRiskCurrentInvestment } from '@ghostfolio/api/models/rules/currency-cluster-risk/current-investment';
import { CurrencyClusterRiskInitialInvestment } from '@ghostfolio/api/models/rules/currency-cluster-risk/initial-investment';
import { FeeRatioInitialInvestment } from '@ghostfolio/api/models/rules/fees/fee-ratio-initial-investment';
import { DataProviderService } from '@ghostfolio/api/services/data-provider/data-provider.service';
import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data.service';
import { ImpersonationService } from '@ghostfolio/api/services/impersonation.service';
import { MarketState } from '@ghostfolio/api/services/interfaces/interfaces';
import { EnhancedSymbolProfile } from '@ghostfolio/api/services/interfaces/symbol-profile.interface';
import { SymbolProfileService } from '@ghostfolio/api/services/symbol-profile.service';
import { UNKNOWN_KEY, baseCurrency } from '@ghostfolio/common/config';
import { DATE_FORMAT, parseDate } from '@ghostfolio/common/helper';
import {
  Accounts,
  PortfolioDetails,
  PortfolioPerformanceResponse,
  PortfolioReport,
  PortfolioSummary,
  Position,
  TimelinePosition
} from '@ghostfolio/common/interfaces';
import { InvestmentItem } from '@ghostfolio/common/interfaces/investment-item.interface';
import type {
  AccountWithValue,
  DateRange,
  OrderWithAccount,
  RequestWithUser
} from '@ghostfolio/common/types';
import { Inject, Injectable } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { AssetClass, DataSource, Type as TypeOfOrder } from '@prisma/client';
import Big from 'big.js';
import {
  differenceInDays,
  endOfToday,
  format,
  isAfter,
  isBefore,
  max,
  parse,
  parseISO,
  setDayOfYear,
  startOfDay,
  subDays,
  subYears
} from 'date-fns';
import { isEmpty, sortBy } from 'lodash';

import {
  HistoricalDataContainer,
  HistoricalDataItem,
  PortfolioPositionDetail
} from './interfaces/portfolio-position-detail.interface';
import { PortfolioCalculatorNew } from './portfolio-calculator-new';
import { RulesService } from './rules.service';

@Injectable()
export class PortfolioServiceNew {
  public constructor(
    private readonly accountService: AccountService,
    private readonly currentRateService: CurrentRateService,
    private readonly dataProviderService: DataProviderService,
    private readonly exchangeRateDataService: ExchangeRateDataService,
    private readonly impersonationService: ImpersonationService,
    private readonly orderService: OrderService,
    @Inject(REQUEST) private readonly request: RequestWithUser,
    private readonly rulesService: RulesService,
    private readonly symbolProfileService: SymbolProfileService
  ) {}

  public async getAccounts(aUserId: string): Promise<AccountWithValue[]> {
    const [accounts, details] = await Promise.all([
      this.accountService.accounts({
        include: { Order: true, Platform: true },
        orderBy: { name: 'asc' },
        where: { userId: aUserId }
      }),
      this.getDetails(aUserId, aUserId)
    ]);

    const userCurrency = this.request.user.Settings.currency;

    return accounts.map((account) => {
      let transactionCount = 0;

      for (const order of account.Order) {
        if (!order.isDraft) {
          transactionCount += 1;
        }
      }

      const value = details.accounts[account.id]?.current ?? 0;

      const result = {
        ...account,
        transactionCount,
        value,
        balanceInBaseCurrency: this.exchangeRateDataService.toCurrency(
          account.balance,
          account.currency,
          userCurrency
        ),
        valueInBaseCurrency: this.exchangeRateDataService.toCurrency(
          value,
          account.currency,
          userCurrency
        )
      };

      delete result.Order;

      return result;
    });
  }

  public async getAccountsWithAggregations(aUserId: string): Promise<Accounts> {
    const accounts = await this.getAccounts(aUserId);
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

  public async getInvestments(
    aImpersonationId: string
  ): Promise<InvestmentItem[]> {
    const userId = await this.getUserId(aImpersonationId, this.request.user.id);

    const { portfolioOrders, transactionPoints } =
      await this.getTransactionPoints({
        userId,
        includeDrafts: true
      });

    const portfolioCalculator = new PortfolioCalculatorNew({
      currency: this.request.user.Settings.currency,
      currentRateService: this.currentRateService,
      orders: portfolioOrders
    });

    portfolioCalculator.setTransactionPoints(transactionPoints);
    if (transactionPoints.length === 0) {
      return [];
    }

    const investments = portfolioCalculator.getInvestments().map((item) => {
      return {
        date: item.date,
        investment: item.investment.toNumber()
      };
    });

    // Add investment of today
    const investmentOfToday = investments.filter((investment) => {
      return investment.date === format(new Date(), DATE_FORMAT);
    });

    if (investmentOfToday.length <= 0) {
      const pastInvestments = investments.filter((investment) => {
        return isBefore(parseDate(investment.date), new Date());
      });
      const lastInvestment = pastInvestments[pastInvestments.length - 1];

      investments.push({
        date: format(new Date(), DATE_FORMAT),
        investment: lastInvestment?.investment ?? 0
      });
    }

    return sortBy(investments, (investment) => {
      return investment.date;
    });
  }

  public async getChart(
    aImpersonationId: string,
    aDateRange: DateRange = 'max'
  ): Promise<HistoricalDataContainer> {
    const userId = await this.getUserId(aImpersonationId, this.request.user.id);

    const { portfolioOrders, transactionPoints } =
      await this.getTransactionPoints({
        userId
      });

    const portfolioCalculator = new PortfolioCalculatorNew({
      currency: this.request.user.Settings.currency,
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
    let portfolioStart = parse(
      transactionPoints[0].date,
      DATE_FORMAT,
      new Date()
    );

    // Get start date for the full portfolio because of because of the
    // min and max calculation
    portfolioStart = this.getStartDate('max', portfolioStart);

    const timelineSpecification: TimelineSpecification[] = [
      {
        start: format(portfolioStart, DATE_FORMAT),
        accuracy: 'day'
      }
    ];

    const timelineInfo = await portfolioCalculator.calculateTimeline(
      timelineSpecification,
      format(new Date(), DATE_FORMAT)
    );

    const timeline = timelineInfo.timelinePeriods;

    const items = timeline
      .filter((timelineItem) => timelineItem !== null)
      .map((timelineItem) => ({
        date: timelineItem.date,
        marketPrice: timelineItem.value,
        value: timelineItem.netPerformance.toNumber()
      }));

    let lastItem = null;
    if (timeline.length > 0) {
      lastItem = timeline[timeline.length - 1];
    }

    let isAllTimeHigh = timelineInfo.maxNetPerformance?.eq(
      lastItem?.netPerformance
    );
    let isAllTimeLow = timelineInfo.minNetPerformance?.eq(
      lastItem?.netPerformance
    );
    if (isAllTimeHigh && isAllTimeLow) {
      isAllTimeHigh = false;
      isAllTimeLow = false;
    }

    portfolioStart = startOfDay(
      this.getStartDate(
        aDateRange,
        parse(transactionPoints[0].date, DATE_FORMAT, new Date())
      )
    );

    return {
      isAllTimeHigh,
      isAllTimeLow,
      items: items.filter((item) => {
        // Filter items of date range
        return !isAfter(portfolioStart, parseDate(item.date));
      })
    };
  }

  public async getDetails(
    aImpersonationId: string,
    aUserId: string,
    aDateRange: DateRange = 'max'
  ): Promise<PortfolioDetails & { hasErrors: boolean }> {
    const userId = await this.getUserId(aImpersonationId, aUserId);

    const userCurrency = this.request.user?.Settings?.currency ?? baseCurrency;

    const { orders, portfolioOrders, transactionPoints } =
      await this.getTransactionPoints({
        userId
      });

    const portfolioCalculator = new PortfolioCalculatorNew({
      currency: userCurrency,
      currentRateService: this.currentRateService,
      orders: portfolioOrders
    });

    portfolioCalculator.setTransactionPoints(transactionPoints);

    const portfolioStart = parseDate(
      transactionPoints[0]?.date ?? format(new Date(), DATE_FORMAT)
    );
    const startDate = this.getStartDate(aDateRange, portfolioStart);
    const currentPositions = await portfolioCalculator.getCurrentPositions(
      startDate
    );

    const cashDetails = await this.accountService.getCashDetails(
      userId,
      userCurrency
    );

    const holdings: PortfolioDetails['holdings'] = {};
    const totalInvestment = currentPositions.totalInvestment.plus(
      cashDetails.balanceInBaseCurrency
    );
    const totalValue = currentPositions.currentValue.plus(
      cashDetails.balanceInBaseCurrency
    );

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
      this.symbolProfileService.getSymbolProfiles(symbols)
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

      const value = item.quantity.mul(item.marketPrice);
      const symbolProfile = symbolProfileMap[item.symbol];
      const dataProviderResponse = dataProviderResponses[item.symbol];
      holdings[item.symbol] = {
        allocationCurrent: value.div(totalValue).toNumber(),
        allocationInvestment: item.investment.div(totalInvestment).toNumber(),
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
        marketState: dataProviderResponse.marketState,
        name: symbolProfile.name,
        netPerformance: item.netPerformance?.toNumber() ?? 0,
        netPerformancePercent: item.netPerformancePercentage?.toNumber() ?? 0,
        quantity: item.quantity.toNumber(),
        sectors: symbolProfile.sectors,
        symbol: item.symbol,
        transactionCount: item.transactionCount,
        value: value.toNumber()
      };
    }

    const cashPositions = await this.getCashPositions({
      cashDetails,
      userCurrency,
      investment: totalInvestment,
      value: totalValue
    });

    for (const symbol of Object.keys(cashPositions)) {
      holdings[symbol] = cashPositions[symbol];
    }

    const accounts = await this.getValueOfAccounts(
      orders,
      portfolioItemsNow,
      userCurrency,
      userId
    );

    return { accounts, holdings, hasErrors: currentPositions.hasErrors };
  }

  public async getPosition(
    aDataSource: DataSource,
    aImpersonationId: string,
    aSymbol: string
  ): Promise<PortfolioPositionDetail> {
    const userCurrency = this.request.user.Settings.currency;
    const userId = await this.getUserId(aImpersonationId, this.request.user.id);

    const orders = (
      await this.orderService.getOrders({ userCurrency, userId })
    ).filter(({ SymbolProfile }) => {
      return (
        SymbolProfile.dataSource === aDataSource &&
        SymbolProfile.symbol === aSymbol
      );
    });

    if (orders.length <= 0) {
      return {
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

    const positionCurrency = orders[0].currency;
    const [SymbolProfile] = await this.symbolProfileService.getSymbolProfiles([
      aSymbol
    ]);

    const portfolioOrders: PortfolioOrder[] = orders
      .filter((order) => {
        return order.type === 'BUY' || order.type === 'SELL';
      })
      .map((order) => ({
        currency: order.currency,
        dataSource: order.SymbolProfile?.dataSource ?? order.dataSource,
        date: format(order.date, DATE_FORMAT),
        fee: new Big(order.fee),
        name: order.SymbolProfile?.name,
        quantity: new Big(order.quantity),
        symbol: order.symbol,
        type: order.type,
        unitPrice: new Big(order.unitPrice)
      }));

    const portfolioCalculator = new PortfolioCalculatorNew({
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
        transactionCount,
        averagePrice: averagePrice.toNumber(),
        grossPerformancePercent:
          position.grossPerformancePercentage?.toNumber(),
        historicalData: historicalDataArray,
        netPerformancePercent: position.netPerformancePercentage?.toNumber(),
        quantity: quantity.toNumber(),
        value: this.exchangeRateDataService.toCurrency(
          quantity.mul(marketPrice).toNumber(),
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

    const portfolioCalculator = new PortfolioCalculatorNew({
      currency: this.request.user.Settings.currency,
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
      this.symbolProfileService.getSymbolProfiles(symbols)
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
            dataProviderResponses[position.symbol]?.marketState ??
            MarketState.delayed,
          name: symbolProfileMap[position.symbol].name,
          netPerformance: position.netPerformance?.toNumber() ?? null,
          netPerformancePercentage:
            position.netPerformancePercentage?.toNumber() ?? null,
          quantity: new Big(position.quantity).toNumber()
        };
      })
    };
  }

  public async getPerformance(
    aImpersonationId: string,
    aDateRange: DateRange = 'max'
  ): Promise<PortfolioPerformanceResponse> {
    const userId = await this.getUserId(aImpersonationId, this.request.user.id);

    const { portfolioOrders, transactionPoints } =
      await this.getTransactionPoints({
        userId
      });

    const portfolioCalculator = new PortfolioCalculatorNew({
      currency: this.request.user.Settings.currency,
      currentRateService: this.currentRateService,
      orders: portfolioOrders
    });

    if (transactionPoints?.length <= 0) {
      return {
        hasErrors: false,
        performance: {
          currentGrossPerformance: 0,
          currentGrossPerformancePercent: 0,
          currentNetPerformance: 0,
          currentNetPerformancePercent: 0,
          currentValue: 0
        }
      };
    }

    portfolioCalculator.setTransactionPoints(transactionPoints);

    const portfolioStart = parseDate(transactionPoints[0].date);
    const startDate = this.getStartDate(aDateRange, portfolioStart);
    const currentPositions = await portfolioCalculator.getCurrentPositions(
      startDate
    );

    const hasErrors = currentPositions.hasErrors;
    const currentValue = currentPositions.currentValue.toNumber();
    const currentGrossPerformance =
      currentPositions.grossPerformance.toNumber();
    const currentGrossPerformancePercent =
      currentPositions.grossPerformancePercentage.toNumber();
    const currentNetPerformance = currentPositions.netPerformance.toNumber();
    const currentNetPerformancePercent =
      currentPositions.netPerformancePercentage.toNumber();

    return {
      errors: currentPositions.errors,
      hasErrors: currentPositions.hasErrors || hasErrors,
      performance: {
        currentGrossPerformance,
        currentGrossPerformancePercent,
        currentNetPerformance,
        currentNetPerformancePercent,
        currentValue
      }
    };
  }

  public async getReport(impersonationId: string): Promise<PortfolioReport> {
    const currency = this.request.user.Settings.currency;
    const userId = await this.getUserId(impersonationId, this.request.user.id);

    const { orders, portfolioOrders, transactionPoints } =
      await this.getTransactionPoints({
        userId
      });

    if (isEmpty(orders)) {
      return {
        rules: {}
      };
    }

    const portfolioCalculator = new PortfolioCalculatorNew({
      currency,
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
    const accounts = await this.getValueOfAccounts(
      orders,
      portfolioItemsNow,
      currency,
      userId
    );
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
          { baseCurrency: currency }
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
          { baseCurrency: currency }
        ),
        fees: await this.rulesService.evaluate(
          [
            new FeeRatioInitialInvestment(
              this.exchangeRateDataService,
              currentPositions.totalInvestment.toNumber(),
              this.getFees(orders).toNumber()
            )
          ],
          { baseCurrency: currency }
        )
      }
    };
  }

  public async getSummary(aImpersonationId: string): Promise<PortfolioSummary> {
    const userCurrency = this.request.user.Settings.currency;
    const userId = await this.getUserId(aImpersonationId, this.request.user.id);

    const performanceInformation = await this.getPerformance(aImpersonationId);

    const { balanceInBaseCurrency } = await this.accountService.getCashDetails(
      userId,
      userCurrency
    );
    const orders = await this.orderService.getOrders({
      userCurrency,
      userId
    });
    const dividend = this.getDividend(orders).toNumber();
    const fees = this.getFees(orders).toNumber();
    const firstOrderDate = orders[0]?.date;
    const items = this.getItems(orders).toNumber();

    const totalBuy = this.getTotalByType(orders, userCurrency, 'BUY');
    const totalSell = this.getTotalByType(orders, userCurrency, 'SELL');

    const committedFunds = new Big(totalBuy).minus(totalSell);

    const netWorth = new Big(balanceInBaseCurrency)
      .plus(performanceInformation.performance.currentValue)
      .plus(items)
      .toNumber();

    const daysInMarket = differenceInDays(new Date(), firstOrderDate);

    const annualizedPerformancePercent = new PortfolioCalculatorNew({
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
      dividend,
      fees,
      firstOrderDate,
      items,
      netWorth,
      totalBuy,
      totalSell,
      cash: balanceInBaseCurrency,
      committedFunds: committedFunds.toNumber(),
      ordersCount: orders.filter((order) => {
        return order.type === 'BUY' || order.type === 'SELL';
      }).length
    };
  }

  private async getCashPositions({
    cashDetails,
    investment,
    userCurrency,
    value
  }: {
    cashDetails: CashDetails;
    investment: Big;
    value: Big;
    userCurrency: string;
  }) {
    const cashPositions = {};

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
        cashPositions[account.currency] = {
          allocationCurrent: 0,
          allocationInvestment: 0,
          assetClass: AssetClass.CASH,
          assetSubClass: AssetClass.CASH,
          countries: [],
          currency: account.currency,
          grossPerformance: 0,
          grossPerformancePercent: 0,
          investment: convertedBalance,
          marketPrice: 0,
          marketState: MarketState.open,
          name: account.currency,
          netPerformance: 0,
          netPerformancePercent: 0,
          quantity: 0,
          sectors: [],
          symbol: account.currency,
          transactionCount: 0,
          value: convertedBalance
        };
      }
    }

    for (const symbol of Object.keys(cashPositions)) {
      // Calculate allocations for each currency
      cashPositions[symbol].allocationCurrent = new Big(
        cashPositions[symbol].value
      )
        .div(value)
        .toNumber();
      cashPositions[symbol].allocationInvestment = new Big(
        cashPositions[symbol].investment
      )
        .div(investment)
        .toNumber();
    }

    return cashPositions;
  }

  private getDividend(orders: OrderWithAccount[], date = new Date(0)) {
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
          order.currency,
          this.request.user.Settings.currency
        );
      })
      .reduce(
        (previous, current) => new Big(previous).plus(current),
        new Big(0)
      );
  }

  private getFees(orders: OrderWithAccount[], date = new Date(0)) {
    return orders
      .filter((order) => {
        // Filter out all orders before given date
        return isBefore(date, new Date(order.date));
      })
      .map((order) => {
        return this.exchangeRateDataService.toCurrency(
          order.fee,
          order.currency,
          this.request.user.Settings.currency
        );
      })
      .reduce(
        (previous, current) => new Big(previous).plus(current),
        new Big(0)
      );
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
          order.currency,
          this.request.user.Settings.currency
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

  private async getTransactionPoints({
    includeDrafts = false,
    userId
  }: {
    includeDrafts?: boolean;
    userId: string;
  }): Promise<{
    transactionPoints: TransactionPoint[];
    orders: OrderWithAccount[];
    portfolioOrders: PortfolioOrder[];
  }> {
    const userCurrency = this.request.user?.Settings?.currency ?? baseCurrency;

    const orders = await this.orderService.getOrders({
      includeDrafts,
      userCurrency,
      userId,
      types: ['BUY', 'SELL']
    });

    if (orders.length <= 0) {
      return { transactionPoints: [], orders: [], portfolioOrders: [] };
    }

    const portfolioOrders: PortfolioOrder[] = orders.map((order) => ({
      currency: order.currency,
      dataSource: order.SymbolProfile?.dataSource ?? order.dataSource,
      date: format(order.date, DATE_FORMAT),
      fee: new Big(
        this.exchangeRateDataService.toCurrency(
          order.fee,
          order.currency,
          userCurrency
        )
      ),
      name: order.SymbolProfile?.name,
      quantity: new Big(order.quantity),
      symbol: order.symbol,
      type: order.type,
      unitPrice: new Big(
        this.exchangeRateDataService.toCurrency(
          order.unitPrice,
          order.currency,
          userCurrency
        )
      )
    }));

    const portfolioCalculator = new PortfolioCalculatorNew({
      currency: userCurrency,
      currentRateService: this.currentRateService,
      orders: portfolioOrders
    });

    portfolioCalculator.computeTransactionPoints();

    return {
      transactionPoints: portfolioCalculator.getTransactionPoints(),
      orders,
      portfolioOrders
    };
  }

  private async getValueOfAccounts(
    orders: OrderWithAccount[],
    portfolioItemsNow: { [p: string]: TimelinePosition },
    userCurrency: string,
    userId: string
  ) {
    const accounts: PortfolioDetails['accounts'] = {};

    const currentAccounts = await this.accountService.getAccounts(userId);

    for (const account of currentAccounts) {
      const ordersByAccount = orders.filter(({ accountId }) => {
        return accountId === account.id;
      });

      accounts[account.id] = {
        balance: account.balance,
        currency: account.currency,
        current: account.balance,
        name: account.name,
        original: account.balance
      };

      for (const order of ordersByAccount) {
        let currentValueOfSymbol =
          order.quantity * portfolioItemsNow[order.symbol].marketPrice;
        let originalValueOfSymbol = order.quantity * order.unitPrice;

        if (order.type === 'SELL') {
          currentValueOfSymbol *= -1;
          originalValueOfSymbol *= -1;
        }

        if (accounts[order.Account?.id || UNKNOWN_KEY]?.current) {
          accounts[order.Account?.id || UNKNOWN_KEY].current +=
            currentValueOfSymbol;
          accounts[order.Account?.id || UNKNOWN_KEY].original +=
            originalValueOfSymbol;
        } else {
          accounts[order.Account?.id || UNKNOWN_KEY] = {
            balance: 0,
            currency: order.Account?.currency,
            current: currentValueOfSymbol,
            name: account.name,
            original: originalValueOfSymbol
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
          order.currency,
          currency
        );
      })
      .reduce((previous, current) => previous + current, 0);
  }
}
