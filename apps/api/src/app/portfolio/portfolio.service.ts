import { AccountService } from '@ghostfolio/api/app/account/account.service';
import { CurrentRateService } from '@ghostfolio/api/app/core/current-rate.service';
import { PortfolioOrder } from '@ghostfolio/api/app/core/interfaces/portfolio-order.interface';
import { TimelineSpecification } from '@ghostfolio/api/app/core/interfaces/timeline-specification.interface';
import { PortfolioCalculator } from '@ghostfolio/api/app/core/portfolio-calculator';
import { OrderService } from '@ghostfolio/api/app/order/order.service';
import { RedisCacheService } from '@ghostfolio/api/app/redis-cache/redis-cache.service';
import { UserService } from '@ghostfolio/api/app/user/user.service';
import { OrderType } from '@ghostfolio/api/models/order-type';
import { Portfolio } from '@ghostfolio/api/models/portfolio';
import { DataProviderService } from '@ghostfolio/api/services/data-provider.service';
import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data.service';
import { ImpersonationService } from '@ghostfolio/api/services/impersonation.service';
import { IOrder, Type } from '@ghostfolio/api/services/interfaces/interfaces';
import { RulesService } from '@ghostfolio/api/services/rules.service';
import { DATE_FORMAT, parseDate } from '@ghostfolio/common/helper';
import {
  PortfolioItem,
  PortfolioOverview,
  PortfolioPerformance,
  PortfolioPosition,
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
import { DataSource } from '@prisma/client';
import Big from 'big.js';
import {
  add,
  addMonths,
  format,
  getDate,
  getMonth,
  getYear,
  isAfter,
  isSameDay,
  max,
  parse,
  parseISO,
  setDate,
  setDayOfYear,
  setMonth,
  sub,
  subDays,
  subYears
} from 'date-fns';
import { isEmpty } from 'lodash';
import * as roundTo from 'round-to';

import {
  HistoricalDataItem,
  PortfolioPositionDetail
} from './interfaces/portfolio-position-detail.interface';
import { SymbolProfileService } from '@ghostfolio/api/services/symbol-profile.service';
import { UNKNOWN_KEY } from '@ghostfolio/common/config';
import { EnhancedSymbolProfile } from '@ghostfolio/api/services/interfaces/symbol-profile.interface';
import { TransactionPoint } from '@ghostfolio/api/app/core/interfaces/transaction-point.interface';

@Injectable()
export class PortfolioService {
  public constructor(
    private readonly accountService: AccountService,
    private readonly currentRateService: CurrentRateService,
    private readonly dataProviderService: DataProviderService,
    private readonly exchangeRateDataService: ExchangeRateDataService,
    private readonly impersonationService: ImpersonationService,
    private readonly orderService: OrderService,
    private readonly redisCacheService: RedisCacheService,
    @Inject(REQUEST) private readonly request: RequestWithUser,
    private readonly rulesService: RulesService,
    private readonly userService: UserService,
    private readonly symbolProfileService: SymbolProfileService
  ) {}

  public async createPortfolio(aUserId: string): Promise<Portfolio> {
    let portfolio: Portfolio;
    const stringifiedPortfolio = await this.redisCacheService.get(
      `${aUserId}.portfolio`
    );

    const user = await this.userService.user({ id: aUserId });

    if (stringifiedPortfolio) {
      // Get portfolio from redis
      const {
        orders,
        portfolioItems
      }: { orders: IOrder[]; portfolioItems: PortfolioItem[] } =
        JSON.parse(stringifiedPortfolio);

      portfolio = new Portfolio(
        this.accountService,
        this.dataProviderService,
        this.exchangeRateDataService,
        this.rulesService
      ).createFromData({ orders, portfolioItems, user });
    } else {
      // Get portfolio from database
      const orders = await this.getOrders(aUserId);

      portfolio = new Portfolio(
        this.accountService,
        this.dataProviderService,
        this.exchangeRateDataService,
        this.rulesService
      );
      portfolio.setUser(user);
      await portfolio.setOrders(orders);

      // Cache data for the next time...
      const portfolioData = {
        orders: portfolio.getOrders(),
        portfolioItems: portfolio.getPortfolioItems()
      };

      await this.redisCacheService.set(
        `${aUserId}.portfolio`,
        JSON.stringify(portfolioData)
      );
    }

    // Enrich portfolio with current data
    await portfolio.addCurrentPortfolioItems();

    // Enrich portfolio with future data
    await portfolio.addFuturePortfolioItems();

    return portfolio;
  }

  public async findAll(aImpersonationId: string): Promise<PortfolioItem[]> {
    try {
      const impersonationUserId =
        await this.impersonationService.validateImpersonationId(
          aImpersonationId,
          this.request.user.id
        );

      const portfolio = await this.createPortfolio(
        impersonationUserId || this.request.user.id
      );
      return portfolio.get();
    } catch (error) {
      console.error(error);
    }
  }

  public async getChart(
    aImpersonationId: string,
    aDateRange: DateRange = 'max'
  ): Promise<HistoricalDataItem[]> {
    const impersonationUserId =
      await this.impersonationService.validateImpersonationId(
        aImpersonationId,
        this.request.user.id
      );

    const userId = impersonationUserId || this.request.user.id;

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
    const impersonationUserId =
      await this.impersonationService.validateImpersonationId(
        aImpersonationId,
        this.request.user.id
      );

    const portfolio = await this.createPortfolio(
      impersonationUserId || this.request.user.id
    );

    const { balance } = await this.accountService.getCashDetails(
      impersonationUserId || this.request.user.id,
      this.request.user.Settings.currency
    );
    const committedFunds = portfolio.getCommittedFunds();
    const fees = portfolio.getFees();

    return {
      committedFunds,
      fees,
      cash: balance,
      ordersCount: portfolio.getOrders().length,
      totalBuy: portfolio.getTotalBuy(),
      totalSell: portfolio.getTotalSell()
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
    const portfolio = await this.createPortfolio(userId);

    const position = portfolio.getPositions(new Date())[aSymbol];

    if (position) {
      const {
        averagePrice,
        currency,
        firstBuyDate,
        investment,
        quantity,
        transactionCount
      } = position;
      let marketPrice = position.marketPrice;
      const orders = portfolio.getOrders(aSymbol);

      const historicalData = await this.dataProviderService.getHistorical(
        [aSymbol],
        'day',
        parseISO(firstBuyDate),
        new Date()
      );

      if (marketPrice === 0) {
        marketPrice = averagePrice;
      }

      const historicalDataArray: HistoricalDataItem[] = [];
      let currentAveragePrice: number;
      let maxPrice = marketPrice;
      let minPrice = marketPrice;

      if (historicalData[aSymbol]) {
        for (const [date, { marketPrice }] of Object.entries(
          historicalData[aSymbol]
        )) {
          const currentDate = parse(date, DATE_FORMAT, new Date());
          if (
            isSameDay(currentDate, parseISO(orders[0]?.getDate())) ||
            isAfter(currentDate, parseISO(orders[0]?.getDate()))
          ) {
            // Get snapshot of first day of next month
            const snapshot = portfolio.get(
              addMonths(setDate(currentDate, 1), 1)
            )?.[0]?.positions[aSymbol];
            orders.shift();

            if (snapshot?.averagePrice) {
              currentAveragePrice = snapshot.averagePrice;
            }
          }

          historicalDataArray.push({
            date,
            averagePrice: currentAveragePrice,
            value: marketPrice
          });

          if (
            marketPrice &&
            (marketPrice > maxPrice || maxPrice === undefined)
          ) {
            maxPrice = marketPrice;
          }

          if (
            marketPrice &&
            (marketPrice < minPrice || minPrice === undefined)
          ) {
            minPrice = marketPrice;
          }
        }
      }

      return {
        averagePrice,
        currency,
        firstBuyDate,
        investment,
        marketPrice,
        maxPrice,
        minPrice,
        quantity,
        transactionCount,
        grossPerformance: this.exchangeRateDataService.toCurrency(
          marketPrice - averagePrice,
          currency,
          this.request.user.Settings.currency
        ),
        grossPerformancePercent: roundTo(
          (marketPrice - averagePrice) / averagePrice,
          4
        ),
        historicalData: historicalDataArray,
        symbol: aSymbol
      };
    } else if (portfolio.getMinDate()) {
      const currentData = await this.dataProviderService.get([aSymbol]);

      let historicalData = await this.dataProviderService.getHistorical(
        [aSymbol],
        'day',
        portfolio.getMinDate(),
        new Date()
      );

      if (isEmpty(historicalData)) {
        historicalData = await this.dataProviderService.getHistoricalRaw(
          [{ dataSource: DataSource.YAHOO, symbol: aSymbol }],
          portfolio.getMinDate(),
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
    const impersonationUserId =
      await this.impersonationService.validateImpersonationId(
        aImpersonationId,
        this.request.user.id
      );
    const userId = impersonationUserId || this.request.user.id;

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

  private convertDateRangeToDate(aDateRange: DateRange, aMinDate: Date) {
    let currentDate = new Date();

    const normalizedMinDate =
      getDate(aMinDate) === 1
        ? aMinDate
        : add(setDate(aMinDate, 1), { months: 1 });

    const year = getYear(currentDate);
    const month = getMonth(currentDate);
    const day = getDate(currentDate);

    currentDate = new Date(Date.UTC(year, month, day, 0));

    switch (aDateRange) {
      case '1d':
        return sub(currentDate, {
          days: 1
        });
      case 'ytd':
        currentDate = setDate(currentDate, 1);
        currentDate = setMonth(currentDate, 0);
        return isAfter(currentDate, normalizedMinDate)
          ? currentDate
          : undefined;
      case '1y':
        currentDate = setDate(currentDate, 1);
        currentDate = sub(currentDate, {
          years: 1
        });
        return isAfter(currentDate, normalizedMinDate)
          ? currentDate
          : undefined;
      case '5y':
        currentDate = setDate(currentDate, 1);
        currentDate = sub(currentDate, {
          years: 5
        });
        return isAfter(currentDate, normalizedMinDate)
          ? currentDate
          : undefined;
      default:
        // Gets handled as all data
        return undefined;
    }
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
}
