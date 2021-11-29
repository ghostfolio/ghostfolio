import { TimelineInfoInterface } from '@ghostfolio/api/app/portfolio/interfaces/timeline-info.interface';
import { OrderType } from '@ghostfolio/api/models/order-type';
import { IDataGatheringItem } from '@ghostfolio/api/services/interfaces/interfaces';
import { DATE_FORMAT, parseDate, resetHours } from '@ghostfolio/common/helper';
import { TimelinePosition } from '@ghostfolio/common/interfaces';
import { Logger } from '@nestjs/common';
import Big from 'big.js';
import {
  addDays,
  addMonths,
  addYears,
  differenceInDays,
  endOfDay,
  format,
  isAfter,
  isBefore,
  max,
  min
} from 'date-fns';
import { flatten, isNumber } from 'lodash';

import { CurrentRateService } from './current-rate.service';
import { CurrentPositions } from './interfaces/current-positions.interface';
import { GetValueObject } from './interfaces/get-value-object.interface';
import { PortfolioOrder } from './interfaces/portfolio-order.interface';
import { TimelinePeriod } from './interfaces/timeline-period.interface';
import {
  Accuracy,
  TimelineSpecification
} from './interfaces/timeline-specification.interface';
import { TransactionPointSymbol } from './interfaces/transaction-point-symbol.interface';
import { TransactionPoint } from './interfaces/transaction-point.interface';

export class PortfolioCalculator {
  private transactionPoints: TransactionPoint[];

  public constructor(
    private currentRateService: CurrentRateService,
    private currency: string
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
        const newQuantity = order.quantity
          .mul(factor)
          .plus(oldAccumulatedSymbol.quantity);
        currentTransactionPointItem = {
          currency: order.currency,
          dataSource: order.dataSource,
          fee: order.fee.plus(oldAccumulatedSymbol.fee),
          firstBuyDate: oldAccumulatedSymbol.firstBuyDate,
          investment: newQuantity.eq(0)
            ? new Big(0)
            : unitPrice
                .mul(order.quantity)
                .mul(factor)
                .add(oldAccumulatedSymbol.investment),
          quantity: newQuantity,
          symbol: order.symbol,
          transactionCount: oldAccumulatedSymbol.transactionCount + 1
        };
      } else {
        currentTransactionPointItem = {
          currency: order.currency,
          dataSource: order.dataSource,
          fee: order.fee,
          firstBuyDate: order.date,
          investment: unitPrice.mul(order.quantity).mul(factor),
          quantity: order.quantity.mul(factor),
          symbol: order.symbol,
          transactionCount: 1
        };
      }

      symbols[order.symbol] = currentTransactionPointItem;

      const items = lastTransactionPoint?.items ?? [];
      const newItems = items.filter(
        (transactionPointItem) => transactionPointItem.symbol !== order.symbol
      );
      newItems.push(currentTransactionPointItem);
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

  public getAnnualizedPerformancePercent({
    daysInMarket,
    netPerformancePercent
  }: {
    daysInMarket: number;
    netPerformancePercent: Big;
  }): Big {
    if (isNumber(daysInMarket) && daysInMarket > 0) {
      const exponent = new Big(365).div(daysInMarket).toNumber();
      return new Big(
        Math.pow(netPerformancePercent.plus(1).toNumber(), exponent)
      ).minus(1);
    }

    return new Big(0);
  }

  public getTransactionPoints(): TransactionPoint[] {
    return this.transactionPoints;
  }

  public setTransactionPoints(transactionPoints: TransactionPoint[]) {
    this.transactionPoints = transactionPoints;
  }

