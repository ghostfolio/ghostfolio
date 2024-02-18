import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.service';
import { IDataGatheringItem } from '@ghostfolio/api/services/interfaces/interfaces';
import { DATE_FORMAT, parseDate, resetHours } from '@ghostfolio/common/helper';
import {
  DataProviderInfo,
  HistoricalDataItem,
  InvestmentItem,
  ResponseError,
  SymbolMetrics,
  TimelinePosition
} from '@ghostfolio/common/interfaces';
import { GroupBy } from '@ghostfolio/common/types';

import { Logger } from '@nestjs/common';
import { Type as TypeOfOrder } from '@prisma/client';
import Big from 'big.js';
import {
  addDays,
  addMilliseconds,
  endOfDay,
  format,
  isBefore,
  isSameDay,
  subDays
} from 'date-fns';
import { cloneDeep, first, isNumber, last, sortBy, uniq } from 'lodash';

import { CurrentRateService } from './current-rate.service';
import { CurrentPositions } from './interfaces/current-positions.interface';
import { PortfolioOrderItem } from './interfaces/portfolio-calculator.interface';
import { PortfolioOrder } from './interfaces/portfolio-order.interface';
import { TransactionPointSymbol } from './interfaces/transaction-point-symbol.interface';
import { TransactionPoint } from './interfaces/transaction-point.interface';

export class PortfolioCalculator {
  private static readonly CALCULATE_PERCENTAGE_PERFORMANCE_WITH_MAX_INVESTMENT =
    true;

  private static readonly ENABLE_LOGGING = false;

  private currency: string;
  private currentRateService: CurrentRateService;
  private dataProviderInfos: DataProviderInfo[];
  private exchangeRateDataService: ExchangeRateDataService;
  private orders: PortfolioOrder[];
  private transactionPoints: TransactionPoint[];

