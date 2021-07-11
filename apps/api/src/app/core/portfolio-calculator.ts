import { CurrentRateService } from '@ghostfolio/api/app/core/current-rate.service';
import { OrderType } from '@ghostfolio/api/models/order-type';
import { Currency } from '@prisma/client';
import Big from 'big.js';
import {
  addDays,
  addMonths,
  addYears,
  format,
  isAfter,
  isBefore,
  parse
} from 'date-fns';

const DATE_FORMAT = 'yyyy-MM-dd';

function dparse(date: string) {
  return parse(date, DATE_FORMAT, new Date());
}

export class PortfolioCalculator {
  private transactionPoints: TransactionPoint[];

  public constructor(
    private currentRateService: CurrentRateService,
    private currency: Currency
  ) {}

  public computeTransactionPoints(orders: PortfolioOrder[]) {
    orders.sort((a, b) => a.date.localeCompare(b.date));

    this.transactionPoints = [];
    const symbols: { [symbol: string]: TransactionPointSymbol } = {};

    let lastDate: string = null;
    let lastTransactionPoint: TransactionPoint = null;
    for (const order of orders) {
      const currentDate = order.date;

      let currentTransactionPointItem: TransactionPointSymbol;
      const oldAccumulatedSymbol = symbols[order.symbol];

      const factor = this.getFactor(order.type);
      const unitPrice = new Big(order.unitPrice);
      if (oldAccumulatedSymbol) {
        currentTransactionPointItem = {
          quantity: order.quantity
            .mul(factor)
            .plus(oldAccumulatedSymbol.quantity),
          symbol: order.symbol,
          investment: unitPrice
            .mul(order.quantity)
            .mul(factor)
            .add(oldAccumulatedSymbol.investment),
          currency: order.currency,
          firstBuyDate: oldAccumulatedSymbol.firstBuyDate,
          transactionCount: oldAccumulatedSymbol.transactionCount + 1
        };
      } else {
        currentTransactionPointItem = {
          quantity: order.quantity.mul(factor),
          symbol: order.symbol,
          investment: unitPrice.mul(order.quantity).mul(factor),
          currency: order.currency,
          firstBuyDate: order.date,
          transactionCount: 1
        };
      }

      symbols[order.symbol] = currentTransactionPointItem;

      const items = lastTransactionPoint?.items ?? [];
      const newItems = items.filter(
        (transactionPointItem) => transactionPointItem.symbol !== order.symbol
      );
      if (!currentTransactionPointItem.quantity.eq(0)) {
        newItems.push(currentTransactionPointItem);
      } else {
        delete symbols[order.symbol];
      }
      newItems.sort((a, b) => a.symbol.localeCompare(b.symbol));
      if (lastDate !== currentDate || lastTransactionPoint === null) {
        lastTransactionPoint = {
          date: currentDate,
          items: newItems
        };
        this.transactionPoints.push(lastTransactionPoint);
      } else {
        lastTransactionPoint.items = newItems;
      }
      lastDate = currentDate;
    }
  }

  public setTransactionPoints(transactionPoints: TransactionPoint[]) {
    this.transactionPoints = transactionPoints;
  }

  public getTransactionPoints(): TransactionPoint[] {
    return this.transactionPoints;
  }

  public async getCurrentPositions(): Promise<{
    [symbol: string]: TimelinePosition;
  }> {
    if (!this.transactionPoints?.length) {
      return {};
    }

    const lastTransactionPoint =
      this.transactionPoints[this.transactionPoints.length - 1];

    const result: { [symbol: string]: TimelinePosition } = {};
    for (const item of lastTransactionPoint.items) {
      const marketValue = await this.currentRateService.getValue({
        date: new Date(),
        symbol: item.symbol,
        currency: item.currency,
        userCurrency: this.currency
      });
      result[item.symbol] = {
        averagePrice: item.investment.div(item.quantity),
        firstBuyDate: item.firstBuyDate,
        quantity: item.quantity,
        symbol: item.symbol,
        investment: item.investment,
        marketPrice: marketValue.marketPrice,
        transactionCount: item.transactionCount
      };
    }

    return result;
  }

