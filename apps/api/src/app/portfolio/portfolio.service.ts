import { AccountService } from '@ghostfolio/api/app/account/account.service';
import { CashDetails } from '@ghostfolio/api/app/account/interfaces/cash-details.interface';
import { OrderService } from '@ghostfolio/api/app/order/order.service';
import { CurrentRateService } from '@ghostfolio/api/app/portfolio/current-rate.service';
import { PortfolioOrder } from '@ghostfolio/api/app/portfolio/interfaces/portfolio-order.interface';
import { TimelineSpecification } from '@ghostfolio/api/app/portfolio/interfaces/timeline-specification.interface';
import { TransactionPoint } from '@ghostfolio/api/app/portfolio/interfaces/transaction-point.interface';
import { PortfolioCalculator } from '@ghostfolio/api/app/portfolio/portfolio-calculator';
import { OrderType } from '@ghostfolio/api/models/order-type';
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
import { UNKNOWN_KEY, ghostfolioCashSymbol } from '@ghostfolio/common/config';
import { DATE_FORMAT, parseDate } from '@ghostfolio/common/helper';
import {
  PortfolioPerformance,
  PortfolioPosition,
  PortfolioReport,
  PortfolioSummary,
  Position,
  TimelinePosition
} from '@ghostfolio/common/interfaces';
import { InvestmentItem } from '@ghostfolio/common/interfaces/investment-item.interface';
import {
  DateRange,
  OrderWithAccount,
  RequestWithUser
} from '@ghostfolio/common/types';
import { Inject, Injectable } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import {
  AssetClass,
  Currency,
  DataSource,
  Type as TypeOfOrder
} from '@prisma/client';
import Big from 'big.js';
import {
  endOfToday,
  format,
  isAfter,
  isBefore,
  max,
  parse,
  parseISO,
  setDayOfYear,
  subDays,
  subYears
} from 'date-fns';
import { isEmpty } from 'lodash';

import {
  HistoricalDataItem,
  PortfolioPositionDetail
} from './interfaces/portfolio-position-detail.interface';
import { RulesService } from './rules.service';

@Injectable()
export class PortfolioService {
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

  public async getInvestments(
    aImpersonationId: string
  ): Promise<InvestmentItem[]> {
    const userId = await this.getUserId(aImpersonationId);

    const portfolioCalculator = new PortfolioCalculator(
      this.currentRateService,
      this.request.user.Settings.currency
    );

    const { transactionPoints } = await this.getTransactionPoints({
      userId,
      includeDrafts: true
    });
    portfolioCalculator.setTransactionPoints(transactionPoints);
    if (transactionPoints.length === 0) {
      return [];
    }

    return portfolioCalculator.getInvestments().map((item) => {
      return {
        date: item.date,
        investment: item.investment.toNumber()
      };
    });
  }

  public async getChart(
    aImpersonationId: string,
    aDateRange: DateRange = 'max'
  ): Promise<HistoricalDataItem[]> {
    const userId = await this.getUserId(aImpersonationId);

    const portfolioCalculator = new PortfolioCalculator(
      this.currentRateService,
      this.request.user.Settings.currency
    );

    const { transactionPoints } = await this.getTransactionPoints({ userId });
    portfolioCalculator.setTransactionPoints(transactionPoints);
    if (transactionPoints.length === 0) {
      return [];
    }
    let portfolioStart = parse(
      transactionPoints[0].date,
      DATE_FORMAT,
      new Date()
    );
    portfolioStart = this.getStartDate(aDateRange, portfolioStart);

    const timelineSpecification: TimelineSpecification[] = [
      {
        start: format(portfolioStart, DATE_FORMAT),
        accuracy: 'day'
      }
    ];

    const timeline = await portfolioCalculator.calculateTimeline(
      timelineSpecification,
      format(new Date(), DATE_FORMAT)
    );

    return timeline
      .filter((timelineItem) => timelineItem !== null)
      .map((timelineItem) => ({
        date: timelineItem.date,
        marketPrice: timelineItem.value,
        value: timelineItem.grossPerformance.toNumber()
      }));
  }

