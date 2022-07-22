import { TimelineInfoInterface } from '@ghostfolio/api/app/portfolio/interfaces/timeline-info.interface';
import { IDataGatheringItem } from '@ghostfolio/api/services/interfaces/interfaces';
import { DATE_FORMAT, parseDate, resetHours } from '@ghostfolio/common/helper';
import { ResponseError, TimelinePosition } from '@ghostfolio/common/interfaces';
import { Logger } from '@nestjs/common';
import { Type as TypeOfOrder } from '@prisma/client';
import Big from 'big.js';
import {
  addDays,
  addMilliseconds,
  addMonths,
  addYears,
  endOfDay,
  format,
  isAfter,
  isBefore,
  isSameMonth,
  isSameYear,
  max,
  min,
  set
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

export class PortfolioCalculator {
  private static readonly CALCULATE_PERCENTAGE_PERFORMANCE_WITH_MAX_INVESTMENT =
    true;

  private static readonly ENABLE_LOGGING = false;

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

    this.orders.sort((a, b) => a.date?.localeCompare(b.date));
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

        let investment = new Big(0);

        if (newQuantity.gt(0)) {
          if (order.type === 'BUY') {
            investment = oldAccumulatedSymbol.investment.plus(
              order.quantity.mul(unitPrice)
            );
          } else if (order.type === 'SELL') {
            const averagePrice = oldAccumulatedSymbol.investment.div(
              oldAccumulatedSymbol.quantity
            );
            investment = oldAccumulatedSymbol.investment.minus(
              order.quantity.mul(averagePrice)
            );
          }
        }

        currentTransactionPointItem = {
          investment,
          currency: order.currency,
          dataSource: order.dataSource,
          fee: order.fee.plus(oldAccumulatedSymbol.fee),
          firstBuyDate: oldAccumulatedSymbol.firstBuyDate,
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
      newItems.sort((a, b) => a.symbol?.localeCompare(b.symbol));
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
      if (marketSymbol.marketPriceInBaseCurrency) {
        marketSymbolMap[date][marketSymbol.symbol] = new Big(
          marketSymbol.marketPriceInBaseCurrency
        );
      }
    }

    const todayString = format(today, DATE_FORMAT);

    if (firstIndex > 0) {
      firstIndex--;
    }
    const initialValues: { [symbol: string]: Big } = {};

    const positions: TimelinePosition[] = [];
    let hasAnySymbolMetricsErrors = false;

    const errors: ResponseError['errors'] = [];

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

      hasAnySymbolMetricsErrors = hasAnySymbolMetricsErrors || hasErrors;
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

      if (hasErrors) {
        errors.push({ dataSource: item.dataSource, symbol: item.symbol });
      }
    }

    const overall = this.calculateOverallPerformance(positions, initialValues);

    return {
      ...overall,
      errors,
      positions,
      hasErrors: hasAnySymbolMetricsErrors || overall.hasErrors
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
            investment.plus(transactionPointSymbol.investment),
          new Big(0)
        )
      };
    });
  }

  public getInvestmentsByMonth(): { date: string; investment: Big }[] {
    if (this.orders.length === 0) {
      return [];
    }

    const investments = [];
    let currentDate: Date;
    let investmentByMonth = new Big(0);

    for (const [index, order] of this.orders.entries()) {
      if (
        isSameMonth(parseDate(order.date), currentDate) &&
        isSameYear(parseDate(order.date), currentDate)
      ) {
        // Same month: Add up investments

        investmentByMonth = investmentByMonth.plus(
          order.quantity.mul(order.unitPrice).mul(this.getFactor(order.type))
        );
      } else {
        // New month: Store previous month and reset

        if (currentDate) {
          investments.push({
            date: format(set(currentDate, { date: 1 }), DATE_FORMAT),
            investment: investmentByMonth
          });
        }

        currentDate = parseDate(order.date);
        investmentByMonth = order.quantity
          .mul(order.unitPrice)
          .mul(this.getFactor(order.type));
      }

      if (index === this.orders.length - 1) {
        // Store current month (latest order)
        investments.push({
          date: format(set(currentDate, { date: 1 }), DATE_FORMAT),
          investment: investmentByMonth
        });
      }
    }

    return investments;
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
    initialValues: { [symbol: string]: Big }
  ) {
    let currentValue = new Big(0);
    let grossPerformance = new Big(0);
    let grossPerformancePercentage = new Big(0);
    let hasErrors = false;
    let netPerformance = new Big(0);
    let netPerformancePercentage = new Big(0);
    let sumOfWeights = new Big(0);
    let totalInvestment = new Big(0);

    for (const currentPosition of positions) {
      if (currentPosition.marketPrice) {
        currentValue = currentValue.plus(
          new Big(currentPosition.marketPrice).mul(currentPosition.quantity)
        );
      } else {
        hasErrors = true;
      }

      totalInvestment = totalInvestment.plus(currentPosition.investment);

      if (currentPosition.grossPerformance) {
        grossPerformance = grossPerformance.plus(
          currentPosition.grossPerformance
        );

        netPerformance = netPerformance.plus(currentPosition.netPerformance);
      } else if (!currentPosition.quantity.eq(0)) {
        hasErrors = true;
      }

      if (currentPosition.grossPerformancePercentage) {
        // Use the average from the initial value and the current investment as
        // a weight
        const weight = (initialValues[currentPosition.symbol] ?? new Big(0))
          .plus(currentPosition.investment)
          .div(2);

        sumOfWeights = sumOfWeights.plus(weight);

        grossPerformancePercentage = grossPerformancePercentage.plus(
          currentPosition.grossPerformancePercentage.mul(weight)
        );

        netPerformancePercentage = netPerformancePercentage.plus(
          currentPosition.netPerformancePercentage.mul(weight)
        );
      } else if (!currentPosition.quantity.eq(0)) {
        Logger.warn(
          `Missing initial value for symbol ${currentPosition.symbol} at ${currentPosition.firstBuyDate}`,
          'PortfolioCalculator'
        );
        hasErrors = true;
      }
    }

    if (sumOfWeights.gt(0)) {
      grossPerformancePercentage = grossPerformancePercentage.div(sumOfWeights);
      netPerformancePercentage = netPerformancePercentage.div(sumOfWeights);
    } else {
      grossPerformancePercentage = new Big(0);
      netPerformancePercentage = new Big(0);
    }

    return {
      currentValue,
      grossPerformance,
      grossPerformancePercentage,
      hasErrors,
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
        investment = investment.plus(item.investment);
        fees = fees.plus(item.fee);
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
            error,
            'PortfolioCalculator'
          );
          return null;
        }
      }

      for (const marketSymbol of marketSymbols) {
        const date = format(marketSymbol.date, DATE_FORMAT);
        if (!marketSymbolMap[date]) {
          marketSymbolMap[date] = {};
        }
        if (marketSymbol.marketPriceInBaseCurrency) {
          marketSymbolMap[date][marketSymbol.symbol] = new Big(
            marketSymbol.marketPriceInBaseCurrency
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
          value = value.plus(
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

  private getSymbolMetrics({
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

    let averagePriceAtEndDate = new Big(0);
    let averagePriceAtStartDate = new Big(0);
    let feesAtStartDate = new Big(0);
    let fees = new Big(0);
    let grossPerformance = new Big(0);
    let grossPerformanceAtStartDate = new Big(0);
    let grossPerformanceFromSells = new Big(0);
    let initialValue: Big;
    let investmentAtStartDate: Big;
    let lastAveragePrice = new Big(0);
    let lastTransactionInvestment = new Big(0);
    let lastValueOfInvestmentBeforeTransaction = new Big(0);
    let maxTotalInvestment = new Big(0);
    let timeWeightedGrossPerformancePercentage = new Big(1);
    let timeWeightedNetPerformancePercentage = new Big(1);
    let totalInvestment = new Big(0);
    let totalInvestmentWithGrossPerformanceFromSell = new Big(0);
    let totalUnits = new Big(0);
    let valueAtStartDate: Big;

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
      unitPrice: unitPriceAtStartDate
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
      unitPrice: unitPriceAtEndDate
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

    const indexOfEndOrder = orders.findIndex((order) => {
      return order.itemType === 'end';
    });

    for (let i = 0; i < orders.length; i += 1) {
      const order = orders[i];

      if (order.itemType === 'start') {
        // Take the unit price of the order as the market price if there are no
        // orders of this symbol before the start date
        order.unitPrice =
          indexOfStartOrder === 0
            ? orders[i + 1]?.unitPrice
            : unitPriceAtStartDate;
      }

      // Calculate the average start price as soon as any units are held
      if (
        averagePriceAtStartDate.eq(0) &&
        i >= indexOfStartOrder &&
        totalUnits.gt(0)
      ) {
        averagePriceAtStartDate = totalInvestment.div(totalUnits);
      }

      const valueOfInvestmentBeforeTransaction = totalUnits.mul(
        order.unitPrice
      );

      if (!investmentAtStartDate && i >= indexOfStartOrder) {
        investmentAtStartDate = totalInvestment ?? new Big(0);
        valueAtStartDate = valueOfInvestmentBeforeTransaction;
      }

      const transactionInvestment = order.quantity
        .mul(order.unitPrice)
        .mul(this.getFactor(order.type));

      totalInvestment = totalInvestment.plus(transactionInvestment);

      if (i >= indexOfStartOrder && totalInvestment.gt(maxTotalInvestment)) {
        maxTotalInvestment = totalInvestment;
      }

      if (i === indexOfEndOrder && totalUnits.gt(0)) {
        averagePriceAtEndDate = totalInvestment.div(totalUnits);
      }

      if (i >= indexOfStartOrder && !initialValue) {
        if (
          i === indexOfStartOrder &&
          !valueOfInvestmentBeforeTransaction.eq(0)
        ) {
          initialValue = valueOfInvestmentBeforeTransaction;
        } else if (transactionInvestment.gt(0)) {
          initialValue = transactionInvestment;
        }
      }

      fees = fees.plus(order.fee);

      totalUnits = totalUnits.plus(
        order.quantity.mul(this.getFactor(order.type))
      );

      const valueOfInvestment = totalUnits.mul(order.unitPrice);

      const grossPerformanceFromSell =
        order.type === TypeOfOrder.SELL
          ? order.unitPrice.minus(lastAveragePrice).mul(order.quantity)
          : new Big(0);

      grossPerformanceFromSells = grossPerformanceFromSells.plus(
        grossPerformanceFromSell
      );

      totalInvestmentWithGrossPerformanceFromSell =
        totalInvestmentWithGrossPerformanceFromSell
          .plus(transactionInvestment)
          .plus(grossPerformanceFromSell);

      lastAveragePrice = totalUnits.eq(0)
        ? new Big(0)
        : totalInvestmentWithGrossPerformanceFromSell.div(totalUnits);

      const newGrossPerformance = valueOfInvestment
        .minus(totalInvestmentWithGrossPerformanceFromSell)
        .plus(grossPerformanceFromSells);

      if (
        i > indexOfStartOrder &&
        !lastValueOfInvestmentBeforeTransaction
          .plus(lastTransactionInvestment)
          .eq(0)
      ) {
        const grossHoldingPeriodReturn = valueOfInvestmentBeforeTransaction
          .minus(
            lastValueOfInvestmentBeforeTransaction.plus(
              lastTransactionInvestment
            )
          )
          .div(
            lastValueOfInvestmentBeforeTransaction.plus(
              lastTransactionInvestment
            )
          );

        timeWeightedGrossPerformancePercentage =
          timeWeightedGrossPerformancePercentage.mul(
            new Big(1).plus(grossHoldingPeriodReturn)
          );

        const netHoldingPeriodReturn = valueOfInvestmentBeforeTransaction
          .minus(fees.minus(feesAtStartDate))
          .minus(
            lastValueOfInvestmentBeforeTransaction.plus(
              lastTransactionInvestment
            )
          )
          .div(
            lastValueOfInvestmentBeforeTransaction.plus(
              lastTransactionInvestment
            )
          );

        timeWeightedNetPerformancePercentage =
          timeWeightedNetPerformancePercentage.mul(
            new Big(1).plus(netHoldingPeriodReturn)
          );
      }

      grossPerformance = newGrossPerformance;

      lastTransactionInvestment = transactionInvestment;

      lastValueOfInvestmentBeforeTransaction =
        valueOfInvestmentBeforeTransaction;

      if (order.itemType === 'start') {
        feesAtStartDate = fees;
        grossPerformanceAtStartDate = grossPerformance;
      }
    }

    timeWeightedGrossPerformancePercentage =
      timeWeightedGrossPerformancePercentage.minus(1);

    timeWeightedNetPerformancePercentage =
      timeWeightedNetPerformancePercentage.minus(1);

    const totalGrossPerformance = grossPerformance.minus(
      grossPerformanceAtStartDate
    );

    const totalNetPerformance = grossPerformance
      .minus(grossPerformanceAtStartDate)
      .minus(fees.minus(feesAtStartDate));

    const maxInvestmentBetweenStartAndEndDate = valueAtStartDate.plus(
      maxTotalInvestment.minus(investmentAtStartDate)
    );

    const grossPerformancePercentage =
      PortfolioCalculator.CALCULATE_PERCENTAGE_PERFORMANCE_WITH_MAX_INVESTMENT ||
      averagePriceAtStartDate.eq(0) ||
      averagePriceAtEndDate.eq(0) ||
      orders[indexOfStartOrder].unitPrice.eq(0)
        ? maxInvestmentBetweenStartAndEndDate.gt(0)
          ? totalGrossPerformance.div(maxInvestmentBetweenStartAndEndDate)
          : new Big(0)
        : // This formula has the issue that buying more units with a price
          // lower than the average buying price results in a positive
          // performance even if the market price stays constant
          unitPriceAtEndDate
            .div(averagePriceAtEndDate)
            .div(
              orders[indexOfStartOrder].unitPrice.div(averagePriceAtStartDate)
            )
            .minus(1);

    const feesPerUnit = totalUnits.gt(0)
      ? fees.minus(feesAtStartDate).div(totalUnits)
      : new Big(0);

    const netPerformancePercentage =
      PortfolioCalculator.CALCULATE_PERCENTAGE_PERFORMANCE_WITH_MAX_INVESTMENT ||
      averagePriceAtStartDate.eq(0) ||
      averagePriceAtEndDate.eq(0) ||
      orders[indexOfStartOrder].unitPrice.eq(0)
        ? maxInvestmentBetweenStartAndEndDate.gt(0)
          ? totalNetPerformance.div(maxInvestmentBetweenStartAndEndDate)
          : new Big(0)
        : // This formula has the issue that buying more units with a price
          // lower than the average buying price results in a positive
          // performance even if the market price stays constant
          unitPriceAtEndDate
            .minus(feesPerUnit)
            .div(averagePriceAtEndDate)
            .div(
              orders[indexOfStartOrder].unitPrice.div(averagePriceAtStartDate)
            )
            .minus(1);

    if (PortfolioCalculator.ENABLE_LOGGING) {
      console.log(
        `
        ${symbol}
        Unit price: ${orders[indexOfStartOrder].unitPrice.toFixed(
          2
        )} -> ${unitPriceAtEndDate.toFixed(2)}
        Average price: ${averagePriceAtStartDate.toFixed(
          2
        )} -> ${averagePriceAtEndDate.toFixed(2)}
        Max. total investment: ${maxTotalInvestment.toFixed(2)}
        Gross performance: ${totalGrossPerformance.toFixed(
          2
        )} / ${grossPerformancePercentage.mul(100).toFixed(2)}%
        Fees per unit: ${feesPerUnit.toFixed(2)}
        Net performance: ${totalNetPerformance.toFixed(
          2
        )} / ${netPerformancePercentage.mul(100).toFixed(2)}%`
      );
    }

    return {
      initialValue,
      grossPerformancePercentage,
      netPerformancePercentage,
      hasErrors: totalUnits.gt(0) && (!initialValue || !unitPriceAtEndDate),
      netPerformance: totalNetPerformance,
      grossPerformance: totalGrossPerformance
    };
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
