import { TimelineInfoInterface } from '@ghostfolio/api/app/portfolio/interfaces/timeline-info.interface';
import { IDataGatheringItem } from '@ghostfolio/api/services/interfaces/interfaces';
import { DATE_FORMAT, parseDate, resetHours } from '@ghostfolio/common/helper';
import { ResponseError, TimelinePosition } from '@ghostfolio/common/interfaces';
import { GroupBy } from '@ghostfolio/common/types';
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
  isSameDay,
  isSameMonth,
  isSameYear,
  max,
  min,
  set
} from 'date-fns';
import { first, flatten, isNumber, last, sortBy } from 'lodash';

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

  public async getChartData(start: Date, end = new Date(Date.now()), step = 1) {
    const symbols: { [symbol: string]: boolean } = {};

    const transactionPointsBeforeEndDate =
      this.transactionPoints?.filter((transactionPoint) => {
        return isBefore(parseDate(transactionPoint.date), end);
      }) ?? [];

    const firstIndex = transactionPointsBeforeEndDate.length;
    const dates: Date[] = [];
    const dataGatheringItems: IDataGatheringItem[] = [];
    const currencies: { [symbol: string]: string } = {};

    let day = start;

    while (isBefore(day, end)) {
      dates.push(resetHours(day));
      day = addDays(day, step);
    }

    if (!isSameDay(last(dates), end)) {
      dates.push(resetHours(end));
    }

    for (const item of transactionPointsBeforeEndDate[firstIndex - 1].items) {
      dataGatheringItems.push({
        dataSource: item.dataSource,
        symbol: item.symbol
      });
      currencies[item.symbol] = item.currency;
      symbols[item.symbol] = true;
    }

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
      const dateString = format(marketSymbol.date, DATE_FORMAT);
      if (!marketSymbolMap[dateString]) {
        marketSymbolMap[dateString] = {};
      }
      if (marketSymbol.marketPriceInBaseCurrency) {
        marketSymbolMap[dateString][marketSymbol.symbol] = new Big(
          marketSymbol.marketPriceInBaseCurrency
        );
      }
    }

    const netPerformanceValuesBySymbol: {
      [symbol: string]: { [date: string]: Big };
    } = {};

    const investmentValuesBySymbol: {
      [symbol: string]: { [date: string]: Big };
    } = {};

    const maxInvestmentValuesBySymbol: {
      [symbol: string]: { [date: string]: Big };
    } = {};

    const totalNetPerformanceValues: { [date: string]: Big } = {};
    const totalInvestmentValues: { [date: string]: Big } = {};
    const maxTotalInvestmentValues: { [date: string]: Big } = {};

    for (const symbol of Object.keys(symbols)) {
      const { investmentValues, maxInvestmentValues, netPerformanceValues } =
        this.getSymbolMetrics({
          end,
          marketSymbolMap,
          start,
          step,
          symbol,
          isChartMode: true
        });

      netPerformanceValuesBySymbol[symbol] = netPerformanceValues;
      investmentValuesBySymbol[symbol] = investmentValues;
      maxInvestmentValuesBySymbol[symbol] = maxInvestmentValues;
    }

    for (const currentDate of dates) {
      const dateString = format(currentDate, DATE_FORMAT);

      for (const symbol of Object.keys(netPerformanceValuesBySymbol)) {
        totalNetPerformanceValues[dateString] =
          totalNetPerformanceValues[dateString] ?? new Big(0);

        if (netPerformanceValuesBySymbol[symbol]?.[dateString]) {
          totalNetPerformanceValues[dateString] = totalNetPerformanceValues[
            dateString
          ].add(netPerformanceValuesBySymbol[symbol][dateString]);
        }

        totalInvestmentValues[dateString] =
          totalInvestmentValues[dateString] ?? new Big(0);

        maxTotalInvestmentValues[dateString] =
          maxTotalInvestmentValues[dateString] ?? new Big(0);

        if (investmentValuesBySymbol[symbol]?.[dateString]) {
          totalInvestmentValues[dateString] = totalInvestmentValues[
            dateString
          ].add(investmentValuesBySymbol[symbol][dateString]);
        }

        if (maxInvestmentValuesBySymbol[symbol]?.[dateString]) {
          maxTotalInvestmentValues[dateString] = maxTotalInvestmentValues[
            dateString
          ].add(maxInvestmentValuesBySymbol[symbol][dateString]);
        }
      }
    }

    return Object.keys(totalNetPerformanceValues).map((date) => {
      const netPerformanceInPercentage = maxTotalInvestmentValues[date].eq(0)
        ? 0
        : totalNetPerformanceValues[date]
            .div(maxTotalInvestmentValues[date])
            .mul(100)
            .toNumber();

      return {
        date,
        netPerformanceInPercentage,
        netPerformance: totalNetPerformanceValues[date].toNumber(),
        totalInvestment: totalInvestmentValues[date].toNumber(),
        value: totalInvestmentValues[date]
          .plus(totalNetPerformanceValues[date])
          .toNumber()
      };
    });
  }

  public async getCurrentPositions(
    start: Date,
    end = new Date(Date.now())
  ): Promise<CurrentPositions> {
    const transactionPointsBeforeEndDate =
      this.transactionPoints?.filter((transactionPoint) => {
        return isBefore(parseDate(transactionPoint.date), end);
      }) ?? [];

    if (!transactionPointsBeforeEndDate.length) {
      return {
        currentValue: new Big(0),
        grossPerformance: new Big(0),
        grossPerformancePercentage: new Big(0),
        hasErrors: false,
        netPerformance: new Big(0),
        netPerformancePercentage: new Big(0),
        positions: [],
        totalInvestment: new Big(0)
      };
    }

    const lastTransactionPoint =
      transactionPointsBeforeEndDate[transactionPointsBeforeEndDate.length - 1];

    let firstTransactionPoint: TransactionPoint = null;
    let firstIndex = transactionPointsBeforeEndDate.length;
    const dates = [];
    const dataGatheringItems: IDataGatheringItem[] = [];
    const currencies: { [symbol: string]: string } = {};

    dates.push(resetHours(start));
    for (const item of transactionPointsBeforeEndDate[firstIndex - 1].items) {
      dataGatheringItems.push({
        dataSource: item.dataSource,
        symbol: item.symbol
      });
      currencies[item.symbol] = item.currency;
    }
    for (let i = 0; i < transactionPointsBeforeEndDate.length; i++) {
      if (
        !isBefore(parseDate(transactionPointsBeforeEndDate[i].date), start) &&
        firstTransactionPoint === null
      ) {
        firstTransactionPoint = transactionPointsBeforeEndDate[i];
        firstIndex = i;
      }
      if (firstTransactionPoint !== null) {
        dates.push(
          resetHours(parseDate(transactionPointsBeforeEndDate[i].date))
        );
      }
    }

    dates.push(resetHours(end));

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

    const endDateString = format(end, DATE_FORMAT);

    if (firstIndex > 0) {
      firstIndex--;
    }
    const initialValues: { [symbol: string]: Big } = {};

    const positions: TimelinePosition[] = [];
    let hasAnySymbolMetricsErrors = false;

    const errors: ResponseError['errors'] = [];

    for (const item of lastTransactionPoint.items) {
      const marketValue = marketSymbolMap[endDateString]?.[item.symbol];

      const {
        grossPerformance,
        grossPerformancePercentage,
        hasErrors,
        initialValue,
        netPerformance,
        netPerformancePercentage
      } = this.getSymbolMetrics({
        end,
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
        fee: item.fee,
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

      if (hasErrors && item.investment.gt(0)) {
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

  public getInvestmentsByGroup(
    groupBy: GroupBy
  ): { date: string; investment: Big }[] {
    if (this.orders.length === 0) {
      return [];
    }

    const investments = [];
    let currentDate: Date;
    let investmentByGroup = new Big(0);

    for (const [index, order] of this.orders.entries()) {
      if (
        isSameYear(parseDate(order.date), currentDate) &&
        (groupBy === 'year' || isSameMonth(parseDate(order.date), currentDate))
      ) {
        // Same group: Add up investments

        investmentByGroup = investmentByGroup.plus(
          order.quantity.mul(order.unitPrice).mul(this.getFactor(order.type))
        );
      } else {
        // New group: Store previous group and reset

        if (currentDate) {
          investments.push({
            date: format(
              set(currentDate, {
                date: 1,
                month: groupBy === 'year' ? 0 : currentDate.getMonth()
              }),
              DATE_FORMAT
            ),
            investment: investmentByGroup
          });
        }

        currentDate = parseDate(order.date);
        investmentByGroup = order.quantity
          .mul(order.unitPrice)
          .mul(this.getFactor(order.type));
      }

      if (index === this.orders.length - 1) {
        // Store current group (latest order)
        investments.push({
          date: format(
            set(currentDate, {
              date: 1,
              month: groupBy === 'year' ? 0 : currentDate.getMonth()
            }),
            DATE_FORMAT
          ),
          investment: investmentByGroup
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

    let minNetPerformance = new Big(0);
    let maxNetPerformance = new Big(0);

    const timelineInfoInterfaces: TimelineInfoInterface[] = await Promise.all(
      timelinePeriodPromises
    );

    try {
      minNetPerformance = timelineInfoInterfaces
        .map((timelineInfo) => timelineInfo.minNetPerformance)
        .filter((performance) => performance !== null)
        .reduce((minPerformance, current) => {
          if (minPerformance.lt(current)) {
            return minPerformance;
          } else {
            return current;
          }
        });

      maxNetPerformance = timelineInfoInterfaces
        .map((timelineInfo) => timelineInfo.maxNetPerformance)
        .filter((performance) => performance !== null)
        .reduce((maxPerformance, current) => {
          if (maxPerformance.gt(current)) {
            return maxPerformance;
          } else {
            return current;
          }
        });
    } catch {}

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
    end,
    isChartMode = false,
    marketSymbolMap,
    start,
    step = 1,
    symbol
  }: {
    end: Date;
    isChartMode?: boolean;
    marketSymbolMap: {
      [date: string]: { [symbol: string]: Big };
    };
    start: Date;
    step?: number;
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

    const unitPriceAtStartDate =
      marketSymbolMap[format(start, DATE_FORMAT)]?.[symbol];

    const unitPriceAtEndDate =
      marketSymbolMap[format(end, DATE_FORMAT)]?.[symbol];

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
    const investmentValues: { [date: string]: Big } = {};
    const maxInvestmentValues: { [date: string]: Big } = {};
    let lastAveragePrice = new Big(0);
    let maxTotalInvestment = new Big(0);
    const netPerformanceValues: { [date: string]: Big } = {};
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
      date: format(end, DATE_FORMAT),
      dataSource: null,
      fee: new Big(0),
      itemType: 'end',
      name: '',
      quantity: new Big(0),
      type: TypeOfOrder.BUY,
      unitPrice: unitPriceAtEndDate
    });

    let day = start;
    let lastUnitPrice: Big;

    if (isChartMode) {
      const datesWithOrders = {};

      for (const order of orders) {
        datesWithOrders[order.date] = true;
      }

      while (isBefore(day, end)) {
        const hasDate = datesWithOrders[format(day, DATE_FORMAT)];

        if (!hasDate) {
          orders.push({
            symbol,
            currency: null,
            date: format(day, DATE_FORMAT),
            dataSource: null,
            fee: new Big(0),
            name: '',
            quantity: new Big(0),
            type: TypeOfOrder.BUY,
            unitPrice:
              marketSymbolMap[format(day, DATE_FORMAT)]?.[symbol] ??
              lastUnitPrice
          });
        }

        lastUnitPrice = last(orders).unitPrice;

        day = addDays(day, step);
      }
    }

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

      if (PortfolioCalculator.ENABLE_LOGGING) {
        console.log();
        console.log();
        console.log(i + 1, order.type, order.itemType);
      }

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

      const transactionInvestment =
        order.type === 'BUY'
          ? order.quantity.mul(order.unitPrice).mul(this.getFactor(order.type))
          : totalUnits.gt(0)
          ? totalInvestment
              .div(totalUnits)
              .mul(order.quantity)
              .mul(this.getFactor(order.type))
          : new Big(0);

      if (PortfolioCalculator.ENABLE_LOGGING) {
        console.log('totalInvestment', totalInvestment.toNumber());
        console.log('order.quantity', order.quantity.toNumber());
        console.log('transactionInvestment', transactionInvestment.toNumber());
      }

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

      if (PortfolioCalculator.ENABLE_LOGGING) {
        console.log(
          'totalInvestmentWithGrossPerformanceFromSell',
          totalInvestmentWithGrossPerformanceFromSell.toNumber()
        );
        console.log(
          'grossPerformanceFromSells',
          grossPerformanceFromSells.toNumber()
        );
      }

      const newGrossPerformance = valueOfInvestment
        .minus(totalInvestment)
        .plus(grossPerformanceFromSells);

      grossPerformance = newGrossPerformance;

      if (order.itemType === 'start') {
        feesAtStartDate = fees;
        grossPerformanceAtStartDate = grossPerformance;
      }

      if (isChartMode && i > indexOfStartOrder) {
        netPerformanceValues[order.date] = grossPerformance
          .minus(grossPerformanceAtStartDate)
          .minus(fees.minus(feesAtStartDate));

        investmentValues[order.date] = totalInvestment;
        maxInvestmentValues[order.date] = maxTotalInvestment;
      }

      if (PortfolioCalculator.ENABLE_LOGGING) {
        console.log('totalInvestment', totalInvestment.toNumber());
        console.log(
          'totalGrossPerformance',
          grossPerformance.minus(grossPerformanceAtStartDate).toNumber()
        );
      }

      if (i === indexOfEndOrder) {
        break;
      }
    }

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
        Total investment: ${totalInvestment.toFixed(2)}
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
      investmentValues,
      maxInvestmentValues,
      netPerformancePercentage,
      netPerformanceValues,
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