  public async getDetails(
    aImpersonationId: string,
    aDateRange: DateRange = 'max'
  ): Promise<{ [symbol: string]: PortfolioPosition }> {
    const userId = await this.getUserId(aImpersonationId);

    const userCurrency = this.request.user.Settings.currency;
    const portfolioCalculator = new PortfolioCalculator(
      this.currentRateService,
      userCurrency
    );

    const { orders, transactionPoints } = await this.getTransactionPoints({
      userId
    });

    if (transactionPoints?.length <= 0) {
      return {};
    }

    portfolioCalculator.setTransactionPoints(transactionPoints);

    const portfolioStart = parseDate(transactionPoints[0].date);
    const startDate = this.getStartDate(aDateRange, portfolioStart);
    const currentPositions = await portfolioCalculator.getCurrentPositions(
      startDate
    );

    if (currentPositions.hasErrors) {
      throw new Error('Missing information');
    }

    const cashDetails = await this.accountService.getCashDetails(
      userId,
      userCurrency
    );

    const result: { [symbol: string]: PortfolioPosition } = {};
    const totalInvestment = currentPositions.totalInvestment.plus(
      cashDetails.balance
    );
    const totalValue = currentPositions.currentValue.plus(cashDetails.balance);

    const symbols = currentPositions.positions.map(
      (position) => position.symbol
    );

    const [dataProviderResponses, symbolProfiles] = await Promise.all([
      this.dataProviderService.get(symbols),
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
    const accounts = this.getAccounts(orders, portfolioItemsNow, userCurrency);

    for (const item of currentPositions.positions) {
      const value = item.quantity.mul(item.marketPrice);
      const symbolProfile = symbolProfileMap[item.symbol];
      const dataProviderResponse = dataProviderResponses[item.symbol];
      result[item.symbol] = {
        accounts,
        allocationCurrent: value.div(totalValue).toNumber(),
        allocationInvestment: item.investment.div(totalInvestment).toNumber(),
        assetClass: symbolProfile.assetClass,
        countries: symbolProfile.countries,
        currency: item.currency,
        exchange: dataProviderResponse.exchange,
        grossPerformance: item.grossPerformance.toNumber(),
        grossPerformancePercent: item.grossPerformancePercentage.toNumber(),
        investment: item.investment.toNumber(),
        marketPrice: item.marketPrice,
        marketState: dataProviderResponse.marketState,
        name: symbolProfile.name,
        quantity: item.quantity.toNumber(),
        sectors: symbolProfile.sectors,
        symbol: item.symbol,
        transactionCount: item.transactionCount,
        value: value.toNumber()
      };
    }

    // TODO: Add a cash position for each currency
    result[ghostfolioCashSymbol] = await this.getCashPosition({
      cashDetails,
      investment: totalInvestment,
      value: totalValue
    });

    return result;
  }

  public async getPosition(
    aImpersonationId: string,
    aSymbol: string
  ): Promise<PortfolioPositionDetail> {
    const userId = await this.getUserId(aImpersonationId);

    const orders = (await this.orderService.getOrders({ userId })).filter(
      (order) => order.symbol === aSymbol
    );

    if (orders.length <= 0) {
      return {
        averagePrice: undefined,
        currency: undefined,
        firstBuyDate: undefined,
        grossPerformance: undefined,
        grossPerformancePercent: undefined,
        historicalData: [],
        investment: undefined,
        marketPrice: undefined,
        maxPrice: undefined,
        minPrice: undefined,
        quantity: undefined,
        symbol: aSymbol,
        transactionCount: undefined
      };
    }

    const positionCurrency = orders[0].currency;

    const portfolioOrders: PortfolioOrder[] = orders.map((order) => ({
      currency: order.currency,
      date: format(order.date, DATE_FORMAT),
      name: order.SymbolProfile?.name,
      quantity: new Big(order.quantity),
      symbol: order.symbol,
      type: <OrderType>order.type,
      unitPrice: new Big(order.unitPrice)
    }));

    const portfolioCalculator = new PortfolioCalculator(
      this.currentRateService,
      positionCurrency
    );
    portfolioCalculator.computeTransactionPoints(portfolioOrders);
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
        firstBuyDate,
        marketPrice,
        quantity,
        transactionCount
      } = position;

      // Convert investment and gross performance to currency of user
      const userCurrency = this.request.user.Settings.currency;
      const investment = this.exchangeRateDataService.toCurrency(
        position.investment.toNumber(),
        currency,
        userCurrency
      );
      const grossPerformance = this.exchangeRateDataService.toCurrency(
        position.grossPerformance.toNumber(),
        currency,
        userCurrency
      );

      const historicalData = await this.dataProviderService.getHistorical(
        [aSymbol],
        'day',
        parseISO(firstBuyDate),
        new Date()
      );

      const historicalDataArray: HistoricalDataItem[] = [];
      let maxPrice = orders[0].unitPrice;
      let minPrice = orders[0].unitPrice;

      if (!historicalData[aSymbol][firstBuyDate]) {
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
        currency,
        firstBuyDate,
        grossPerformance,
        investment,
        marketPrice,
        maxPrice,
        minPrice,
        transactionCount,
        averagePrice: averagePrice.toNumber(),
        grossPerformancePercent: position.grossPerformancePercentage.toNumber(),
        historicalData: historicalDataArray,
        quantity: quantity.toNumber(),
        symbol: aSymbol
      };
    } else {
      const currentData = await this.dataProviderService.get([aSymbol]);
      const marketPrice = currentData[aSymbol]?.marketPrice;

      let historicalData = await this.dataProviderService.getHistorical(
        [aSymbol],
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
        averagePrice: 0,
        currency: currentData[aSymbol]?.currency,
        firstBuyDate: undefined,
        grossPerformance: undefined,
        grossPerformancePercent: undefined,
        historicalData: historicalDataArray,
        investment: 0,
        quantity: 0,
        symbol: aSymbol,
        transactionCount: undefined
      };
    }
  }

