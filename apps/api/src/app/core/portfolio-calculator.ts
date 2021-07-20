import {
  CurrentRateService,
  GetValueObject
} from '@ghostfolio/api/app/core/current-rate.service';
import { OrderType } from '@ghostfolio/api/models/order-type';
import {
  MarketState,
  Type
} from '@ghostfolio/api/services/interfaces/interfaces';
import { resetHours } from '@ghostfolio/common/helper';
import { TimelinePosition } from '@ghostfolio/common/interfaces';
import { Currency } from '@prisma/client';
import Big from 'big.js';
import {
  addDays,
  addMonths,
  addYears,
  endOfDay,
  format,
  isAfter,
  isBefore,
  max,
  min,
  parse
} from 'date-fns';
import { flatten } from 'lodash';

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
    console.time('compute-transaction-points');

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
    console.timeEnd('compute-transaction-points');
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
      const grossPerformance = new Big(marketValue.marketPrice)
        .mul(item.quantity)
        .minus(item.investment);
      result[item.symbol] = {
        averagePrice: item.investment.div(item.quantity),
        currency: item.currency,
        firstBuyDate: item.firstBuyDate,
        marketState: MarketState.open, // TODO
        quantity: item.quantity,
        symbol: item.symbol,
        investment: item.investment,
        marketPrice: marketValue.marketPrice,
        transactionCount: item.transactionCount,
        grossPerformance,
        grossPerformancePercentage: grossPerformance.div(item.investment),
        url: '', // TODO
        name: '', // TODO,
        type: Type.Unknown // TODO
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
    console.time('calculate-timeline-total');
    console.time('calculate-timeline-calculations');

    const startDate = timelineSpecification[0].start;
    const start = dparse(startDate);
    const end = dparse(endDate);

    const timelinePeriodPromises: Promise<TimelinePeriod[]>[] = [];
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

      let periodEndDate = currentDate;
      if (timelineSpecification[i].accuracy === 'day') {
        let nextEndDate = end;
        if (j + 1 < this.transactionPoints.length) {
          nextEndDate = dparse(this.transactionPoints[j + 1].date);
        }
        periodEndDate = min([
          addMonths(currentDate, 3),
          max([currentDate, nextEndDate])
        ]);
      }
      const timePeriodForDates = this.getTimePeriodForDate(
        j,
        currentDate,
        endOfDay(periodEndDate)
      );
      currentDate = periodEndDate;
      if (timePeriodForDates != null) {
        timelinePeriodPromises.push(timePeriodForDates);
      }
    }
    console.timeEnd('calculate-timeline-calculations');

    console.time('calculate-timeline-periods');

    const timelinePeriods: TimelinePeriod[][] = await Promise.all(
      timelinePeriodPromises
    );

    console.timeEnd('calculate-timeline-periods');
    console.timeEnd('calculate-timeline-total');

    return flatten(timelinePeriods);
  }

  private async getTimePeriodForDate(
    j: number,
    startDate: Date,
    endDate: Date
  ): Promise<TimelinePeriod[]> {
    let investment: Big = new Big(0);

    const marketSymbolMap: {
      [date: string]: { [symbol: string]: Big };
    } = {};
    if (j >= 0) {
      const currencies: { [name: string]: Currency } = {};
      const symbols: string[] = [];

      for (const item of this.transactionPoints[j].items) {
        currencies[item.symbol] = item.currency;
        symbols.push(item.symbol);
        investment = investment.add(item.investment);
      }

      let marketSymbols: GetValueObject[] = [];
      if (symbols.length > 0) {
        try {
          marketSymbols = await this.currentRateService.getValues({
            dateRangeStart: startDate,
            dateRangeEnd: endDate,
            symbols,
            currencies,
            userCurrency: this.currency
          });
        } catch (e) {
          console.error(
            `failed to fetch info for date ${startDate} with exception`,
            e
          );
          return null;
        }
      }

      for (const marketSymbol of marketSymbols) {
        const date = format(marketSymbol.date, DATE_FORMAT);
        if (!marketSymbolMap[date]) {
          marketSymbolMap[date] = {};
        }
        marketSymbolMap[date][marketSymbol.symbol] = new Big(
          marketSymbol.marketPrice
        );
      }
    }

    const results = [];
    for (
      let currentDate = startDate;
      isBefore(currentDate, endDate);
      currentDate = addDays(currentDate, 1)
    ) {
      let value = new Big(0);
      const currentDateAsString = format(currentDate, DATE_FORMAT);
      let invalid = false;
      if (j >= 0) {
        for (const item of this.transactionPoints[j].items) {
          if (
            !marketSymbolMap[currentDateAsString]?.hasOwnProperty(item.symbol)
          ) {
            invalid = true;
            break;
          }
          value = value.add(
            item.quantity.mul(marketSymbolMap[currentDateAsString][item.symbol])
          );
        }
      }
      if (!invalid) {
        const result = {
          date: currentDateAsString,
          grossPerformance: value.minus(investment),
          investment,
          value
        };
        results.push(result);
      }
    }

    return results;
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

type Accuracy = 'year' | 'month' | 'day';

export interface TimelineSpecification {
  start: string;
  accuracy: Accuracy;
}

export interface TimelinePeriod {
  date: string;
  grossPerformance: Big;
  investment: Big;
  value: Big;
}

export interface PortfolioOrder {
  date: string;
  quantity: Big;
  symbol: string;
  type: OrderType;
  unitPrice: Big;
  currency: Currency;
}