  public async getCurrentPositions(start: Date): Promise<CurrentPositions> {
    if (!this.transactionPoints?.length) {
      return {
        currentValue: new Big(0),
        hasErrors: false,
        grossPerformance: new Big(0),
        grossPerformancePercentage: new Big(0),
        netAnnualizedPerformance: new Big(0),
        netPerformance: new Big(0),
        netPerformancePercentage: new Big(0),
        positions: [],
        totalInvestment: new Big(0)
      };
    }

    const lastTransactionPoint =
      this.transactionPoints[this.transactionPoints.length - 1];

    // use Date.now() to use the mock for today
    const today = new Date(Date.now());

    let firstTransactionPoint: TransactionPoint = null;
    let firstIndex = this.transactionPoints.length;
    const dates = [];
    const dataGatheringItems: IDataGatheringItem[] = [];
    const currencies: { [symbol: string]: string } = {};

    dates.push(resetHours(start));
    for (const item of this.transactionPoints[firstIndex - 1].items) {
      dataGatheringItems.push({
        dataSource: item.dataSource,
        symbol: item.symbol
      });
      currencies[item.symbol] = item.currency;
    }
    for (let i = 0; i < this.transactionPoints.length; i++) {
      if (
        !isBefore(parseDate(this.transactionPoints[i].date), start) &&
        firstTransactionPoint === null
      ) {
        firstTransactionPoint = this.transactionPoints[i];
        firstIndex = i;
      }
      if (firstTransactionPoint !== null) {
        dates.push(resetHours(parseDate(this.transactionPoints[i].date)));
      }
    }

    dates.push(resetHours(today));

    const marketSymbols = await this.currentRateService.getValues({
      currencies,
      dataGatheringItems,
      dateQuery: {
        in: dates
      },
      userCurrency: this.currency
    });

    const marketSymbolMap: {
      [date: string]: { [symbol: string]: Big };
    } = {};
    for (const marketSymbol of marketSymbols) {
      const date = format(marketSymbol.date, DATE_FORMAT);
      if (!marketSymbolMap[date]) {
        marketSymbolMap[date] = {};
      }
      if (marketSymbol.marketPrice) {
        marketSymbolMap[date][marketSymbol.symbol] = new Big(
          marketSymbol.marketPrice
        );
      }
    }

    let hasErrors = false;
    const startString = format(start, DATE_FORMAT);

    const holdingPeriodReturns: { [symbol: string]: Big } = {};
    const netHoldingPeriodReturns: { [symbol: string]: Big } = {};
    const grossPerformance: { [symbol: string]: Big } = {};
    const netPerformance: { [symbol: string]: Big } = {};
    const todayString = format(today, DATE_FORMAT);

    if (firstIndex > 0) {
      firstIndex--;
    }
    const invalidSymbols = [];
    const lastInvestments: { [symbol: string]: Big } = {};
    const lastQuantities: { [symbol: string]: Big } = {};
    const lastFees: { [symbol: string]: Big } = {};
    const initialValues: { [symbol: string]: Big } = {};

    for (let i = firstIndex; i < this.transactionPoints.length; i++) {
      const currentDate =
        i === firstIndex ? startString : this.transactionPoints[i].date;
      const nextDate =
        i + 1 < this.transactionPoints.length
          ? this.transactionPoints[i + 1].date
          : todayString;

      const items = this.transactionPoints[i].items;
      for (const item of items) {
        if (!marketSymbolMap[nextDate]?.[item.symbol]) {
          invalidSymbols.push(item.symbol);
          hasErrors = true;
          Logger.error(
            `Missing value for symbol ${item.symbol} at ${nextDate}`
          );
          continue;
        }
        let lastInvestment: Big = new Big(0);
        let lastQuantity: Big = item.quantity;
        if (lastInvestments[item.symbol] && lastQuantities[item.symbol]) {
          lastInvestment = item.investment.minus(lastInvestments[item.symbol]);
          lastQuantity = lastQuantities[item.symbol];
        }

        const itemValue = marketSymbolMap[currentDate]?.[item.symbol];
        let initialValue = itemValue?.mul(lastQuantity);
        let investedValue = itemValue?.mul(item.quantity);
        const isFirstOrderAndIsStartBeforeCurrentDate =
          i === firstIndex &&
          isBefore(parseDate(this.transactionPoints[i].date), start);
        const lastFee: Big = lastFees[item.symbol] ?? new Big(0);
        const fee = isFirstOrderAndIsStartBeforeCurrentDate
          ? new Big(0)
          : item.fee.minus(lastFee);
        if (!isAfter(parseDate(currentDate), parseDate(item.firstBuyDate))) {
          initialValue = item.investment;
          investedValue = item.investment;
        }
        if (i === firstIndex || !initialValues[item.symbol]) {
          initialValues[item.symbol] = initialValue;
        }
        if (!item.quantity.eq(0)) {
          if (!initialValue) {
            invalidSymbols.push(item.symbol);
            hasErrors = true;
            Logger.error(
              `Missing value for symbol ${item.symbol} at ${currentDate}`
            );
            continue;
          }

          const cashFlow = lastInvestment;
          const endValue = marketSymbolMap[nextDate][item.symbol].mul(
            item.quantity
          );

          const holdingPeriodReturn = endValue.div(initialValue.plus(cashFlow));
          holdingPeriodReturns[item.symbol] = (
            holdingPeriodReturns[item.symbol] ?? new Big(1)
          ).mul(holdingPeriodReturn);
          grossPerformance[item.symbol] = (
            grossPerformance[item.symbol] ?? new Big(0)
          ).plus(endValue.minus(investedValue));

          const netHoldingPeriodReturn = endValue.div(
            initialValue.plus(cashFlow).plus(fee)
          );
          netHoldingPeriodReturns[item.symbol] = (
            netHoldingPeriodReturns[item.symbol] ?? new Big(1)
          ).mul(netHoldingPeriodReturn);
          netPerformance[item.symbol] = (
            netPerformance[item.symbol] ?? new Big(0)
          ).plus(endValue.minus(investedValue).minus(fee));
        }
        lastInvestments[item.symbol] = item.investment;
        lastQuantities[item.symbol] = item.quantity;
        lastFees[item.symbol] = item.fee;
      }
    }

    const positions: TimelinePosition[] = [];

    for (const item of lastTransactionPoint.items) {
      const marketValue = marketSymbolMap[todayString]?.[item.symbol];
      const isValid = invalidSymbols.indexOf(item.symbol) === -1;
      positions.push({
        averagePrice: item.quantity.eq(0)
          ? new Big(0)
          : item.investment.div(item.quantity),
        currency: item.currency,
        dataSource: item.dataSource,
        firstBuyDate: item.firstBuyDate,
        grossPerformance: isValid
          ? grossPerformance[item.symbol] ?? null
          : null,
        grossPerformancePercentage:
          isValid && holdingPeriodReturns[item.symbol]
            ? holdingPeriodReturns[item.symbol].minus(1)
            : null,
        investment: item.investment,
        marketPrice: marketValue?.toNumber() ?? null,
        netPerformance: isValid ? netPerformance[item.symbol] ?? null : null,
        netPerformancePercentage:
          isValid && netHoldingPeriodReturns[item.symbol]
            ? netHoldingPeriodReturns[item.symbol].minus(1)
            : null,
        quantity: item.quantity,
        symbol: item.symbol,
        transactionCount: item.transactionCount
      });
    }
    const overall = this.calculateOverallPerformance(positions, initialValues);

    return {
      ...overall,
      positions,
      hasErrors: hasErrors || overall.hasErrors
    };
  }

