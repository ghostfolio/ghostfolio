import { Inject, Injectable } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { RequestWithUser } from 'apps/api/src/app/interfaces/request-with-user.type';
import {
  add,
  format,
  getDate,
  getMonth,
  getYear,
  isAfter,
  isSameDay,
  parse,
  parseISO,
  setDate,
  setMonth,
  sub
} from 'date-fns';
import { isEmpty } from 'lodash';
import * as roundTo from 'round-to';

import { Portfolio } from '../../models/portfolio';
import { DataProviderService } from '../../services/data-provider.service';
import { ExchangeRateDataService } from '../../services/exchange-rate-data.service';
import { ImpersonationService } from '../../services/impersonation.service';
import { IOrder } from '../../services/interfaces/interfaces';
import { RulesService } from '../../services/rules.service';
import { OrderService } from '../order/order.service';
import { RedisCacheService } from '../redis-cache/redis-cache.service';
import { UserService } from '../user/user.service';
import { DateRange } from './interfaces/date-range.type';
import { PortfolioItem } from './interfaces/portfolio-item.interface';
import { PortfolioOverview } from './interfaces/portfolio-overview.interface';
import {
  HistoricalDataItem,
  PortfolioPositionDetail
} from './interfaces/portfolio-position-detail.interface';

@Injectable()
export class PortfolioService {
  public constructor(
    private readonly dataProviderService: DataProviderService,
    private readonly exchangeRateDataService: ExchangeRateDataService,
    private readonly impersonationService: ImpersonationService,
    private readonly orderService: OrderService,
    private readonly redisCacheService: RedisCacheService,
    @Inject(REQUEST) private readonly request: RequestWithUser,
    private readonly rulesService: RulesService,
    private readonly userService: UserService
  ) {}

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

  public async createPortfolio(aUserId: string): Promise<Portfolio> {
    let portfolio: Portfolio;
    let stringifiedPortfolio = await this.redisCacheService.get(
      `${aUserId}.portfolio`
    );

    const user = await this.userService.user({ id: aUserId });

    if (stringifiedPortfolio) {
      // Get portfolio from redis
      const {
        orders,
        portfolioItems
      }: { orders: IOrder[]; portfolioItems: PortfolioItem[] } = JSON.parse(
        stringifiedPortfolio
      );

      portfolio = new Portfolio(
        this.dataProviderService,
        this.exchangeRateDataService,
        this.rulesService
      ).createFromData({ orders, portfolioItems, user });
    } else {
      // Get portfolio from database
      const orders = await this.orderService.orders({
        include: {
          Platform: true
        },
        orderBy: { date: 'asc' },
        where: { userId: aUserId }
      });

      portfolio = new Portfolio(
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
    return await portfolio.addCurrentPortfolioItems();
  }

  public async findAll(aImpersonationId: string): Promise<PortfolioItem[]> {
    try {
      const impersonationUserId = await this.impersonationService.validateImpersonationId(
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
    const impersonationUserId = await this.impersonationService.validateImpersonationId(
      aImpersonationId,
      this.request.user.id
    );

    const portfolio = await this.createPortfolio(
      impersonationUserId || this.request.user.id
    );

    if (portfolio.getOrders().length <= 0) {
      return [];
    }

    const dateRangeDate = this.convertDateRangeToDate(
      aDateRange,
      portfolio.getMinDate()
    );

    return portfolio
      .get()
      .filter((portfolioItem) => {
        if (dateRangeDate === undefined) {
          return true;
        }

        return (
          isSameDay(parseISO(portfolioItem.date), dateRangeDate) ||
          isAfter(parseISO(portfolioItem.date), dateRangeDate)
        );
      })
      .map((portfolioItem) => {
        return {
          date: format(parseISO(portfolioItem.date), 'yyyy-MM-dd'),
          grossPerformancePercent: portfolioItem.grossPerformancePercent,
          marketPrice: portfolioItem.value || null,
          value: portfolioItem.value || null
        };
      });
  }

  public async getOverview(
    aImpersonationId: string
  ): Promise<PortfolioOverview> {
    const impersonationUserId = await this.impersonationService.validateImpersonationId(
      aImpersonationId,
      this.request.user.id
    );

    const portfolio = await this.createPortfolio(
      impersonationUserId || this.request.user.id
    );

    const committedFunds = portfolio.getCommittedFunds();
    const fees = portfolio.getFees();

    return {
      committedFunds,
      fees,
      ordersCount: portfolio.getOrders().length,
      totalBuy: portfolio.getTotalBuy(),
      totalSell: portfolio.getTotalSell()
    };
  }

  public async getPosition(
    aImpersonationId: string,
    aSymbol: string
  ): Promise<PortfolioPositionDetail> {
    const impersonationUserId = await this.impersonationService.validateImpersonationId(
      aImpersonationId,
      this.request.user.id
    );

    const portfolio = await this.createPortfolio(
      impersonationUserId || this.request.user.id
    );

    const positions = portfolio.getPositions(new Date())[aSymbol];

    if (positions) {
      let {
        averagePrice,
        currency,
        firstBuyDate,
        investment,
        marketPrice,
        quantity
      } = portfolio.getPositions(new Date())[aSymbol];

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
      let maxPrice = marketPrice;
      let minPrice = marketPrice;

      if (historicalData[aSymbol]) {
        for (const [date, { marketPrice }] of Object.entries(
          historicalData[aSymbol]
        )) {
          historicalDataArray.push({
            averagePrice,
            date,
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
          [aSymbol],
          portfolio.getMinDate(),
          new Date()
        );
      }

      const historicalDataArray: HistoricalDataItem[] = [];

      for (const [date, { marketPrice, performance }] of Object.entries(
        historicalData[aSymbol]
      ).reverse()) {
        historicalDataArray.push({
          date,
          value: marketPrice
        });
      }

      return {
        averagePrice: undefined,
        currency: currentData[aSymbol].currency,
        firstBuyDate: undefined,
        grossPerformance: undefined,
        grossPerformancePercent: undefined,
        historicalData: historicalDataArray,
        investment: undefined,
        marketPrice: currentData[aSymbol].marketPrice,
        maxPrice: undefined,
        minPrice: undefined,
        quantity: undefined,
        symbol: aSymbol
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
      symbol: aSymbol
    };
  }
}
