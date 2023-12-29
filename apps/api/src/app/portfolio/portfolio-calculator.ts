import { TimelineInfoInterface } from '@ghostfolio/api/app/portfolio/interfaces/timeline-info.interface';
import { IDataGatheringItem } from '@ghostfolio/api/services/interfaces/interfaces';
import { DATE_FORMAT, parseDate, resetHours } from '@ghostfolio/common/helper';
import {
  DataProviderInfo,
  HistoricalDataItem,
  ResponseError,
  TimelinePosition
} from '@ghostfolio/common/interfaces';
import { GroupBy } from '@ghostfolio/common/types';
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
  isSameDay,
  isSameMonth,
  isSameYear,
  max,
  min,
  set,
  subDays
} from 'date-fns';
import { first, flatten, isNumber, last, sortBy, uniq } from 'lodash';

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
  private static readonly CALCULATE_PERCENTAGE_PERFORMANCE_WITH_TIME_WEIGHTED_INVESTMENT =
    true;

  private static readonly ENABLE_LOGGING = false;

  private currency: string;
  private currentRateService: CurrentRateService;
  private dataProviderInfos: DataProviderInfo[];
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
      currentTransactionPointItem = this.getCurrentTransactionPointItem(
        oldAccumulatedSymbol,
        order,
        factor,
        unitPrice,
        currentTransactionPointItem
      );

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

  private getCurrentTransactionPointItem(
    oldAccumulatedSymbol: TransactionPointSymbol,
    order: PortfolioOrder,
    factor: number,
    unitPrice: Big,
    currentTransactionPointItem: TransactionPointSymbol
  ) {
    if (oldAccumulatedSymbol) {
      currentTransactionPointItem = this.handleSubsequentTransactions(
        order,
        factor,
        oldAccumulatedSymbol,
        unitPrice,
        currentTransactionPointItem
      );
    } else {
      currentTransactionPointItem = {
        currency: order.currency,
        dataSource: order.dataSource,
        fee: order.fee,
        firstBuyDate: order.date,
        investment: unitPrice.mul(order.quantity).mul(factor),
        quantity: order.quantity.mul(factor),
        symbol: order.symbol,
        tags: order.tags,
        transactionCount: 1
      };
    }
    return currentTransactionPointItem;
  }

  private handleSubsequentTransactions(
    order: PortfolioOrder,
    factor: number,
    oldAccumulatedSymbol: TransactionPointSymbol,
    unitPrice: Big,
    currentTransactionPointItem: TransactionPointSymbol
  ) {
    const newQuantity = order.quantity
      .mul(factor)
      .plus(oldAccumulatedSymbol.quantity);

    let investment = new Big(0);

    if (newQuantity.gt(0)) {
      if (order.type === 'BUY' || order.type === 'STAKE') {
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
      tags: order.tags,
      transactionCount: oldAccumulatedSymbol.transactionCount + 1
    };
    return currentTransactionPointItem;
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

  public async getChartData(
    start: Date,
    end = new Date(Date.now()),
    step = 1,
    calculateTimeWeightedPerformance = false
  ) {
    const symbols: { [symbol: string]: boolean } = {};

    const transactionPointsBeforeEndDate =
      this.transactionPoints?.filter((transactionPoint) => {
        return isBefore(parseDate(transactionPoint.date), end);
      }) ?? [];

    const currencies: { [symbol: string]: string } = {};
    const dates: Date[] = [];
    const dataGatheringItems: IDataGatheringItem[] = [];
    const firstIndex = transactionPointsBeforeEndDate.length;

    this.pushDataGatheringsSymbols(
      transactionPointsBeforeEndDate,
      firstIndex,
      dataGatheringItems,
      currencies,
      symbols
    );
    this.getRelevantStartAndEndDates(start, end, dates, step);
    const dataGartheringDates = [
      ...dates,
      ...this.orders
        .filter((o) => {
          let dateParsed = Date.parse(o.date);
          return isBefore(dateParsed, end) && isAfter(dateParsed, start);
        })
        .map((o) => {
          let dateParsed = Date.parse(o.date);
          return new Date(dateParsed);
        })
    ];

    const { dataProviderInfos, values: marketSymbols } =
      await this.getInformationFromCurrentRateService(
        currencies,
        dataGatheringItems,
        dataGartheringDates
      );

    this.dataProviderInfos = dataProviderInfos;

    const marketSymbolMap: {
      [date: string]: { [symbol: string]: Big };
    } = {};

    this.populateMarketSymbolMap(marketSymbols, marketSymbolMap);

    const valuesBySymbol: {
      [symbol: string]: {
        currentValues: { [date: string]: Big };
        investmentValues: { [date: string]: Big };
        maxInvestmentValues: { [date: string]: Big };
        netPerformanceValues: { [date: string]: Big };
        netPerformanceValuesPercentage: { [date: string]: Big };
      };
    } = {};

    this.populateSymbolMetrics(
      symbols,
      end,
      marketSymbolMap,
      start,
      step,
      valuesBySymbol
    );

    let valuesBySymbolShortend: {
      [symbol: string]: {
        currentValues: { [date: string]: Big };
        investmentValues: { [date: string]: Big };
        maxInvestmentValues: { [date: string]: Big };
        netPerformanceValues: { [date: string]: Big };
        netPerformanceValuesPercentage: { [date: string]: Big };
      };
    } = {};
    Object.keys(valuesBySymbol).forEach((k) => {
      if (valuesBySymbol[k].currentValues) {
        Object.assign(valuesBySymbolShortend, { [k]: valuesBySymbol[k] });
      }
    });
    return dates.map((date: Date, index: number, dates: Date[]) => {
      let previousDate: Date = index > 0 ? dates[index - 1] : null;
      return this.calculatePerformance(
        date,
        previousDate,
        valuesBySymbolShortend,
        calculateTimeWeightedPerformance
      );
    });
  }

  private calculatePerformance(
    date: Date,
    previousDate: Date,
    valuesBySymbol: {
      [symbol: string]: {
        currentValues: { [date: string]: Big };
        investmentValues: { [date: string]: Big };
        maxInvestmentValues: { [date: string]: Big };
        netPerformanceValues: { [date: string]: Big };
        netPerformanceValuesPercentage: { [date: string]: Big };
      };
    },
    calculateTimeWeightedPerformance: boolean
  ) {
    const dateString = format(date, DATE_FORMAT);
    const previousDateString = previousDate
      ? format(previousDate, DATE_FORMAT)
      : null;
    let totalCurrentValue = new Big(0);
    let totalInvestmentValue = new Big(0);
    let maxTotalInvestmentValue = new Big(0);
    let totalNetPerformanceValue = new Big(0);
    let previousTotalInvestmentValue = new Big(0);
    let timeWeightedPerformance = new Big(0);

    if (calculateTimeWeightedPerformance && previousDateString) {
      for (const symbol of Object.keys(valuesBySymbol)) {
        const symbolValues = valuesBySymbol[symbol];
        previousTotalInvestmentValue = previousTotalInvestmentValue.plus(
          symbolValues.currentValues?.[previousDateString] ?? new Big(0)
        );
      }
    }

    for (const symbol of Object.keys(valuesBySymbol)) {
      const symbolValues = valuesBySymbol[symbol];
      const symbolCurrentValues =
        symbolValues.currentValues?.[dateString] ?? new Big(0);

      totalCurrentValue = totalCurrentValue.plus(symbolCurrentValues);
      totalInvestmentValue = totalInvestmentValue.plus(
        symbolValues.investmentValues?.[dateString] ?? new Big(0)
      );
      maxTotalInvestmentValue = maxTotalInvestmentValue.plus(
        symbolValues.maxInvestmentValues?.[dateString] ?? new Big(0)
      );
      totalNetPerformanceValue = totalNetPerformanceValue.plus(
        symbolValues.netPerformanceValues?.[dateString] ?? new Big(0)
      );

      if (
        previousTotalInvestmentValue.toNumber() &&
        symbolValues.netPerformanceValuesPercentage &&
        (
          symbolValues.currentValues?.[previousDateString] ?? new Big(0)
        ).toNumber()
      ) {
        const previousValue =
          symbolValues.currentValues?.[previousDateString] ?? new Big(0);
        const netPerformance =
          symbolValues.netPerformanceValuesPercentage?.[dateString] ??
          new Big(0);
        const timeWeightedPerformanceContribution = previousValue
          .div(previousTotalInvestmentValue)
          .mul(netPerformance)
          .mul(100);
        timeWeightedPerformance = timeWeightedPerformance.plus(
          timeWeightedPerformanceContribution
        );
      }
    }
    const netPerformanceInPercentage = maxTotalInvestmentValue.eq(0)
      ? 0
      : totalNetPerformanceValue
          .div(maxTotalInvestmentValue)
          .mul(100)
          .toNumber();

    return {
      date: dateString,
      netPerformanceInPercentage,
      netPerformance: totalNetPerformanceValue.toNumber(),
      totalInvestment: totalInvestmentValue.toNumber(),
      value: totalCurrentValue.toNumber(),
      timeWeightedPerformance: timeWeightedPerformance.toNumber()
    };
  }

  private populateSymbolMetrics(
    symbols: { [symbol: string]: boolean },
    end: Date,
    marketSymbolMap: { [date: string]: { [symbol: string]: Big } },
    start: Date,
    step: number,
    valuesBySymbol: {
      [symbol: string]: {
        currentValues: { [date: string]: Big };
        investmentValues: { [date: string]: Big };
        maxInvestmentValues: { [date: string]: Big };
        netPerformanceValues: { [date: string]: Big };
        netPerformanceValuesPercentage: { [date: string]: Big };
      };
    }
  ) {
    for (const symbol of Object.keys(symbols)) {
      const {
        currentValues,
        investmentValues,
        maxInvestmentValues,
        netPerformanceValues,
        netPerformanceValuesPercentage
      } = this.getSymbolMetrics({
        end,
        marketSymbolMap,
        start,
        step,
        symbol,
        isChartMode: true
      });

      valuesBySymbol[symbol] = {
        currentValues,
        investmentValues,
        maxInvestmentValues,
        netPerformanceValues,
        netPerformanceValuesPercentage
      };
    }
  }

  private populateMarketSymbolMap(
    marketSymbols: GetValueObject[],
    marketSymbolMap: { [date: string]: { [symbol: string]: Big } }
  ) {
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
  }

  private async getInformationFromCurrentRateService(
    currencies: { [symbol: string]: string },
    dataGatheringItems: IDataGatheringItem[],
    dates: Date[]
  ): Promise<{
    dataProviderInfos: DataProviderInfo[];
    values: GetValueObject[];
  }> {
    return await this.currentRateService.getValues({
      currencies,
      dataGatheringItems,
      dateQuery: {
        in: dates
      },
      userCurrency: this.currency
    });
  }

  private pushDataGatheringsSymbols(
    transactionPointsBeforeEndDate: TransactionPoint[],
    firstIndex: number,
    dataGatheringItems: IDataGatheringItem[],
    currencies: { [symbol: string]: string },
    symbols: { [symbol: string]: boolean }
  ) {
    for (const item of transactionPointsBeforeEndDate[firstIndex - 1].items) {
      dataGatheringItems.push({
        dataSource: item.dataSource,
        symbol: item.symbol
      });
      currencies[item.symbol] = item.currency;
      symbols[item.symbol] = true;
    }
  }

  private getRelevantStartAndEndDates(
    start: Date,
    end: Date,
    dates: Date[],
    step: number
  ) {
    let day = start;

    while (isBefore(day, end)) {
      dates.push(resetHours(day));
      day = addDays(day, step);
    }

    if (!isSameDay(last(dates), end)) {
      dates.push(resetHours(end));
    }
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
    let dates = [];
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

    // Add dates of last week for fallback
    dates.push(subDays(resetHours(new Date()), 7));
    dates.push(subDays(resetHours(new Date()), 6));
    dates.push(subDays(resetHours(new Date()), 5));
    dates.push(subDays(resetHours(new Date()), 4));
    dates.push(subDays(resetHours(new Date()), 3));
    dates.push(subDays(resetHours(new Date()), 2));
    dates.push(subDays(resetHours(new Date()), 1));
    dates.push(resetHours(new Date()));

    dates = uniq(
      dates.map((date) => {
        return date.getTime();
      })
    ).map((timestamp) => {
      return new Date(timestamp);
    });
    dates.sort((a, b) => a.getTime() - b.getTime());

    const {
      dataProviderInfos,
      errors: currentRateErrors,
      values: marketSymbols
    } = await this.currentRateService.getValues({
      currencies,
      dataGatheringItems,
      dateQuery: {
        in: dates
      },
      userCurrency: this.currency
    });

    this.dataProviderInfos = dataProviderInfos;

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

    const positions: TimelinePosition[] = [];
    let hasAnySymbolMetricsErrors = false;

    const errors: ResponseError['errors'] = [];

    for (const item of lastTransactionPoint.items) {
      const marketValue = marketSymbolMap[endDateString]?.[item.symbol];

      const {
        grossPerformance,
        grossPerformancePercentage,
        hasErrors,
        netPerformance,
        netPerformancePercentage,
        timeWeightedInvestment
      } = this.getSymbolMetrics({
        end,
        marketSymbolMap,
        start,
        symbol: item.symbol
      });

      hasAnySymbolMetricsErrors = hasAnySymbolMetricsErrors || hasErrors;

      positions.push({
        timeWeightedInvestment,
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
        tags: item.tags,
        transactionCount: item.transactionCount
      });

      if (
        (hasErrors ||
          currentRateErrors.find(({ dataSource, symbol }) => {
            return dataSource === item.dataSource && symbol === item.symbol;
          })) &&
        item.investment.gt(0)
      ) {
        errors.push({ dataSource: item.dataSource, symbol: item.symbol });
      }
    }

    const overall = this.calculateOverallPerformance(positions);

    return {
      ...overall,
      errors,
      positions,
      hasErrors: hasAnySymbolMetricsErrors || overall.hasErrors
    };
  }

  public getDataProviderInfos() {
    return this.dataProviderInfos;
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

    const investments: { date: string; investment: Big }[] = [];
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

    // Fill in the missing dates with investment = 0
    const startDate = parseDate(first(this.orders).date);
    const endDate = parseDate(last(this.orders).date);

    const allDates: string[] = [];
    currentDate = startDate;

    while (currentDate <= endDate) {
      allDates.push(
        format(
          set(currentDate, {
            date: 1,
            month: groupBy === 'year' ? 0 : currentDate.getMonth()
          }),
          DATE_FORMAT
        )
      );
      currentDate.setMonth(currentDate.getMonth() + 1);
    }

    for (const date of allDates) {
      const existingInvestment = investments.find((investment) => {
        return investment.date === date;
      });

      if (!existingInvestment) {
        investments.push({ date, investment: new Big(0) });
      }
    }

    return sortBy(investments, (investment) => {
      return investment.date;
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

  private calculateOverallPerformance(positions: TimelinePosition[]) {
    let currentValue = new Big(0);
    let grossPerformance = new Big(0);
    let hasErrors = false;
    let netPerformance = new Big(0);
    let totalInvestment = new Big(0);
    let totalTimeWeightedInvestment = new Big(0);

    for (const currentPosition of positions) {
      if (currentPosition.marketPrice) {
        currentValue = currentValue.plus(
          new Big(currentPosition.marketPrice).mul(currentPosition.quantity)
        );
      } else {
        hasErrors = true;
      }

      totalInvestment = totalInvestment.plus(currentPosition.investment);

      if (currentPosition.grossPerformance !== null) {
        grossPerformance = grossPerformance.plus(
          currentPosition.grossPerformance
        );

        netPerformance = netPerformance.plus(currentPosition.netPerformance);
      } else if (!currentPosition.quantity.eq(0)) {
        hasErrors = true;
      }

      if (currentPosition.grossPerformancePercentage !== null) {
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
          `Missing historical market data for ${currentPosition.symbol} (${currentPosition.dataSource})`,
          'PortfolioCalculator'
        );
        hasErrors = true;
      }
    }

    return {
      currentValue,
      grossPerformance,
      hasErrors,
      netPerformance,
      totalInvestment,
      netPerformancePercentage: totalTimeWeightedInvestment.eq(0)
        ? new Big(0)
        : netPerformance.div(totalTimeWeightedInvestment),
      grossPerformancePercentage: totalTimeWeightedInvestment.eq(0)
        ? new Big(0)
        : grossPerformance.div(totalTimeWeightedInvestment)
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
          const { values } = await this.currentRateService.getValues({
            currencies,
            dataGatheringItems,
            dateQuery: {
              gte: startDate,
              lt: endOfDay(endDate)
            },
            userCurrency: this.currency
          });
          marketSymbols = values;
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
      case 'STAKE':
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
        currentValues: {},
        grossPerformance: new Big(0),
        grossPerformancePercentage: new Big(0),
        hasErrors: false,
        initialValue: new Big(0),
        investmentValues: {},
        maxInvestmentValues: {},
        netPerformance: new Big(0),
        netPerformancePercentage: new Big(0),
        netPerformanceValues: {},
        netPerformanceValuesPercentage: {}
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
    const currentValues: { [date: string]: Big } = {};
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
    const netPerformanceValuesPercentage: { [date: string]: Big } = {};
    let totalInvestment = new Big(0);
    let totalInvestmentWithGrossPerformanceFromSell = new Big(0);
    let totalUnits = new Big(0);
    let valueAtStartDate: Big;

    // Add a synthetic order at the start and the end date
    this.addSyntheticStartAndEndOrders(
      orders,
      symbol,
      start,
      unitPriceAtStartDate,
      end,
      unitPriceAtEndDate
    );

    let day = start;
    let lastUnitPrice: Big;

    ({ day, lastUnitPrice } = this.handleChartMode(
      isChartMode,
      orders,
      day,
      end,
      symbol,
      marketSymbolMap,
      lastUnitPrice,
      step
    ));

    // Sort orders so that the start and end placeholder order are at the right
    // position
    orders = this.sortOrdersByTime(orders);

    const indexOfStartOrder = orders.findIndex((order) => {
      return order.itemType === 'start';
    });

    const indexOfEndOrder = orders.findIndex((order) => {
      return order.itemType === 'end';
    });

    let totalInvestmentDays = 0;
    let sumOfTimeWeightedInvestments = new Big(0);

    return this.calculatePerformanceOfSymbol(
      orders,
      indexOfStartOrder,
      unitPriceAtStartDate,
      averagePriceAtStartDate,
      totalUnits,
      totalInvestment,
      investmentAtStartDate,
      valueAtStartDate,
      maxTotalInvestment,
      indexOfEndOrder,
      averagePriceAtEndDate,
      initialValue,
      marketSymbolMap,
      fees,
      lastAveragePrice,
      grossPerformanceFromSells,
      totalInvestmentWithGrossPerformanceFromSell,
      grossPerformance,
      feesAtStartDate,
      grossPerformanceAtStartDate,
      isChartMode,
      currentValues,
      netPerformanceValues,
      netPerformanceValuesPercentage,
      investmentValues,
      maxInvestmentValues,
      unitPriceAtEndDate,
      symbol
    );
  }

  private calculatePerformanceOfSymbol(
    orders: PortfolioOrderItem[],
    indexOfStartOrder: number,
    unitPriceAtStartDate: Big,
    averagePriceAtStartDate: Big,
    totalUnits: Big,
    totalInvestment: Big,
    investmentAtStartDate: Big,
    valueAtStartDate: Big,
    maxTotalInvestment: Big,
    indexOfEndOrder: number,
    averagePriceAtEndDate: Big,
    initialValue: Big,
    marketSymbolMap: { [date: string]: { [symbol: string]: Big } },
    fees: Big,
    lastAveragePrice: Big,
    grossPerformanceFromSells: Big,
    totalInvestmentWithGrossPerformanceFromSell: Big,
    grossPerformance: Big,
    feesAtStartDate: Big,
    grossPerformanceAtStartDate: Big,
    isChartMode: boolean,
    currentValues: { [date: string]: Big },
    netPerformanceValues: { [date: string]: Big },
    netPerformanceValuesPercentage: { [date: string]: Big },
    investmentValues: { [date: string]: Big },
    maxInvestmentValues: { [date: string]: Big },
    unitPriceAtEndDate: Big,
    symbol: string
  ) {
    ({
      lastAveragePrice,
      grossPerformance,
      feesAtStartDate,
      grossPerformanceAtStartDate,
      averagePriceAtStartDate,
      totalUnits,
      totalInvestment,
      investmentAtStartDate,
      valueAtStartDate,
      maxTotalInvestment,
      averagePriceAtEndDate,
      initialValue,
      fees,
      netPerformanceValuesPercentage
    } = this.handleOrders(
      orders,
      indexOfStartOrder,
      unitPriceAtStartDate,
      averagePriceAtStartDate,
      totalUnits,
      totalInvestment,
      investmentAtStartDate,
      valueAtStartDate,
      maxTotalInvestment,
      averagePriceAtEndDate,
      initialValue,
      fees,
      indexOfEndOrder,
      marketSymbolMap,
      grossPerformanceFromSells,
      totalInvestmentWithGrossPerformanceFromSell,
      lastAveragePrice,
      grossPerformance,
      feesAtStartDate,
      grossPerformanceAtStartDate,
      isChartMode,
      currentValues,
      netPerformanceValues,
      netPerformanceValuesPercentage,
      investmentValues,
      maxInvestmentValues
    ));

    const totalGrossPerformance = grossPerformance.minus(
      grossPerformanceAtStartDate
    );

    const totalNetPerformance = grossPerformance
      .minus(grossPerformanceAtStartDate)
      .minus(fees.minus(feesAtStartDate));

    const maxInvestmentBetweenStartAndEndDate = valueAtStartDate.plus(
      maxTotalInvestment.minus(investmentAtStartDate)
    );

    const grossPerformancePercentage = this.calculateGrossPerformancePercentage(
      averagePriceAtStartDate,
      averagePriceAtEndDate,
      orders,
      indexOfStartOrder,
      maxInvestmentBetweenStartAndEndDate,
      totalGrossPerformance,
      unitPriceAtEndDate
    );

    const feesPerUnit = totalUnits.gt(0)
      ? fees.minus(feesAtStartDate).div(totalUnits)
      : new Big(0);

    const netPerformancePercentage = this.calculateNetPerformancePercentage(
      averagePriceAtStartDate,
      averagePriceAtEndDate,
      orders,
      indexOfStartOrder,
      maxInvestmentBetweenStartAndEndDate,
      totalNetPerformance,
      unitPriceAtEndDate,
      feesPerUnit
    );

    this.handleLogging(
      symbol,
      orders,
      indexOfStartOrder,
      unitPriceAtEndDate,
      averagePriceAtStartDate,
      averagePriceAtEndDate,
      totalInvestment,
      maxTotalInvestment,
      totalGrossPerformance,
      grossPerformancePercentage,
      feesPerUnit,
      totalNetPerformance,
      netPerformancePercentage
    );
    return {
      currentValues,
      grossPerformancePercentage,
      initialValue,
      investmentValues,
      maxInvestmentValues,
      netPerformancePercentage,
      netPerformanceValues,
      grossPerformance: totalGrossPerformance,
      hasErrors: totalUnits.gt(0) && (!initialValue || !unitPriceAtEndDate),
      netPerformance: totalNetPerformance,
      averagePriceAtStartDate,
      totalUnits,
      totalInvestment,
      investmentAtStartDate,
      valueAtStartDate,
      maxTotalInvestment,
      averagePriceAtEndDate,
      fees,
      lastAveragePrice,
      grossPerformanceFromSells,
      totalInvestmentWithGrossPerformanceFromSell,
      feesAtStartDate,
      grossPerformanceAtStartDate,
      netPerformanceValuesPercentage
    };
  }

  private handleOrders(
    orders: PortfolioOrderItem[],
    indexOfStartOrder: number,
    unitPriceAtStartDate: Big,
    averagePriceAtStartDate: Big,
    totalUnits: Big,
    totalInvestment: Big,
    investmentAtStartDate: Big,
    valueAtStartDate: Big,
    maxTotalInvestment: Big,
    averagePriceAtEndDate: Big,
    initialValue: Big,
    fees: Big,
    indexOfEndOrder: number,
    marketSymbolMap: { [date: string]: { [symbol: string]: Big } },
    grossPerformanceFromSells: Big,
    totalInvestmentWithGrossPerformanceFromSell: Big,
    lastAveragePrice: Big,
    grossPerformance: Big,
    feesAtStartDate: Big,
    grossPerformanceAtStartDate: Big,
    isChartMode: boolean,
    currentValues: { [date: string]: Big },
    netPerformanceValues: { [date: string]: Big },
    netPerformanceValuesPercentage: { [date: string]: Big },
    investmentValues: { [date: string]: Big },
    maxInvestmentValues: { [date: string]: Big }
  ) {
    for (let i = 0; i < orders.length; i += 1) {
      const order = orders[i];
      this.calculateNetPerformancePercentageForDateAndSymbol(
        i,
        orders,
        order,
        netPerformanceValuesPercentage,
        marketSymbolMap
      );

      if (PortfolioCalculator.ENABLE_LOGGING) {
        console.log();
        console.log();
        console.log(i + 1, order.type, order.itemType);
      }

      this.handleStartOrder(
        order,
        indexOfStartOrder,
        orders,
        i,
        unitPriceAtStartDate
      );

      // Calculate the average start price as soon as any units are held
      let transactionInvestment;
      let valueOfInvestment;
      ({
        transactionInvestment,
        valueOfInvestment,
        averagePriceAtStartDate,
        totalUnits,
        totalInvestment,
        investmentAtStartDate,
        valueAtStartDate,
        maxTotalInvestment,
        averagePriceAtEndDate,
        initialValue,
        fees
      } = this.calculateInvestmentSpecificMetrics(
        averagePriceAtStartDate,
        i,
        indexOfStartOrder,
        totalUnits,
        totalInvestment,
        order,
        investmentAtStartDate,
        valueAtStartDate,
        maxTotalInvestment,
        averagePriceAtEndDate,
        indexOfEndOrder,
        initialValue,
        marketSymbolMap,
        fees
      ));
      ({
        grossPerformanceFromSells,
        totalInvestmentWithGrossPerformanceFromSell
      } = this.calculateSellOrders(
        order,
        lastAveragePrice,
        grossPerformanceFromSells,
        totalInvestmentWithGrossPerformanceFromSell,
        transactionInvestment
      ));

      lastAveragePrice = totalUnits.eq(0)
        ? new Big(0)
        : totalInvestmentWithGrossPerformanceFromSell.div(totalUnits);

      const newGrossPerformance = valueOfInvestment
        .minus(totalInvestment)
        .plus(grossPerformanceFromSells);

      grossPerformance = newGrossPerformance;

      if (order.itemType === 'start') {
        feesAtStartDate = fees;
        grossPerformanceAtStartDate = grossPerformance;
      }

      this.calculatePerformancesForDate(
        isChartMode,
        i,
        indexOfStartOrder,
        currentValues,
        order,
        valueOfInvestment,
        netPerformanceValues,
        grossPerformance,
        grossPerformanceAtStartDate,
        fees,
        feesAtStartDate,
        investmentValues,
        totalInvestment,
        maxInvestmentValues,
        maxTotalInvestment
      );

      this.handleLoggingOfInvestmentMetrics(
        totalInvestment,
        order,
        transactionInvestment,
        totalInvestmentWithGrossPerformanceFromSell,
        grossPerformanceFromSells,
        grossPerformance,
        grossPerformanceAtStartDate
      );

      if (i === indexOfEndOrder) {
        break;
      }
    }
    return {
      lastAveragePrice,
      grossPerformance,
      feesAtStartDate,
      grossPerformanceAtStartDate,
      averagePriceAtStartDate,
      totalUnits,
      totalInvestment,
      investmentAtStartDate,
      valueAtStartDate,
      maxTotalInvestment,
      averagePriceAtEndDate,
      initialValue,
      fees,
      netPerformanceValuesPercentage
    };
  }

  private calculateNetPerformancePercentageForDateAndSymbol(
    i: number,
    orders: PortfolioOrderItem[],
    order: PortfolioOrderItem,
    netPerformanceValuesPercentage: { [date: string]: Big },
    marketSymbolMap: { [date: string]: { [symbol: string]: Big } }
  ) {
    if (i > 0 && order) {
      const previousOrder = orders[i - 1];

      if (order.unitPrice.toNumber() && previousOrder.unitPrice.toNumber()) {
        netPerformanceValuesPercentage[order.date] = order.unitPrice
          .div(previousOrder.unitPrice)
          .minus(1);
      } else if (
        order.type === 'STAKE' &&
        marketSymbolMap[order.date] &&
        ((marketSymbolMap[previousOrder.date][
          previousOrder.symbol
        ]?.toNumber() &&
          previousOrder.type === 'STAKE') ||
          (previousOrder.type !== 'STAKE' &&
            previousOrder.unitPrice.toNumber()))
      ) {
        let previousUnitPrice =
          previousOrder.type === 'STAKE'
            ? marketSymbolMap[previousOrder.date][previousOrder.symbol]
            : previousOrder.unitPrice;
        netPerformanceValuesPercentage[order.date] = marketSymbolMap[
          order.date
        ][order.symbol]
          ? marketSymbolMap[order.date][order.symbol]
              .div(previousUnitPrice)
              .minus(1)
          : new Big(0);
      } else if (previousOrder.unitPrice.toNumber()) {
        netPerformanceValuesPercentage[order.date] = new Big(-1);
      } else if (
        previousOrder.type === 'STAKE' &&
        marketSymbolMap[previousOrder.date] &&
        marketSymbolMap[previousOrder.date][previousOrder.symbol]?.toNumber()
      ) {
        netPerformanceValuesPercentage[order.date] = order.unitPrice
          .div(marketSymbolMap[previousOrder.date][previousOrder.symbol])
          .minus(1);
      } else {
        netPerformanceValuesPercentage[order.date] = new Big(0);
      }
    }
  }

  private handleLoggingOfInvestmentMetrics(
    totalInvestment: Big,
    order: PortfolioOrderItem,
    transactionInvestment: any,
    totalInvestmentWithGrossPerformanceFromSell: Big,
    grossPerformanceFromSells: Big,
    grossPerformance: Big,
    grossPerformanceAtStartDate: Big
  ) {
    if (PortfolioCalculator.ENABLE_LOGGING) {
      console.log('totalInvestment', totalInvestment.toNumber());
      console.log('order.quantity', order.quantity.toNumber());
      console.log('transactionInvestment', transactionInvestment.toNumber());
      console.log(
        'totalInvestmentWithGrossPerformanceFromSell',
        totalInvestmentWithGrossPerformanceFromSell.toNumber()
      );
      console.log(
        'grossPerformanceFromSells',
        grossPerformanceFromSells.toNumber()
      );
      console.log('totalInvestment', totalInvestment.toNumber());
      console.log(
        'totalGrossPerformance',
        grossPerformance.minus(grossPerformanceAtStartDate).toNumber()
      );
    }
  }

  private calculateNetPerformancePercentage(
    averagePriceAtStartDate: Big,
    averagePriceAtEndDate: Big,
    orders: PortfolioOrderItem[],
    indexOfStartOrder: number,
    maxInvestmentBetweenStartAndEndDate: Big,
    totalNetPerformance: Big,
    unitPriceAtEndDate: Big,
    feesPerUnit: Big
  ) {
    return PortfolioCalculator.CALCULATE_PERCENTAGE_PERFORMANCE_WITH_MAX_INVESTMENT ||
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
          .div(orders[indexOfStartOrder].unitPrice.div(averagePriceAtStartDate))
          .minus(1);
  }

  private calculateGrossPerformancePercentage(
    averagePriceAtStartDate: Big,
    averagePriceAtEndDate: Big,
    orders: PortfolioOrderItem[],
    indexOfStartOrder: number,
    maxInvestmentBetweenStartAndEndDate: Big,
    totalGrossPerformance: Big,
    unitPriceAtEndDate: Big
  ) {
    return PortfolioCalculator.CALCULATE_PERCENTAGE_PERFORMANCE_WITH_MAX_INVESTMENT ||
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
          .div(orders[indexOfStartOrder].unitPrice.div(averagePriceAtStartDate))
          .minus(1);
  }

  private calculateInvestmentSpecificMetrics(
    averagePriceAtStartDate: Big,
    i: number,
    indexOfStartOrder: number,
    totalUnits: Big,
    totalInvestment: Big,
    order: PortfolioOrderItem,
    investmentAtStartDate: Big,
    valueAtStartDate: Big,
    maxTotalInvestment: Big,
    averagePriceAtEndDate: Big,
    indexOfEndOrder: number,
    initialValue: Big,
    marketSymbolMap: { [date: string]: { [symbol: string]: Big } },
    fees: Big
  ) {
    averagePriceAtStartDate = this.calculateAveragePrice(
      averagePriceAtStartDate,
      i,
      indexOfStartOrder,
      totalUnits,
      totalInvestment
    );

    const valueOfInvestmentBeforeTransaction = totalUnits.mul(order.unitPrice);

    if (!investmentAtStartDate && i >= indexOfStartOrder) {
      investmentAtStartDate = totalInvestment ?? new Big(0);
      valueAtStartDate = valueOfInvestmentBeforeTransaction;
    }

    const transactionInvestment = this.getTransactionInvestment(
      order,
      totalUnits,
      totalInvestment
    );

    totalInvestment = totalInvestment.plus(transactionInvestment);

    if (i >= indexOfStartOrder && totalInvestment.gt(maxTotalInvestment)) {
      maxTotalInvestment = totalInvestment;
    }

    averagePriceAtEndDate = this.calculateAveragePriceAtEnd(
      i,
      indexOfEndOrder,
      totalUnits,
      averagePriceAtEndDate,
      totalInvestment
    );

    initialValue = this.calculateInitialValue(
      i,
      indexOfStartOrder,
      initialValue,
      valueOfInvestmentBeforeTransaction,
      transactionInvestment,
      order,
      marketSymbolMap
    );

    fees = fees.plus(order.fee);

    totalUnits = totalUnits.plus(
      order.quantity.mul(this.getFactor(order.type))
    );

    const valueOfInvestment = totalUnits.mul(order.unitPrice);
    return {
      transactionInvestment,
      valueOfInvestment,
      averagePriceAtStartDate,
      totalUnits,
      totalInvestment,
      investmentAtStartDate,
      valueAtStartDate,
      maxTotalInvestment,
      averagePriceAtEndDate,
      initialValue,
      fees
    };
  }

  private calculatePerformancesForDate(
    isChartMode: boolean,
    i: number,
    indexOfStartOrder: number,
    currentValues: { [date: string]: Big },
    order: PortfolioOrderItem,
    valueOfInvestment: Big,
    netPerformanceValues: { [date: string]: Big },
    grossPerformance: Big,
    grossPerformanceAtStartDate: Big,
    fees: Big,
    feesAtStartDate: Big,
    investmentValues: { [date: string]: Big },
    totalInvestment: Big,
    maxInvestmentValues: { [date: string]: Big },
    maxTotalInvestment: Big
  ) {
    if (isChartMode && i > indexOfStartOrder) {
      currentValues[order.date] = valueOfInvestment;
      netPerformanceValues[order.date] = grossPerformance
        .minus(grossPerformanceAtStartDate)
        .minus(fees.minus(feesAtStartDate));

      investmentValues[order.date] = totalInvestment;
      maxInvestmentValues[order.date] = maxTotalInvestment;
    }
  }

  private calculateSellOrders(
    order: PortfolioOrderItem,
    lastAveragePrice: Big,
    grossPerformanceFromSells: Big,
    totalInvestmentWithGrossPerformanceFromSell: Big,
    transactionInvestment: Big
  ) {
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
    return {
      grossPerformanceFromSells,
      totalInvestmentWithGrossPerformanceFromSell
    };
  }

  private calculateInitialValue(
    i: number,
    indexOfStartOrder: number,
    initialValue: Big,
    valueOfInvestmentBeforeTransaction: Big,
    transactionInvestment: Big,
    order: PortfolioOrderItem,
    marketSymbolMap: { [date: string]: { [symbol: string]: Big } }
  ) {
    if (i >= indexOfStartOrder && !initialValue) {
      if (
        i === indexOfStartOrder &&
        !valueOfInvestmentBeforeTransaction.eq(0)
      ) {
        initialValue = valueOfInvestmentBeforeTransaction;
      } else if (transactionInvestment.gt(0)) {
        initialValue = transactionInvestment;
      } else if (order.type === 'STAKE') {
        // For Parachain Rewards or Stock SpinOffs, first transactionInvestment might be 0 if the symbol has been acquired for free
        initialValue = order.quantity.mul(
          marketSymbolMap[order.date]?.[order.symbol] ?? new Big(0)
        );
      }
    }
    return initialValue;
  }

  private calculateAveragePriceAtEnd(
    i: number,
    indexOfEndOrder: number,
    totalUnits: Big,
    averagePriceAtEndDate: Big,
    totalInvestment: Big
  ) {
    if (i === indexOfEndOrder && totalUnits.gt(0)) {
      averagePriceAtEndDate = totalInvestment.div(totalUnits);
    }
    return averagePriceAtEndDate;
  }

  private getTransactionInvestment(
    order: PortfolioOrderItem,
    totalUnits: Big,
    totalInvestment: Big
  ) {
    return order.type === 'BUY' || order.type === 'STAKE'
      ? order.quantity.mul(order.unitPrice).mul(this.getFactor(order.type))
      : totalUnits.gt(0)
        ? totalInvestment
            .div(totalUnits)
            .mul(order.quantity)
            .mul(this.getFactor(order.type))
        : new Big(0);
  }

  private calculateAveragePrice(
    averagePriceAtStartDate: Big,
    i: number,
    indexOfStartOrder: number,
    totalUnits: Big,
    totalInvestment: Big
  ) {
    if (
      averagePriceAtStartDate.eq(0) &&
      i >= indexOfStartOrder &&
      totalUnits.gt(0)
    ) {
      averagePriceAtStartDate = totalInvestment.div(totalUnits);
    }
    return averagePriceAtStartDate;
  }

  private handleStartOrder(
    order: PortfolioOrderItem,
    indexOfStartOrder: number,
    orders: PortfolioOrderItem[],
    i: number,
    unitPriceAtStartDate: Big
  ) {
    if (order.itemType === 'start') {
      // Take the unit price of the order as the market price if there are no
      // orders of this symbol before the start date
      order.unitPrice =
        indexOfStartOrder === 0
          ? orders[i + 1]?.unitPrice
          : unitPriceAtStartDate;
    }
  }

  private handleLogging(
    symbol: string,
    orders: PortfolioOrderItem[],
    indexOfStartOrder: number,
    unitPriceAtEndDate: Big,
    averagePriceAtStartDate: Big,
    averagePriceAtEndDate: Big,
    totalInvestment: Big,
    maxTotalInvestment: Big,
    totalGrossPerformance: Big,
    grossPerformancePercentage: Big,
    feesPerUnit: Big,
    totalNetPerformance: Big,
    netPerformancePercentage: Big
  ) {
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
        Time weighted investment: ${timeWeightedAverageInvestmentBetweenStartAndEndDate.toFixed(
          2
        )}
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
  }

  private sortOrdersByTime(orders: PortfolioOrderItem[]) {
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
    return orders;
  }

  private handleChartMode(
    isChartMode: boolean,
    orders: PortfolioOrderItem[],
    day: Date,
    end: Date,
    symbol: string,
    marketSymbolMap: { [date: string]: { [symbol: string]: Big } },
    lastUnitPrice: Big,
    step: number
  ) {
    if (isChartMode) {
      const datesWithOrders = {};

      for (const order of orders) {
        datesWithOrders[order.date] = true;
      }

      while (isBefore(day, end)) {
        this.handleDay(
          datesWithOrders,
          day,
          orders,
          symbol,
          marketSymbolMap,
          lastUnitPrice
        );

        lastUnitPrice = last(orders).unitPrice;

        day = addDays(day, step);
      }
    }
    return { day, lastUnitPrice };
  }

  private handleDay(
    datesWithOrders: {},
    day: Date,
    orders: PortfolioOrderItem[],
    symbol: string,
    marketSymbolMap: { [date: string]: { [symbol: string]: Big } },
    lastUnitPrice: Big
  ) {
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
          marketSymbolMap[format(day, DATE_FORMAT)]?.[symbol] ?? lastUnitPrice
      });
    } else {
      let orderIndex = orders.findIndex(
        (o) => o.date === format(day, DATE_FORMAT) && o.type === 'STAKE'
      );
      if (orderIndex >= 0) {
        let order = orders[orderIndex];
        orders.splice(orderIndex, 1);
        orders.push({
          ...order,
          unitPrice:
            marketSymbolMap[format(day, DATE_FORMAT)]?.[symbol] ?? lastUnitPrice
        });
      }
    }
  }

  private addSyntheticStartAndEndOrders(
    orders: PortfolioOrderItem[],
    symbol: string,
    start: Date,
    unitPriceAtStartDate: Big,
    end: Date,
    unitPriceAtEndDate: Big
  ) {
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
