import { Currency } from '@prisma/client';
import { CurrentRateService } from '@ghostfolio/api/app/core/current-rate.service';
import { OrderType } from '@ghostfolio/api/models/order-type';
import Big from 'big.js';

export class PortfolioCalculator {

  private transactionPoints: TransactionPoint[];

  constructor(
    private currentRateService: CurrentRateService,
    private currency: Currency,
    orders: PortfolioOrder[]
  ) {
    this.computeTransactionPoints(orders);
  }

  addOrder(order: PortfolioOrder): void {

  }

  deleteOrder(order: PortfolioOrder): void {

  }

  getPortfolioItemsAtTransactionPoints(): TransactionPoint[] {
    return this.transactionPoints;
  }

  getCurrentPositions(): { [symbol: string]: TimelinePosition } {
    return {};
  }

  calculateTimeline(timelineSpecification: TimelineSpecification[], endDate: Date): TimelinePeriod[] {
    return null;
  }

  private computeTransactionPoints(orders: PortfolioOrder[]) {
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
          quantity: order.quantity.mul(factor).plus(oldAccumulatedSymbol.quantity),
          symbol: order.symbol,
          investment: unitPrice.mul(order.quantity).mul(factor).add(oldAccumulatedSymbol.investment),
          currency: order.currency
        };
      } else {
        currentTransactionPointItem = {
          quantity: order.quantity.mul(factor),
          symbol: order.symbol,
          investment: unitPrice.mul(order.quantity).mul(factor),
          currency: order.currency
        };
      }

      symbols[order.symbol] = currentTransactionPointItem;

      const items = lastTransactionPoint?.items ?? [];
      const newItems = items.filter(transactionPointItem => transactionPointItem.symbol !== order.symbol);
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

interface TimelineSpecification {
  start: Date;
  accuracy: Accuracy
}

interface TimelinePeriod {
  date: Date;
  grossPerformance: number;
  investment: number;
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
