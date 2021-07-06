import { Currency } from '@prisma/client';
import { CurrentRateService } from '@ghostfolio/api/app/core/current-rate.service';
import { OrderType } from '@ghostfolio/api/models/order-type';
import Big from 'big.js';

export class PortfolioCalculator {
  private transactionPoints: TransactionPoint[];

  constructor(
    private currentRateService: CurrentRateService,
    private currency: Currency
  ) {}

  addOrder(order: PortfolioOrder): void {}

  deleteOrder(order: PortfolioOrder): void {}

  computeTransactionPoints(orders: PortfolioOrder[]) {
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

  setTransactionPoints(transactionPoints: TransactionPoint[]) {
    this.transactionPoints = transactionPoints;
  }

  getTransactionPoints(): TransactionPoint[] {
    return this.transactionPoints;
  }

  async getCurrentPositions(): Promise<{ [symbol: string]: TimelinePosition }> {
    if (!this.transactionPoints?.length) {
      return {};
    }

    const lastTransactionPoint =
      this.transactionPoints[this.transactionPoints.length - 1];

    const result: { [symbol: string]: TimelinePosition } = {};
    for (const item of lastTransactionPoint.items) {
      const marketPrice = await this.currentRateService.getValue({
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
        marketPrice: marketPrice,
        transactionCount: item.transactionCount
      };
    }

    return result;
  }

  calculateTimeline(
    timelineSpecification: TimelineSpecification[],
    endDate: Date
  ): TimelinePeriod[] {
    return null;
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

interface TimelineSpecification {
  start: Date;
  accuracy: Accuracy;
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