  public constructor({
    currency,
    currentRateService,
    exchangeRateDataService,
    orders
  }: {
    currency: string;
    currentRateService: CurrentRateService;
    exchangeRateDataService: ExchangeRateDataService;
    orders: PortfolioOrder[];
  }) {
    this.currency = currency;
    this.currentRateService = currentRateService;
    this.exchangeRateDataService = exchangeRateDataService;
    this.orders = orders;

    this.orders.sort((a, b) => {
      return a.date?.localeCompare(b.date);
    });
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

  public async getChartData({
    start: Date,
    end = new Date(Date.now()),
    step = 1,
    calculateTimeWeightedPerformance = false
  }: {
    end?: Date;
    start: Date;
    step?: number;
    calculateTimeWeightedPerformance?: boolean;
  }): Promise<HistoricalDataItem[]> {
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
        currentValuesWithCurrencyEffect: { [date: string]: Big };
        investmentValuesAccumulated: { [date: string]: Big };
        investmentValuesAccumulatedWithCurrencyEffect: { [date: string]: Big };
        investmentValuesWithCurrencyEffect: { [date: string]: Big };
        netPerformanceValues: { [date: string]: Big };
        netPerformanceValuesPercentage: { [date: string]: Big };
      };
    }
  ) {
    for (const symbol of Object.keys(symbols)) {
      const {
        currentValues,
        currentValuesWithCurrencyEffect,
        investmentValuesAccumulated,
        investmentValuesAccumulatedWithCurrencyEffect,
        investmentValuesWithCurrencyEffect,
        netPerformanceValues,
        netPerformanceValuesPercentage
      } = this.getSymbolMetrics({
        end,
        marketSymbolMap,
        start,
        step,
        symbol,
        exchangeRates:
          exchangeRatesByCurrency[`${currencies[symbol]}${this.currency}`],
        isChartMode: true
      });

      valuesBySymbol[symbol] = {
        currentValues,
        currentValuesWithCurrencyEffect,
        investmentValuesAccumulated,
        investmentValuesAccumulatedWithCurrencyEffect,
        investmentValuesWithCurrencyEffect,
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
        grossPerformancePercentageWithCurrencyEffect: new Big(0),
        grossPerformanceWithCurrencyEffect: new Big(0),
        hasErrors: false,
        netPerformance: new Big(0),
        netPerformancePercentage: new Big(0),
        netPerformancePercentageWithCurrencyEffect: new Big(0),
        netPerformanceWithCurrencyEffect: new Big(0),
        positions: [],
        totalInvestment: new Big(0)
      };
    }

    const lastTransactionPoint =
      transactionPointsBeforeEndDate[transactionPointsBeforeEndDate.length - 1];

    const currencies: { [symbol: string]: string } = {};
    const dataGatheringItems: IDataGatheringItem[] = [];
    let dates: Date[] = [];
    let firstIndex = transactionPointsBeforeEndDate.length;
    let firstTransactionPoint: TransactionPoint = null;

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
    )
      .map((timestamp) => {
        return new Date(timestamp);
      })
      .sort((a, b) => {
        return a.getTime() - b.getTime();
      });

    let exchangeRatesByCurrency =
      await this.exchangeRateDataService.getExchangeRatesByCurrency({
        currencies: uniq(Object.values(currencies)),
        endDate: endOfDay(end),
        startDate: parseDate(this.transactionPoints?.[0]?.date),
        targetCurrency: this.currency
      });

    const {
      dataProviderInfos,
      errors: currentRateErrors,
      values: marketSymbols
    } = await this.currentRateService.getValues({
      dataGatheringItems,
      dateQuery: {
        in: dates
      }
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

      if (marketSymbol.marketPrice) {
        marketSymbolMap[date][marketSymbol.symbol] = new Big(
          marketSymbol.marketPrice
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
      const marketPriceInBaseCurrency = marketSymbolMap[endDateString]?.[
        item.symbol
      ]?.mul(
        exchangeRatesByCurrency[`${item.currency}${this.currency}`]?.[
          endDateString
        ]
      );

      const {
        grossPerformance,
        grossPerformancePercentage,
        grossPerformancePercentageWithCurrencyEffect,
        grossPerformanceWithCurrencyEffect,
        hasErrors,
        initialValue,
        netPerformance,
        netPerformancePercentage,
        netPerformancePercentageWithCurrencyEffect,
        netPerformanceWithCurrencyEffect,
        timeWeightedInvestment,
        timeWeightedInvestmentWithCurrencyEffect,
        totalInvestment,
        totalInvestmentWithCurrencyEffect
      } = this.getSymbolMetrics({
        end,
        marketSymbolMap,
        start,
        exchangeRates:
          exchangeRatesByCurrency[`${item.currency}${this.currency}`],
        symbol: item.symbol
      });

      hasAnySymbolMetricsErrors = hasAnySymbolMetricsErrors || hasErrors;
      initialValues[item.symbol] = initialValue;

      positions.push({
        timeWeightedInvestment,
        timeWeightedInvestmentWithCurrencyEffect,
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
        grossPerformancePercentageWithCurrencyEffect: !hasErrors
          ? grossPerformancePercentageWithCurrencyEffect ?? null
          : null,
        grossPerformanceWithCurrencyEffect: !hasErrors
          ? grossPerformanceWithCurrencyEffect ?? null
          : null,
        investment: totalInvestment,
        investmentWithCurrencyEffect: totalInvestmentWithCurrencyEffect,
        marketPrice:
          marketSymbolMap[endDateString]?.[item.symbol]?.toNumber() ?? null,
        marketPriceInBaseCurrency:
          marketPriceInBaseCurrency?.toNumber() ?? null,
        netPerformance: !hasErrors ? netPerformance ?? null : null,
        netPerformancePercentage: !hasErrors
          ? netPerformancePercentage ?? null
          : null,
        netPerformancePercentageWithCurrencyEffect: !hasErrors
          ? netPerformancePercentageWithCurrencyEffect ?? null
          : null,
        netPerformanceWithCurrencyEffect: !hasErrors
          ? netPerformanceWithCurrencyEffect ?? null
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

    const overall = this.calculateOverallPerformance(positions, initialValues);

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

  public getInvestmentsByGroup({
    data,
    groupBy
  }: {
    data: HistoricalDataItem[];
    groupBy: GroupBy;
  }): InvestmentItem[] {
    const groupedData: { [dateGroup: string]: Big } = {};

    for (const { date, investmentValueWithCurrencyEffect } of data) {
      const dateGroup =
        groupBy === 'month' ? date.substring(0, 7) : date.substring(0, 4);
      groupedData[dateGroup] = (groupedData[dateGroup] ?? new Big(0)).plus(
        investmentValueWithCurrencyEffect
      );
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
    let grossPerformanceWithCurrencyEffect = new Big(0);
    let hasErrors = false;
    let netPerformance = new Big(0);
    let netPerformanceWithCurrencyEffect = new Big(0);
    let totalInvestment = new Big(0);
    let totalInvestmentWithCurrencyEffect = new Big(0);
    let totalTimeWeightedInvestment = new Big(0);
    let totalTimeWeightedInvestmentWithCurrencyEffect = new Big(0);

    for (const currentPosition of positions) {
      if (
        currentPosition.investment &&
        currentPosition.marketPriceInBaseCurrency
      ) {
        currentValue = currentValue.plus(
          new Big(currentPosition.marketPriceInBaseCurrency).mul(
            currentPosition.quantity
          )
        );
      } else {
        hasErrors = true;
      }

      if (currentPosition.investment) {
        totalInvestment = totalInvestment.plus(currentPosition.investment);

        totalInvestmentWithCurrencyEffect =
          totalInvestmentWithCurrencyEffect.plus(
            currentPosition.investmentWithCurrencyEffect
          );
      } else {
        hasErrors = true;
      }

      if (currentPosition.grossPerformance !== null) {
        grossPerformance = grossPerformance.plus(
          currentPosition.grossPerformance
        );

        grossPerformanceWithCurrencyEffect =
          grossPerformanceWithCurrencyEffect.plus(
            currentPosition.grossPerformanceWithCurrencyEffect
          );

        netPerformance = netPerformance.plus(currentPosition.netPerformance);

        netPerformanceWithCurrencyEffect =
          netPerformanceWithCurrencyEffect.plus(
            currentPosition.netPerformanceWithCurrencyEffect
          );
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
      grossPerformanceWithCurrencyEffect,
      hasErrors,
      netPerformance,
      netPerformanceWithCurrencyEffect,
      totalInvestment,
      totalInvestmentWithCurrencyEffect,
      netPerformancePercentage: totalTimeWeightedInvestment.eq(0)
        ? new Big(0)
        : netPerformance.div(totalTimeWeightedInvestment),
      netPerformancePercentageWithCurrencyEffect:
        totalTimeWeightedInvestmentWithCurrencyEffect.eq(0)
          ? new Big(0)
          : netPerformanceWithCurrencyEffect.div(
              totalTimeWeightedInvestmentWithCurrencyEffect
            ),
      grossPerformancePercentage: totalTimeWeightedInvestment.eq(0)
        ? new Big(0)
        : grossPerformance.div(totalTimeWeightedInvestment),
      grossPerformancePercentageWithCurrencyEffect:
        totalTimeWeightedInvestmentWithCurrencyEffect.eq(0)
          ? new Big(0)
          : grossPerformanceWithCurrencyEffect.div(
              totalTimeWeightedInvestmentWithCurrencyEffect
            )
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

  private getSymbolMetrics({
    end,
    exchangeRates,
    isChartMode = false,
    marketSymbolMap,
    start,
    step = 1,
    symbol
  }: {
    end: Date;
    exchangeRates: { [dateString: string]: number };
    isChartMode?: boolean;
    marketSymbolMap: {
      [date: string]: { [symbol: string]: Big };
    };
    start: Date;
    step?: number;
    symbol: string;
  }): SymbolMetrics {
    const currentExchangeRate = exchangeRates[format(new Date(), DATE_FORMAT)];
    const currentValues: { [date: string]: Big } = {};
    const currentValuesWithCurrencyEffect: { [date: string]: Big } = {};
    let fees = new Big(0);
    let feesAtStartDate = new Big(0);
    let feesAtStartDateWithCurrencyEffect = new Big(0);
    let feesWithCurrencyEffect = new Big(0);
    let grossPerformance = new Big(0);
    let grossPerformanceWithCurrencyEffect = new Big(0);
    let grossPerformanceAtStartDate = new Big(0);
    let grossPerformanceAtStartDateWithCurrencyEffect = new Big(0);
    let grossPerformanceFromSells = new Big(0);
    let grossPerformanceFromSellsWithCurrencyEffect = new Big(0);
    let initialValue: Big;
    let initialValueWithCurrencyEffect: Big;
    let investmentAtStartDate: Big;
    let investmentAtStartDateWithCurrencyEffect: Big;
    const investmentValuesAccumulated: { [date: string]: Big } = {};
    const investmentValuesAccumulatedWithCurrencyEffect: {
      [date: string]: Big;
    } = {};
    const investmentValuesWithCurrencyEffect: { [date: string]: Big } = {};
    let lastAveragePrice = new Big(0);
    let lastAveragePriceWithCurrencyEffect = new Big(0);
    const netPerformanceValues: { [date: string]: Big } = {};
    const netPerformanceValuesWithCurrencyEffect: { [date: string]: Big } = {};
    const timeWeightedInvestmentValues: { [date: string]: Big } = {};

    const timeWeightedInvestmentValuesWithCurrencyEffect: {
      [date: string]: Big;
    } = {};

    let totalInvestment = new Big(0);
    let totalInvestmentWithCurrencyEffect = new Big(0);
    let totalInvestmentWithGrossPerformanceFromSell = new Big(0);

    let totalInvestmentWithGrossPerformanceFromSellWithCurrencyEffect = new Big(
      0
    );

    let totalUnits = new Big(0);
    let valueAtStartDate: Big;
    let valueAtStartDateWithCurrencyEffect: Big;

    // Clone orders to keep the original values in this.orders
    let orders: PortfolioOrderItem[] = cloneDeep(this.orders).filter(
      (order) => {
        return order.symbol === symbol;
      }
    );

    if (orders.length <= 0) {
      return {
        currentValues: {},
        currentValuesWithCurrencyEffect: {},
        grossPerformance: new Big(0),
        grossPerformancePercentage: new Big(0),
        grossPerformancePercentageWithCurrencyEffect: new Big(0),
        grossPerformanceWithCurrencyEffect: new Big(0),
        hasErrors: false,
        initialValue: new Big(0),
        initialValueWithCurrencyEffect: new Big(0),
        investmentValuesAccumulated: {},
        investmentValuesAccumulatedWithCurrencyEffect: {},
        investmentValuesWithCurrencyEffect: {},
        netPerformance: new Big(0),
        netPerformancePercentage: new Big(0),
        netPerformancePercentageWithCurrencyEffect: new Big(0),
        netPerformanceValues: {},
        netPerformanceValuesPercentage: {},
        netPerformanceValuesWithCurrencyEffect: {},
        netPerformanceWithCurrencyEffect: new Big(0),
        timeWeightedInvestment: new Big(0),
        timeWeightedInvestmentValues: {},
        timeWeightedInvestmentValuesWithCurrencyEffect: {},
        timeWeightedInvestmentWithCurrencyEffect: new Big(0),
        totalInvestment: new Big(0),
        totalInvestmentWithCurrencyEffect: new Big(0)
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
        currentValues: {},
        currentValuesWithCurrencyEffect: {},
        grossPerformance: new Big(0),
        grossPerformancePercentage: new Big(0),
        grossPerformancePercentageWithCurrencyEffect: new Big(0),
        grossPerformanceWithCurrencyEffect: new Big(0),
        hasErrors: true,
        initialValue: new Big(0),
        initialValueWithCurrencyEffect: new Big(0),
        investmentValuesAccumulated: {},
        investmentValuesAccumulatedWithCurrencyEffect: {},
        investmentValuesWithCurrencyEffect: {},
        netPerformance: new Big(0),
        netPerformancePercentage: new Big(0),
        grossPerformance: new Big(0),
        grossPerformancePercentage: new Big(0),
        netPerformancePercentageWithCurrencyEffect: new Big(0),
        netPerformanceValues: {},
        netPerformanceValuesWithCurrencyEffect: {},
        netPerformanceWithCurrencyEffect: new Big(0),
        timeWeightedInvestment: new Big(0),
        timeWeightedInvestmentValues: {},
        timeWeightedInvestmentValuesWithCurrencyEffect: {},
        timeWeightedInvestmentWithCurrencyEffect: new Big(0),
        totalInvestment: new Big(0),
        totalInvestmentWithCurrencyEffect: new Big(0)
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
    const currentValues: { [date: string]: Big } = {};
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

      totalInvestmentWithGrossPerformanceFromSellWithCurrencyEffect =
        totalInvestmentWithGrossPerformanceFromSellWithCurrencyEffect
          .plus(transactionInvestmentWithCurrencyEffect)
          .plus(grossPerformanceFromSellWithCurrencyEffect);

      totalInvestmentWithGrossPerformanceFromSellWithCurrencyEffect =
        totalInvestmentWithGrossPerformanceFromSellWithCurrencyEffect
          .plus(transactionInvestmentWithCurrencyEffect)
          .plus(grossPerformanceFromSellWithCurrencyEffect);

      lastAveragePrice = totalUnits.eq(0)
        ? new Big(0)
        : totalInvestmentWithGrossPerformanceFromSell.div(totalUnits);

      lastAveragePriceWithCurrencyEffect = totalUnits.eq(0)
        ? new Big(0)
        : totalInvestmentWithGrossPerformanceFromSellWithCurrencyEffect.div(
            totalUnits
          );

      if (PortfolioCalculator.ENABLE_LOGGING) {
        console.log(
          'totalInvestmentWithGrossPerformanceFromSell',
          totalInvestmentWithGrossPerformanceFromSell.toNumber()
        );
        console.log(
          'totalInvestmentWithGrossPerformanceFromSellWithCurrencyEffect',
          totalInvestmentWithGrossPerformanceFromSellWithCurrencyEffect.toNumber()
        );
        console.log(
          'grossPerformanceFromSells',
          grossPerformanceFromSells.toNumber()
        );
        console.log(
          'grossPerformanceFromSellWithCurrencyEffect',
          grossPerformanceFromSellWithCurrencyEffect.toNumber()
        );
      }

      const newGrossPerformance = valueOfInvestment
        .minus(totalInvestment)
        .plus(grossPerformanceFromSells);

      const newGrossPerformanceWithCurrencyEffect =
        valueOfInvestmentWithCurrencyEffect
          .minus(totalInvestmentWithCurrencyEffect)
          .plus(grossPerformanceFromSellsWithCurrencyEffect);

      grossPerformance = newGrossPerformance;

      grossPerformanceWithCurrencyEffect =
        newGrossPerformanceWithCurrencyEffect;

      if (order.itemType === 'start') {
        feesAtStartDate = fees;
        feesAtStartDateWithCurrencyEffect = feesWithCurrencyEffect;
        grossPerformanceAtStartDate = grossPerformance;

        grossPerformanceAtStartDateWithCurrencyEffect =
          grossPerformanceWithCurrencyEffect;
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
        this.needsStakeHandling(order, marketSymbolMap, previousOrder)
      ) {
        this.stakeHandling(
          previousOrder,
          marketSymbolMap,
          netPerformanceValuesPercentage,
          order
        );
      } else if (previousOrder.unitPrice.toNumber()) {
        netPerformanceValuesPercentage[order.date] = new Big(-1);
      } else if (
        this.ispreviousOrderStakeAndHasInformation(
          previousOrder,
          marketSymbolMap
        )
      ) {
        this.handleIfPreviousOrderIsStake(
          netPerformanceValuesPercentage,
          order,
          marketSymbolMap,
          previousOrder
        );
      } else {
        netPerformanceValuesPercentage[order.date] = new Big(0);
      }
    }
  }

  private handleIfPreviousOrderIsStake(
    netPerformanceValuesPercentage: { [date: string]: Big },
    order: PortfolioOrderItem,
    marketSymbolMap: { [date: string]: { [symbol: string]: Big } },
    previousOrder: PortfolioOrderItem
  ) {
    netPerformanceValuesPercentage[order.date] = order.unitPrice
      .div(marketSymbolMap[previousOrder.date][previousOrder.symbol])
      .minus(1);
  }

  private stakeHandling(
    previousOrder: PortfolioOrderItem,
    marketSymbolMap: { [date: string]: { [symbol: string]: Big } },
    netPerformanceValuesPercentage: { [date: string]: Big },
    order: PortfolioOrderItem
  ) {
    let previousUnitPrice =
      previousOrder.type === 'STAKE'
        ? marketSymbolMap[previousOrder.date][previousOrder.symbol]
        : previousOrder.unitPrice;
    netPerformanceValuesPercentage[order.date] = marketSymbolMap[order.date][
      order.symbol
    ]
      ? marketSymbolMap[order.date][order.symbol]
          .div(previousUnitPrice)
          .minus(1)
      : new Big(0);
  }

  private ispreviousOrderStakeAndHasInformation(
    previousOrder: PortfolioOrderItem,
    marketSymbolMap: { [date: string]: { [symbol: string]: Big } }
  ) {
    return (
      previousOrder.type === 'STAKE' &&
      marketSymbolMap[previousOrder.date] &&
      marketSymbolMap[previousOrder.date][previousOrder.symbol]?.toNumber()
    );
  }

  private needsStakeHandling(
    order: PortfolioOrderItem,
    marketSymbolMap: { [date: string]: { [symbol: string]: Big } },
    previousOrder: PortfolioOrderItem
  ) {
    return (
      order.type === 'STAKE' &&
      previousOrder &&
      marketSymbolMap[order.date] &&
      marketSymbolMap[previousOrder.date] &&
      ((marketSymbolMap[previousOrder.date][previousOrder.symbol]?.toNumber() &&
        previousOrder.type === 'STAKE') ||
        (previousOrder.type !== 'STAKE' && previousOrder.unitPrice?.toNumber()))
    );
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
        Total investment: ${totalInvestment.toFixed(2)}
        Total investment with currency effect: ${totalInvestmentWithCurrencyEffect.toFixed(
          2
        )}
        Time weighted investment with currency effect: ${timeWeightedAverageInvestmentBetweenStartAndEndDateWithCurrencyEffect.toFixed(
          2
        )}
        Gross performance: ${totalGrossPerformance.toFixed(
          2
        )} / ${grossPerformancePercentage.mul(100).toFixed(2)}%
        Gross performance with currency effect: ${totalGrossPerformanceWithCurrencyEffect.toFixed(
          2
        )} / ${grossPerformancePercentageWithCurrencyEffect
          .mul(100)
          .toFixed(2)}%
        Fees per unit: ${feesPerUnit.toFixed(2)}
        Fees per unit with currency effect: ${feesPerUnitWithCurrencyEffect.toFixed(
          2
        )}
        Net performance: ${totalNetPerformance.toFixed(
          2
        )} / ${netPerformancePercentage.mul(100).toFixed(2)}%
        Net performance with currency effect: ${totalNetPerformanceWithCurrencyEffect.toFixed(
          2
        )} / ${netPerformancePercentageWithCurrencyEffect.mul(100).toFixed(2)}%`
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