  public getInvestments(): { date: string; investment: Big }[] {
    if (this.transactionPoints.length === 0) {
      return [];
    }

    return this.transactionPoints.map((transactionPoint) => {
      return {
        date: transactionPoint.date,
        investment: transactionPoint.items.reduce(
          (investment, transactionPointSymbol) =>
            investment.add(transactionPointSymbol.investment),
          new Big(0)
        )
      };
    });
  }

  public async calculateTimeline(
    timelineSpecification: TimelineSpecification[],
    endDate: string
  ): Promise<TimelineInfoInterface> {
    if (timelineSpecification.length === 0) {
      return {
        maxNetPerformance: new Big(0),
        minNetPerformance: new Big(0),
        timelinePeriods: []
      };
    }

    const startDate = timelineSpecification[0].start;
    const start = parseDate(startDate);
    const end = parseDate(endDate);

    const timelinePeriodPromises: Promise<TimelineInfoInterface>[] = [];
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
        !isAfter(parseDate(this.transactionPoints[j + 1].date), currentDate)
      ) {
        j++;
      }

      let periodEndDate = currentDate;
      if (timelineSpecification[i].accuracy === 'day') {
        let nextEndDate = end;
        if (j + 1 < this.transactionPoints.length) {
          nextEndDate = parseDate(this.transactionPoints[j + 1].date);
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

    const timelineInfoInterfaces: TimelineInfoInterface[] = await Promise.all(
      timelinePeriodPromises
    );
    const minNetPerformance = timelineInfoInterfaces
      .map((timelineInfo) => timelineInfo.minNetPerformance)
      .filter((performance) => performance !== null)
      .reduce((minPerformance, current) => {
        if (minPerformance.lt(current)) {
          return minPerformance;
        } else {
          return current;
        }
      });

    const maxNetPerformance = timelineInfoInterfaces
      .map((timelineInfo) => timelineInfo.maxNetPerformance)
      .filter((performance) => performance !== null)
      .reduce((maxPerformance, current) => {
        if (maxPerformance.gt(current)) {
          return maxPerformance;
        } else {
          return current;
        }
      });

    const timelinePeriods = timelineInfoInterfaces.map(
      (timelineInfo) => timelineInfo.timelinePeriods
    );

    return {
      maxNetPerformance,
      minNetPerformance,
      timelinePeriods: flatten(timelinePeriods)
    };
  }

  private calculateOverallPerformance(
    positions: TimelinePosition[],
    initialValues: { [p: string]: Big }
  ) {
    let hasErrors = false;
    let currentValue = new Big(0);
    let totalInvestment = new Big(0);
    let grossPerformance = new Big(0);
    let grossPerformancePercentage = new Big(0);
    let netPerformance = new Big(0);
    let netPerformancePercentage = new Big(0);
    let completeInitialValue = new Big(0);
    let netAnnualizedPerformance = new Big(0);

    // use Date.now() to use the mock for today
    const today = new Date(Date.now());

    for (const currentPosition of positions) {
      if (currentPosition.marketPrice) {
        currentValue = currentValue.add(
          new Big(currentPosition.marketPrice).mul(currentPosition.quantity)
        );
      } else {
        hasErrors = true;
      }
      totalInvestment = totalInvestment.add(currentPosition.investment);
      if (currentPosition.grossPerformance) {
        grossPerformance = grossPerformance.plus(
          currentPosition.grossPerformance
        );
        netPerformance = netPerformance.plus(currentPosition.netPerformance);
      } else if (!currentPosition.quantity.eq(0)) {
        hasErrors = true;
      }

      if (
        currentPosition.grossPerformancePercentage &&
        initialValues[currentPosition.symbol]
      ) {
        const currentInitialValue = initialValues[currentPosition.symbol];
        completeInitialValue = completeInitialValue.plus(currentInitialValue);
        grossPerformancePercentage = grossPerformancePercentage.plus(
          currentPosition.grossPerformancePercentage.mul(currentInitialValue)
        );
        netAnnualizedPerformance = netAnnualizedPerformance.plus(
          this.getAnnualizedPerformancePercent({
            daysInMarket: differenceInDays(
              today,
              parseDate(currentPosition.firstBuyDate)
            ),
            netPerformancePercent: currentPosition.netPerformancePercentage
          }).mul(currentInitialValue)
        );
        netPerformancePercentage = netPerformancePercentage.plus(
          currentPosition.netPerformancePercentage.mul(currentInitialValue)
        );
      } else if (!currentPosition.quantity.eq(0)) {
        Logger.error(
          `Missing initial value for symbol ${currentPosition.symbol} at ${currentPosition.firstBuyDate}`
        );
        hasErrors = true;
      }
    }

    if (!completeInitialValue.eq(0)) {
      grossPerformancePercentage =
        grossPerformancePercentage.div(completeInitialValue);
      netPerformancePercentage =
        netPerformancePercentage.div(completeInitialValue);
      netAnnualizedPerformance =
        netAnnualizedPerformance.div(completeInitialValue);
    }

    return {
      currentValue,
      grossPerformance,
      grossPerformancePercentage,
      hasErrors,
      netAnnualizedPerformance,
      netPerformance,
      netPerformancePercentage,
      totalInvestment
    };
  }

  private async getTimePeriodForDate(
    j: number,
    startDate: Date,
    endDate: Date
  ): Promise<TimelineInfoInterface> {
    let investment: Big = new Big(0);
    let fees: Big = new Big(0);

    const marketSymbolMap: {
      [date: string]: { [symbol: string]: Big };
    } = {};
    if (j >= 0) {
      const currencies: { [name: string]: string } = {};
      const dataGatheringItems: IDataGatheringItem[] = [];

      for (const item of this.transactionPoints[j].items) {
        currencies[item.symbol] = item.currency;
        dataGatheringItems.push({
          dataSource: item.dataSource,
          symbol: item.symbol
        });
        investment = investment.add(item.investment);
        fees = fees.add(item.fee);
      }

      let marketSymbols: GetValueObject[] = [];
      if (dataGatheringItems.length > 0) {
        try {
          marketSymbols = await this.currentRateService.getValues({
            currencies,
            dataGatheringItems,
            dateQuery: {
              gte: startDate,
              lt: endOfDay(endDate)
            },
            userCurrency: this.currency
          });
        } catch (error) {
          Logger.error(
            `Failed to fetch info for date ${startDate} with exception`,
            error
          );
          return null;
        }
      }

      for (const marketSymbol of marketSymbols) {
        const date = format(marketSymbol.date, DATE_FORMAT);
        if (!marketSymbolMap[date]) {
          marketSymbolMap[date] = {};
        }
        if (marketSymbol.marketPrice) {
          marketSymbolMap[date][marketSymbol.symbol] = new Big(
            marketSymbol.marketPrice
          );
        }
      }
    }

    const results: TimelinePeriod[] = [];
    let maxNetPerformance: Big = null;
    let minNetPerformance: Big = null;
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
        const grossPerformance = value.minus(investment);
        const netPerformance = grossPerformance.minus(fees);
        if (
          minNetPerformance === null ||
          minNetPerformance.gt(netPerformance)
        ) {
          minNetPerformance = netPerformance;
        }
        if (
          maxNetPerformance === null ||
          maxNetPerformance.lt(netPerformance)
        ) {
          maxNetPerformance = netPerformance;
        }

        const result = {
          grossPerformance,
          investment,
          netPerformance,
          value,
          date: currentDateAsString
        };
        results.push(result);
      }
    }

    return {
      maxNetPerformance,
      minNetPerformance,
      timelinePeriods: results
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

  private addToDate(date: Date, accuracy: Accuracy): Date {
    switch (accuracy) {
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
      !isBefore(currentDate, parseDate(timelineSpecification[i + 1].start))
    );
  }
}