  public async getPositions(
    aImpersonationId: string,
    aDateRange: DateRange = 'max'
  ): Promise<{ hasErrors: boolean; positions: Position[] }> {
    const userId = await this.getUserId(aImpersonationId);

    const portfolioCalculator = new PortfolioCalculator(
      this.currentRateService,
      this.request.user.Settings.currency
    );

    const { transactionPoints } = await this.getTransactionPoints({ userId });

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
    const symbols = positions.map((position) => position.symbol);

    const [dataProviderResponses, symbolProfiles] = await Promise.all([
      this.dataProviderService.get(symbols),
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
          marketState: dataProviderResponses[position.symbol].marketState,
          name: symbolProfileMap[position.symbol].name,
          quantity: new Big(position.quantity).toNumber()
        };
      })
    };
  }

  public async getPerformance(
    aImpersonationId: string,
    aDateRange: DateRange = 'max'
  ): Promise<{ hasErrors: boolean; performance: PortfolioPerformance }> {
    const userId = await this.getUserId(aImpersonationId);

    const portfolioCalculator = new PortfolioCalculator(
      this.currentRateService,
      this.request.user.Settings.currency
    );

    const { transactionPoints } = await this.getTransactionPoints({ userId });

    if (transactionPoints?.length <= 0) {
      return {
        hasErrors: false,
        performance: {
          currentGrossPerformance: 0,
          currentGrossPerformancePercent: 0,
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
    return {
      hasErrors: currentPositions.hasErrors || hasErrors,
      performance: {
        currentGrossPerformance,
        currentGrossPerformancePercent,
        currentValue: currentValue
      }
    };
  }

  public getFees(orders: OrderWithAccount[], date = new Date(0)) {
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
      .reduce((previous, current) => previous + current, 0);
  }

  public async getReport(impersonationId: string): Promise<PortfolioReport> {
    const userId = await this.getUserId(impersonationId);
    const baseCurrency = this.request.user.Settings.currency;

    const { orders, transactionPoints } = await this.getTransactionPoints({
      userId
    });

    if (isEmpty(orders)) {
      return {
        rules: {}
      };
    }

    const portfolioCalculator = new PortfolioCalculator(
      this.currentRateService,
      this.request.user.Settings.currency
    );
    portfolioCalculator.setTransactionPoints(transactionPoints);

    const portfolioStart = parseDate(transactionPoints[0].date);
    const currentPositions = await portfolioCalculator.getCurrentPositions(
      portfolioStart
    );

    const portfolioItemsNow: { [symbol: string]: TimelinePosition } = {};
    for (const position of currentPositions.positions) {
      portfolioItemsNow[position.symbol] = position;
    }
    const accounts = this.getAccounts(orders, portfolioItemsNow, baseCurrency);
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
          { baseCurrency }
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
          { baseCurrency }
        ),
        fees: await this.rulesService.evaluate(
          [
            new FeeRatioInitialInvestment(
              this.exchangeRateDataService,
              currentPositions.totalInvestment.toNumber(),
              this.getFees(orders)
            )
          ],
          { baseCurrency }
        )
      }
    };
  }

  public async getSummary(aImpersonationId: string): Promise<PortfolioSummary> {
    const currency = this.request.user.Settings.currency;
    const userId = await this.getUserId(aImpersonationId);

    const performanceInformation = await this.getPerformance(aImpersonationId);

    const { balance } = await this.accountService.getCashDetails(
      userId,
      currency
    );
    const orders = await this.orderService.getOrders({ userId });
    const fees = this.getFees(orders);
    const firstOrderDate = orders[0]?.date;

    const totalBuy = this.getTotalByType(orders, currency, TypeOfOrder.BUY);
    const totalSell = this.getTotalByType(orders, currency, TypeOfOrder.SELL);

    const committedFunds = new Big(totalBuy).sub(totalSell);

    const netWorth = new Big(balance)
      .plus(performanceInformation.performance.currentValue)
      .toNumber();

    return {
      ...performanceInformation.performance,
      fees,
      firstOrderDate,
      netWorth,
      cash: balance,
      committedFunds: committedFunds.toNumber(),
      ordersCount: orders.length,
      totalBuy: totalBuy,
      totalSell: totalSell
    };
  }

  private async getCashPosition({
    cashDetails,
    investment,
    value
  }: {
    cashDetails: CashDetails;
    investment: Big;
    value: Big;
  }) {
    const accounts = {};
    const cashValue = new Big(cashDetails.balance);

    cashDetails.accounts.forEach((account) => {
      accounts[account.name] = {
        current: account.balance,
        original: account.balance
      };
    });

    return {
      accounts,
      allocationCurrent: cashValue.div(value).toNumber(),
      allocationInvestment: cashValue.div(investment).toNumber(),
      assetClass: AssetClass.CASH,
      countries: [],
      currency: Currency.CHF,
      grossPerformance: 0,
      grossPerformancePercent: 0,
      investment: cashValue.toNumber(),
      marketPrice: 0,
      marketState: MarketState.open,
      name: 'Cash',
      quantity: 0,
      sectors: [],
      symbol: ghostfolioCashSymbol,
      transactionCount: 0,
      value: cashValue.toNumber()
    };
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
  }> {
    const orders = await this.orderService.getOrders({ includeDrafts, userId });

    if (orders.length <= 0) {
      return { transactionPoints: [], orders: [] };
    }

    const userCurrency = this.request.user.Settings.currency;
    const portfolioOrders: PortfolioOrder[] = orders.map((order) => ({
      currency: order.currency,
      date: format(order.date, DATE_FORMAT),
      name: order.SymbolProfile?.name,
      quantity: new Big(order.quantity),
      symbol: order.symbol,
      type: <OrderType>order.type,
      unitPrice: new Big(
        this.exchangeRateDataService.toCurrency(
          order.unitPrice,
          order.currency,
          userCurrency
        )
      )
    }));

    const portfolioCalculator = new PortfolioCalculator(
      this.currentRateService,
      userCurrency
    );
    portfolioCalculator.computeTransactionPoints(portfolioOrders);
    return {
      transactionPoints: portfolioCalculator.getTransactionPoints(),
      orders
    };
  }

  private getAccounts(
    orders: OrderWithAccount[],
    portfolioItemsNow: { [p: string]: TimelinePosition },
    userCurrency
  ) {
    const accounts: PortfolioPosition['accounts'] = {};
    for (const order of orders) {
      let currentValueOfSymbol = this.exchangeRateDataService.toCurrency(
        order.quantity * portfolioItemsNow[order.symbol].marketPrice,
        order.currency,
        userCurrency
      );
      let originalValueOfSymbol = this.exchangeRateDataService.toCurrency(
        order.quantity * order.unitPrice,
        order.currency,
        userCurrency
      );

      if (order.type === 'SELL') {
        currentValueOfSymbol *= -1;
        originalValueOfSymbol *= -1;
      }

      if (accounts[order.Account?.name || UNKNOWN_KEY]?.current) {
        accounts[order.Account?.name || UNKNOWN_KEY].current +=
          currentValueOfSymbol;
        accounts[order.Account?.name || UNKNOWN_KEY].original +=
          originalValueOfSymbol;
      } else {
        accounts[order.Account?.name || UNKNOWN_KEY] = {
          current: currentValueOfSymbol,
          original: originalValueOfSymbol
        };
      }
    }
    return accounts;
  }

  private async getUserId(aImpersonationId: string) {
    const impersonationUserId =
      await this.impersonationService.validateImpersonationId(
        aImpersonationId,
        this.request.user.id
      );

    return impersonationUserId || this.request.user.id;
  }

  private getTotalByType(
    orders: OrderWithAccount[],
    currency: Currency,
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