  public async calculateTimeline(
    timelineSpecification: TimelineSpecification[],
    endDate: string
  ): Promise<TimelinePeriod[]> {
    if (timelineSpecification.length === 0) {
      return [];
    }

    const startDate = timelineSpecification[0].start;
    const start = dparse(startDate);
    const end = dparse(endDate);

    const timelinePeriodPromises: Promise<TimelinePeriod>[] = [];
    let i = 0;
    let j = -1;
    for (
      let currentDate = start;
      !isAfter(currentDate, end);
      currentDate = this.addToDate(
        currentDate,
        timelineSpecification[i].accuracy
      )
    ) {
      if (this.isNextItemActive(timelineSpecification, currentDate, i)) {
        i++;
      }
      while (
        j + 1 < this.transactionPoints.length &&
        !isAfter(dparse(this.transactionPoints[j + 1].date), currentDate)
      ) {
        j++;
      }
      timelinePeriodPromises.push(this.getTimePeriodForDate(j, currentDate));
    }

    const timelinePeriod: TimelinePeriod[] = await Promise.all(
      timelinePeriodPromises
    );

    return timelinePeriod;
  }

  private async getTimePeriodForDate(j: number, currentDate: Date) {
    let investment: Big = new Big(0);
    const promises = [];
    if (j >= 0) {
      for (const item of this.transactionPoints[j].items) {
        investment = investment.add(item.investment);
        promises.push(
          this.currentRateService
            .getValue({
              date: currentDate,
              symbol: item.symbol,
              currency: item.currency,
              userCurrency: this.currency
            })
            .then(({ marketPrice }) => new Big(marketPrice).mul(item.quantity))
        );
      }
    }

    const value = (await Promise.all(promises)).reduce(
      (a, b) => a.add(b),
      new Big(0)
    );
    return {
      date: format(currentDate, DATE_FORMAT),
      grossPerformance: value.minus(investment),
      investment,
      value
    };
  }

  private getFactor(type: OrderType) {
    let factor: number;
    switch (type) {
      case OrderType.Buy:
        factor = 1;
        break;
      case OrderType.Sell:
        factor = -1;
        break;
      default:
        factor = 0;
        break;
    }
    return factor;
  }

  private addToDate(date: Date, accurany: Accuracy): Date {
    switch (accurany) {
      case 'day':
        return addDays(date, 1);
      case 'month':
        return addMonths(date, 1);
      case 'year':
        return addYears(date, 1);
    }
  }

  private isNextItemActive(
    timelineSpecification: TimelineSpecification[],
    currentDate: Date,
    i: number
  ) {
    return (
      i + 1 < timelineSpecification.length &&
      !isBefore(currentDate, dparse(timelineSpecification[i + 1].start))
    );
  }
}

interface TransactionPoint {
  date: string;
  items: TransactionPointSymbol[];
}

interface TransactionPointSymbol {
  quantity: Big;
  symbol: string;
  investment: Big;
  currency: Currency;
  firstBuyDate: string;
  transactionCount: number;
}

interface TimelinePosition {
  averagePrice: Big;
  firstBuyDate: string;
  quantity: Big;
  symbol: string;
  investment: Big;
  marketPrice: number;
  transactionCount: number;
}

type Accuracy = 'year' | 'month' | 'day';

export interface TimelineSpecification {
  start: string;
  accuracy: Accuracy;
}

export interface TimelinePeriod {
  date: string;
  grossPerformance: number;
  investment: Big;
  value: number;
}

export interface PortfolioOrder {
  date: string;
  quantity: Big;
  symbol: string;
  type: OrderType;
  unitPrice: Big;
  currency: Currency;
}
