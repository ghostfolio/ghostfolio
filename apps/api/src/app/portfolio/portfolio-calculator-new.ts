import { TimelineInfoInterface } from '@ghostfolio/api/app/portfolio/interfaces/timeline-info.interface';
import { IDataGatheringItem } from '@ghostfolio/api/services/interfaces/interfaces';
import { DATE_FORMAT, parseDate, resetHours } from '@ghostfolio/common/helper';
import { TimelinePosition } from '@ghostfolio/common/interfaces';
import { Logger } from '@nestjs/common';
import { Type as TypeOfOrder } from '@prisma/client';
import Big from 'big.js';
import {
  addDays,
  addMilliseconds,
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
import { first, flatten, isNumber, sortBy } from 'lodash';

import { CurrentRateService } from './current-rate.service';
import { CurrentPositions } from './interfaces/current-positions.interface';
import { GetValueObject } from './interfaces/get-value-object.interface';
import { PortfolioOrderItem } from './interfaces/portfolio-calculator.interface';
import { PortfolioOrder } from './interfaces/portfolio-order.interface';
import { TimelinePeriod } from './interfaces/timeline-period.interface';
import {
  Accuracy,
  TimelineSpecification
} from './interfaces/timeline-specification.interface';
import { TransactionPointSymbol } from './interfaces/transaction-point-symbol.interface';
import { TransactionPoint } from './interfaces/transaction-point.interface';

export class PortfolioCalculatorNew {
  private currency: string;
  private currentRateService: CurrentRateService;
  private orders: PortfolioOrder[];
  private transactionPoints: TransactionPoint[];

  public constructor({
    currency,
    currentRateService,
    orders
  }: {
    currency: string;
    currentRateService: CurrentRateService;
    orders: PortfolioOrder[];
  }) {
    this.currency = currency;
    this.currentRateService = currentRateService;
    this.orders = orders;

    this.orders.sort((a, b) => a.date.localeCompare(b.date));
  }

  public computeTransactionPoints() {
    this.transactionPoints = [];
    const symbols: { [symbol: string]: TransactionPointSymbol } = {};

    let lastDate: string = null;
    let lastTransactionPoint: TransactionPoint = null;
    for (const order of this.orders) {
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
      return netPerformancePercent.mul(daysInMarket).div(365);
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

    const todayString = format(today, DATE_FORMAT);

    if (firstIndex > 0) {
      firstIndex--;
    }
    const initialValues: { [symbol: string]: Big } = {};

    const positions: TimelinePosition[] = [];
    let hasErrorsInSymbolMetrics = false;

    for (const item of lastTransactionPoint.items) {
      const marketValue = marketSymbolMap[todayString]?.[item.symbol];

      const {
        grossPerformance,
        grossPerformancePercentage,
        hasErrors,
        initialValue,
        netPerformance,
        netPerformancePercentage
      } = this.getSymbolMetrics({
        marketSymbolMap,
        start,
        symbol: item.symbol
      });

      hasErrorsInSymbolMetrics = hasErrorsInSymbolMetrics || hasErrors;

      initialValues[item.symbol] = initialValue;

      positions.push({
        averagePrice: item.quantity.eq(0)
          ? new Big(0)
          : item.investment.div(item.quantity),
        currency: item.currency,
        dataSource: item.dataSource,
        firstBuyDate: item.firstBuyDate,
        grossPerformance: !hasErrors ? grossPerformance ?? null : null,
        grossPerformancePercentage: !hasErrors
          ? grossPerformancePercentage ?? null
          : null,
        investment: item.investment,
        marketPrice: marketValue?.toNumber() ?? null,
        netPerformance: !hasErrors ? netPerformance ?? null : null,
        netPerformancePercentage: !hasErrors
          ? netPerformancePercentage ?? null
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
      hasErrors: hasErrorsInSymbolMetrics || overall.hasErrors
    };
  }

  public getSymbolMetrics({
    marketSymbolMap,
    start,
    symbol
  }: {
    marketSymbolMap: {
      [date: string]: { [symbol: string]: Big };
    };
    start: Date;
    symbol: string;
  }) {
    let orders: PortfolioOrderItem[] = this.orders.filter((order) => {
      return order.symbol === symbol;
    });

    if (orders.length <= 0) {
      return {
        hasErrors: false,
        initialValue: new Big(0),
        netPerformance: new Big(0),
        netPerformancePercentage: new Big(0),
        grossPerformance: new Big(0),
        grossPerformancePercentage: new Big(0)
      };
    }

    const dateOfFirstTransaction = new Date(first(orders).date);
    const endDate = new Date(Date.now());

    const unitPriceAtStartDate =
      marketSymbolMap[format(start, DATE_FORMAT)]?.[symbol];

    const unitPriceAtEndDate =
      marketSymbolMap[format(endDate, DATE_FORMAT)]?.[symbol];

    if (
      !unitPriceAtEndDate ||
      (!unitPriceAtStartDate && isBefore(dateOfFirstTransaction, start))
    ) {
      return {
        hasErrors: true,
        initialValue: new Big(0),
        netPerformance: new Big(0),
        netPerformancePercentage: new Big(0),
        grossPerformance: new Big(0),
        grossPerformancePercentage: new Big(0)
      };
    }

    let feesAtStartDate = new Big(0);
    let fees = new Big(0);
    let grossPerformance = new Big(0);
    let grossPerformanceAtStartDate = new Big(0);
    let grossPerformanceFromSells = new Big(0);
    let initialValue: Big;
    let lastAveragePrice = new Big(0);
    let lastValueOfInvestment = new Big(0);
    let lastNetValueOfInvestment = new Big(0);
    let timeWeightedGrossPerformancePercentage = new Big(1);
    let timeWeightedNetPerformancePercentage = new Big(1);
    let totalInvestment = new Big(0);
    let totalUnits = new Big(0);

    // Add a synthetic order at the start and the end date
    orders.push({
      symbol,
      currency: null,
      date: format(start, DATE_FORMAT),
      dataSource: null,
      fee: new Big(0),
      itemType: 'start',
      name: '',
      quantity: new Big(0),
      type: TypeOfOrder.BUY,
      unitPrice: unitPriceAtStartDate ?? new Big(0)
    });

    orders.push({
      symbol,
      currency: null,
      date: format(endDate, DATE_FORMAT),
      dataSource: null,
      fee: new Big(0),
      itemType: 'end',
      name: '',
      quantity: new Big(0),
      type: TypeOfOrder.BUY,
      unitPrice: unitPriceAtEndDate ?? new Big(0)
    });

    // Sort orders so that the start and end placeholder order are at the right
    // position
    orders = sortBy(orders, (order) => {
      let sortIndex = new Date(order.date);

      if (order.itemType === 'start') {
        sortIndex = addMilliseconds(sortIndex, -1);
      }

      if (order.itemType === 'end') {
        sortIndex = addMilliseconds(sortIndex, 1);
      }

      return sortIndex.getTime();
    });

    const indexOfStartOrder = orders.findIndex((order) => {
      return order.itemType === 'start';
    });

    for (let i = 0; i < orders.length; i += 1) {
      const order = orders[i];

      const transactionInvestment = order.quantity.mul(order.unitPrice);

      if (
        !initialValue &&
        order.itemType !== 'start' &&
        order.itemType !== 'end'
      ) {
        initialValue = transactionInvestment;
      }

      fees = fees.plus(order.fee);

      totalUnits = totalUnits.plus(
        order.quantity.mul(this.getFactor(order.type))
      );

      const valueOfInvestment = totalUnits.mul(order.unitPrice);
      const netValueOfInvestment = totalUnits.mul(order.unitPrice).sub(fees);

      const grossPerformanceFromSell =
        order.type === TypeOfOrder.SELL
          ? order.unitPrice.minus(lastAveragePrice).mul(order.quantity)
          : new Big(0);

      grossPerformanceFromSells = grossPerformanceFromSells.plus(
        grossPerformanceFromSell
      );

      totalInvestment = totalInvestment
        .plus(transactionInvestment.mul(this.getFactor(order.type)))
        .plus(grossPerformanceFromSell);

      lastAveragePrice = totalUnits.eq(0)
        ? new Big(0)
        : totalInvestment.div(totalUnits);

      const newGrossPerformance = valueOfInvestment
        .minus(totalInvestment)
        .plus(grossPerformanceFromSells);

      if (
        i > indexOfStartOrder &&
        !lastValueOfInvestment
          .plus(transactionInvestment.mul(this.getFactor(order.type)))
          .eq(0)
      ) {
        timeWeightedGrossPerformancePercentage =
          timeWeightedGrossPerformancePercentage.mul(
            new Big(1).plus(
              valueOfInvestment
                .minus(
                  lastValueOfInvestment.plus(
                    transactionInvestment.mul(this.getFactor(order.type))
                  )
                )
                .div(
                  lastValueOfInvestment.plus(
                    transactionInvestment.mul(this.getFactor(order.type))
                  )
                )
            )
          );

        timeWeightedNetPerformancePercentage =
          timeWeightedNetPerformancePercentage.mul(
            new Big(1).plus(
              netValueOfInvestment
                .minus(
                  lastNetValueOfInvestment.plus(
                    transactionInvestment.mul(this.getFactor(order.type))
                  )
                )
                .div(
                  lastNetValueOfInvestment.plus(
                    transactionInvestment.mul(this.getFactor(order.type))
                  )
                )
            )
          );
      }

      grossPerformance = newGrossPerformance;
      lastNetValueOfInvestment = netValueOfInvestment;
      lastValueOfInvestment = valueOfInvestment;

      if (order.itemType === 'start') {
        feesAtStartDate = fees;
        grossPerformanceAtStartDate = grossPerformance;
      }
    }

    timeWeightedGrossPerformancePercentage =
      timeWeightedGrossPerformancePercentage.sub(1);

    timeWeightedNetPerformancePercentage =
      timeWeightedNetPerformancePercentage.sub(1);

    const totalGrossPerformance = grossPerformance.minus(
      grossPerformanceAtStartDate
    );

    const totalNetPerformance = grossPerformance
      .minus(grossPerformanceAtStartDate)
      .minus(fees.minus(feesAtStartDate));

    return {
      initialValue,
      hasErrors: !initialValue || !unitPriceAtEndDate,
      netPerformance: totalNetPerformance,
      netPerformancePercentage: timeWeightedNetPerformancePercentage,
      grossPerformance: totalGrossPerformance,
      grossPerformancePercentage: timeWeightedGrossPerformancePercentage
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
        Logger.warn(
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

  private getFactor(type: TypeOfOrder) {
    let factor: number;

    switch (type) {
      case 'BUY':
        factor = 1;
        break;
      case 'SELL':
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
