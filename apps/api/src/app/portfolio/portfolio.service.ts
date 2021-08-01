import { AccountService } from '@ghostfolio/api/app/account/account.service';
import { CurrentRateService } from '@ghostfolio/api/app/core/current-rate.service';
import { PortfolioOrder } from '@ghostfolio/api/app/core/interfaces/portfolio-order.interface';
import { TimelineSpecification } from '@ghostfolio/api/app/core/interfaces/timeline-specification.interface';
import { PortfolioCalculator } from '@ghostfolio/api/app/core/portfolio-calculator';
import { OrderService } from '@ghostfolio/api/app/order/order.service';
import { OrderType } from '@ghostfolio/api/models/order-type';
import { DataProviderService } from '@ghostfolio/api/services/data-provider.service';
import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data.service';
import { ImpersonationService } from '@ghostfolio/api/services/impersonation.service';
import { Type } from '@ghostfolio/api/services/interfaces/interfaces';
import { RulesService } from '@ghostfolio/api/services/rules.service';
import { DATE_FORMAT, parseDate } from '@ghostfolio/common/helper';
import {
  PortfolioOverview,
  PortfolioPerformance,
  PortfolioPosition,
  PortfolioReport,
  Position,
  TimelinePosition
} from '@ghostfolio/common/interfaces';
import {
  DateRange,
  OrderWithAccount,
  RequestWithUser
} from '@ghostfolio/common/types';
import { Inject, Injectable } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { Currency, DataSource, Type as TypeOfOrder } from '@prisma/client';
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
import { SymbolProfileService } from '@ghostfolio/api/services/symbol-profile.service';
import { UNKNOWN_KEY } from '@ghostfolio/common/config';
import { EnhancedSymbolProfile } from '@ghostfolio/api/services/interfaces/symbol-profile.interface';
import { TransactionPoint } from '@ghostfolio/api/app/core/interfaces/transaction-point.interface';
import { InvestmentItem } from '@ghostfolio/common/interfaces/investment-item.interface';
import { AccountClusterRiskInitialInvestment } from '@ghostfolio/api/models/rules/account-cluster-risk/initial-investment';
import { AccountClusterRiskCurrentInvestment } from '@ghostfolio/api/models/rules/account-cluster-risk/current-investment';
import { AccountClusterRiskSingleAccount } from '@ghostfolio/api/models/rules/account-cluster-risk/single-account';
import { CurrencyClusterRiskBaseCurrencyInitialInvestment } from '@ghostfolio/api/models/rules/currency-cluster-risk/base-currency-initial-investment';
import { CurrencyClusterRiskBaseCurrencyCurrentInvestment } from '@ghostfolio/api/models/rules/currency-cluster-risk/base-currency-current-investment';
import { CurrencyClusterRiskInitialInvestment } from '@ghostfolio/api/models/rules/currency-cluster-risk/initial-investment';
import { CurrencyClusterRiskCurrentInvestment } from '@ghostfolio/api/models/rules/currency-cluster-risk/current-investment';
import { FeeRatioInitialInvestment } from '@ghostfolio/api/models/rules/fees/fee-ratio-initial-investment';

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

    const { transactionPoints } = await this.getTransactionPoints(userId);
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

    const { transactionPoints } = await this.getTransactionPoints(userId);
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

  public async getOverview(
    aImpersonationId: string
  ): Promise<PortfolioOverview> {
    const userId = await this.getUserId(aImpersonationId);

    const currency = this.request.user.Settings.currency;
    const { balance } = await this.accountService.getCashDetails(
      userId,
      currency
    );
    const orders = await this.getOrders(userId);
    const fees = this.getFees(orders);

    const totalBuy = this.getTotalByType(orders, currency, TypeOfOrder.BUY);
    const totalSell = this.getTotalByType(orders, currency, TypeOfOrder.SELL);
    return {
      committedFunds: totalBuy - totalSell,
      fees,
      cash: balance,
      ordersCount: orders.length,
      totalBuy: totalBuy,
      totalSell: totalSell
    };
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

    const { transactionPoints, orders } = await this.getTransactionPoints(
      userId
    );

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

    const result: { [symbol: string]: PortfolioPosition } = {};
    const totalValue = currentPositions.currentValue;

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
        allocationInvestment: item.investment
          .div(currentPositions.totalInvestment)
          .toNumber(),
        countries: symbolProfile.countries,
        currency: item.currency,
        exchange: dataProviderResponse.exchange,
        grossPerformance: item.grossPerformance.toNumber(),
        grossPerformancePercent: item.grossPerformancePercentage.toNumber(),
        investment: item.investment.toNumber(),
        marketPrice: item.marketPrice,
        marketState: dataProviderResponse.marketState,
        name: item.name,
        quantity: item.quantity.toNumber(),
        sectors: symbolProfile.sectors,
        symbol: item.symbol,
        transactionCount: item.transactionCount,
        type: dataProviderResponse.type,
        value: value.toNumber()
      };
    }

    return result;
  }

  public async getPosition(
    aImpersonationId: string,
    aSymbol: string
  ): Promise<PortfolioPositionDetail> {
    const userId = await this.getUserId(aImpersonationId);

    const portfolioCalculator = new PortfolioCalculator(
      this.currentRateService,
      this.request.user.Settings.currency
    );

    const { transactionPoints, orders } = await this.getTransactionPoints(
      userId
    );

    if (transactionPoints?.length <= 0) {
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

    portfolioCalculator.setTransactionPoints(transactionPoints);

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
        investment,
        marketPrice,
        quantity,
        transactionCount
      } = position;

      const historicalData = await this.dataProviderService.getHistorical(
        [aSymbol],
        'day',
        parseISO(firstBuyDate),
        new Date()
      );

      const historicalDataArray: HistoricalDataItem[] = [];
      let maxPrice = marketPrice;
      let minPrice = marketPrice;

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
            currentAveragePrice = currentSymbol.investment
              .div(currentSymbol.quantity)
              .toNumber();
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
        averagePrice: averagePrice.toNumber(),
        currency,
        firstBuyDate,
        investment: investment.toNumber(),
        marketPrice,
        maxPrice,
        minPrice,
        quantity: quantity.toNumber(),
        transactionCount,
        grossPerformance: position.grossPerformance.toNumber(),
        grossPerformancePercent: position.grossPerformancePercentage.toNumber(),
        historicalData: historicalDataArray,
        symbol: aSymbol
      };
    } else {
      const currentData = await this.dataProviderService.get([aSymbol]);

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

      for (const [date, { marketPrice }] of Object.entries(
        historicalData[aSymbol]
      ).reverse()) {
        historicalDataArray.push({
          date,
          value: marketPrice
        });
      }

      return {
        averagePrice: undefined,
        currency: currentData[aSymbol]?.currency,
        firstBuyDate: undefined,
        grossPerformance: undefined,
        grossPerformancePercent: undefined,
        historicalData: historicalDataArray,
        investment: undefined,
        marketPrice: currentData[aSymbol]?.marketPrice,
        maxPrice: undefined,
        minPrice: undefined,
        quantity: undefined,
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

    const { transactionPoints } = await this.getTransactionPoints(userId);

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

    return {
      hasErrors: currentPositions.hasErrors,
      positions: currentPositions.positions.map((position) => {
        return {
          ...position,
          averagePrice: new Big(position.averagePrice).toNumber(),
          grossPerformance: position.grossPerformance?.toNumber() ?? null,
          grossPerformancePercentage:
            position.grossPerformancePercentage?.toNumber() ?? null,
          investment: new Big(position.investment).toNumber(),
          name: position.name,
          quantity: new Big(position.quantity).toNumber(),
          type: Type.Unknown, // TODO
          url: '' // TODO
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

    const { transactionPoints } = await this.getTransactionPoints(userId);

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
    return {
      hasErrors: currentPositions.hasErrors || hasErrors,
      performance: {
        currentGrossPerformance,
        currentGrossPerformancePercent,
        // TODO: the next two should include fees
        currentNetPerformance: currentGrossPerformance,
        currentNetPerformancePercent: currentGrossPerformancePercent,
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

    const { transactionPoints, orders } = await this.getTransactionPoints(
      userId
    );

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

  private async getTransactionPoints(userId: string): Promise<{
    transactionPoints: TransactionPoint[];
    orders: OrderWithAccount[];
  }> {
    const orders = await this.getOrders(userId);

    if (orders.length <= 0) {
      return { transactionPoints: [], orders: [] };
    }

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
      this.request.user.Settings.currency
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

  private getOrders(aUserId: string) {
    return this.orderService.orders({
      include: {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        Account: true,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        SymbolProfile: true
      },
      orderBy: { date: 'asc' },
      where: { userId: aUserId }
    });
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
