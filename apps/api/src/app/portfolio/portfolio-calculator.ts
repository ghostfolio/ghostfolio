import { LogPerformance } from '@ghostfolio/api/aop/logging.interceptor';
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
  differenceInDays,
  endOfDay,
  format,
  isBefore,
  isAfter,
  isSameDay,
  subDays
} from 'date-fns';
import {
  cloneDeep,
  first,
  flowRight,
  isNumber,
  last,
  sortBy,
  uniq
} from 'lodash';

import { CurrentRateService } from './current-rate.service';
import { CurrentPositions } from './interfaces/current-positions.interface';
import { GetValueObject } from './interfaces/get-value-object.interface';
import {
  PortfolioOrderItem,
  WithCurrencyEffect
} from './interfaces/portfolio-calculator.interface';
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

  @LogPerformance
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

  @LogPerformance
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

  @LogPerformance
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

  @LogPerformance
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

  @LogPerformance
  public async getChartData({
    start,
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

    if (!marketSymbols?.length) {
      return [];
    }

    this.populateMarketSymbolMap(marketSymbols, marketSymbolMap);

    const accumulatedValuesByDate: {
      [date: string]: {
        investmentValueWithCurrencyEffect: Big;
        totalCurrentValue: Big;
        totalCurrentValueWithCurrencyEffect: Big;
        totalInvestmentValue: Big;
        totalInvestmentValueWithCurrencyEffect: Big;
        totalNetPerformanceValue: Big;
        totalNetPerformanceValueWithCurrencyEffect: Big;
        totalTimeWeightedInvestmentValue: Big;
        totalTimeWeightedInvestmentValueWithCurrencyEffect: Big;
        totalTimeWeightedPerformance: Big;
      };
    } = {};

    const valuesBySymbol: {
      [symbol: string]: {
        currentValues: { [date: string]: Big };
        currentValuesWithCurrencyEffect: { [date: string]: Big };
        investmentValuesAccumulated: { [date: string]: Big };
        investmentValuesAccumulatedWithCurrencyEffect: { [date: string]: Big };
        investmentValuesWithCurrencyEffect: { [date: string]: Big };
        netPerformanceValues: { [date: string]: Big };
        netPerformanceValuesWithCurrencyEffect: { [date: string]: Big };
        timeWeightedInvestmentValues: { [date: string]: Big };
        timeWeightedInvestmentValuesWithCurrencyEffect: { [date: string]: Big };
        netPerformanceValuesPercentage: { [date: string]: Big };
        unitPrices: { [date: string]: Big };
      };
    } = {};

    let exchangeRatesByCurrency =
      await this.exchangeRateDataService.getExchangeRatesByCurrency({
        currencies: uniq(Object.values(currencies)),
        endDate: endOfDay(end),
        startDate: parseDate(this.transactionPoints?.[0]?.date),
        targetCurrency: this.currency
      });

    this.populateSymbolMetrics(
      symbols,
      end,
      marketSymbolMap,
      start,
      step,
      exchangeRatesByCurrency,
      valuesBySymbol,
      currencies
    );

    return dates.map((date: Date, index: number, dates: Date[]) => {
      let previousDate: Date = index > 0 ? dates[index - 1] : null;
      return this.calculatePerformance(
        date,
        previousDate,
        valuesBySymbol,
        calculateTimeWeightedPerformance,
        accumulatedValuesByDate
      );
    });
  }

  @LogPerformance
  private calculatePerformance(
    date: Date,
    previousDate: Date,
    valuesBySymbol: {
      [symbol: string]: {
        currentValues: { [date: string]: Big };
        currentValuesWithCurrencyEffect: { [date: string]: Big };
        investmentValuesAccumulated: { [date: string]: Big };
        investmentValuesAccumulatedWithCurrencyEffect: { [date: string]: Big };
        investmentValuesWithCurrencyEffect: { [date: string]: Big };
        netPerformanceValues: { [date: string]: Big };
        netPerformanceValuesWithCurrencyEffect: { [date: string]: Big };
        timeWeightedInvestmentValues: { [date: string]: Big };
        timeWeightedInvestmentValuesWithCurrencyEffect: { [date: string]: Big };
        netPerformanceValuesPercentage: { [date: string]: Big };
        unitPrices: { [date: string]: Big };
      };
    },
    calculateTimeWeightedPerformance: boolean,
    accumulatedValuesByDate: {
      [date: string]: {
        investmentValueWithCurrencyEffect: Big;
        totalCurrentValue: Big;
        totalCurrentValueWithCurrencyEffect: Big;
        totalInvestmentValue: Big;
        totalInvestmentValueWithCurrencyEffect: Big;
        totalNetPerformanceValue: Big;
        totalNetPerformanceValueWithCurrencyEffect: Big;
        totalTimeWeightedInvestmentValue: Big;
        totalTimeWeightedInvestmentValueWithCurrencyEffect: Big;
        totalTimeWeightedPerformance: Big;
      };
    }
  ) {
    const dateString = format(date, DATE_FORMAT);
    const previousDateString = previousDate
      ? format(previousDate, DATE_FORMAT)
      : null;
    let totalCurrentValue = new Big(0);
    let previousTotalInvestmentValue = new Big(0);

    if (calculateTimeWeightedPerformance && previousDateString) {
      previousTotalInvestmentValue =
        accumulatedValuesByDate[previousDateString].totalCurrentValue;
    }

    for (const symbol of Object.keys(valuesBySymbol)) {
      const symbolValues = valuesBySymbol[symbol];
      const symbolCurrentValues =
        symbolValues.currentValues?.[dateString] ?? new Big(0);

      totalCurrentValue = totalCurrentValue.plus(symbolCurrentValues);

      let timeWeightedPerformanceContribution = new Big(0);

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
          symbolValues.unitPrices?.[dateString] &&
          symbolValues.unitPrices?.[previousDateString]
            ? symbolValues.unitPrices[dateString]
                .div(symbolValues.unitPrices[previousDateString])
                .minus(1)
            : new Big(0);
        timeWeightedPerformanceContribution = previousValue
          .div(previousTotalInvestmentValue)
          .mul(netPerformance);
      }
      accumulatedValuesByDate = this.accumulatedValuesByDate(
        valuesBySymbol,
        symbol,
        dateString,
        accumulatedValuesByDate,
        timeWeightedPerformanceContribution
      );
    }

    const {
      investmentValueWithCurrencyEffect,
      totalCurrentValueWithCurrencyEffect,
      totalInvestmentValueWithCurrencyEffect,
      totalNetPerformanceValueWithCurrencyEffect,
      totalTimeWeightedInvestmentValue,
      totalTimeWeightedInvestmentValueWithCurrencyEffect,
      totalInvestmentValue,
      totalTimeWeightedPerformance,
      totalNetPerformanceValue
    } = accumulatedValuesByDate[dateString];

    let totalNetTimeWeightedPerformance = new Big(0);

    if (previousDateString) {
      totalNetTimeWeightedPerformance = (
        accumulatedValuesByDate[previousDateString]
          ?.totalTimeWeightedPerformance ?? new Big(0)
      )
        .plus(1)
        .mul(totalTimeWeightedPerformance.plus(1))
        .minus(1)
        .mul(100);
    }

    const netPerformanceInPercentage = totalTimeWeightedInvestmentValue.eq(0)
      ? 0
      : totalNetPerformanceValue
          .div(totalTimeWeightedInvestmentValue)
          .mul(100)
          .toNumber();

    const netPerformanceInPercentageWithCurrencyEffect =
      totalTimeWeightedInvestmentValueWithCurrencyEffect.eq(0)
        ? 0
        : totalNetPerformanceValueWithCurrencyEffect
            .div(totalTimeWeightedInvestmentValueWithCurrencyEffect)
            .mul(100)
            .toNumber();

    return {
      date: dateString,
      netPerformanceInPercentage,
      netPerformanceInPercentageWithCurrencyEffect,
      netPerformance: totalNetPerformanceValue.toNumber(),
      totalInvestment: totalInvestmentValue.toNumber(),
      value: totalCurrentValue.toNumber(),
      valueWithCurrencyEffect: totalCurrentValueWithCurrencyEffect.toNumber(),
      timeWeightedPerformance: totalNetTimeWeightedPerformance.toNumber(),
      investmentValueWithCurrencyEffect:
        investmentValueWithCurrencyEffect.toNumber(),
      netPerformanceWithCurrencyEffect:
        totalNetPerformanceValueWithCurrencyEffect.toNumber(),
      totalInvestmentValueWithCurrencyEffect:
        totalInvestmentValueWithCurrencyEffect.toNumber()
    };
  }

  @LogPerformance
  private accumulatedValuesByDate(
    valuesBySymbol: {
      [symbol: string]: {
        currentValues: { [date: string]: Big };
        currentValuesWithCurrencyEffect: { [date: string]: Big };
        investmentValuesAccumulated: { [date: string]: Big };
        investmentValuesAccumulatedWithCurrencyEffect: { [date: string]: Big };
        investmentValuesWithCurrencyEffect: { [date: string]: Big };
        netPerformanceValues: { [date: string]: Big };
        netPerformanceValuesWithCurrencyEffect: { [date: string]: Big };
        timeWeightedInvestmentValues: { [date: string]: Big };
        timeWeightedInvestmentValuesWithCurrencyEffect: { [date: string]: Big };
        netPerformanceValuesPercentage: { [date: string]: Big };
      };
    },
    symbol: string,
    dateString: string,
    accumulatedValuesByDate: {
      [date: string]: {
        investmentValueWithCurrencyEffect: Big;
        totalCurrentValue: Big;
        totalCurrentValueWithCurrencyEffect: Big;
        totalInvestmentValue: Big;
        totalInvestmentValueWithCurrencyEffect: Big;
        totalNetPerformanceValue: Big;
        totalNetPerformanceValueWithCurrencyEffect: Big;
        totalTimeWeightedInvestmentValue: Big;
        totalTimeWeightedInvestmentValueWithCurrencyEffect: Big;
        totalTimeWeightedPerformance: Big;
      };
    },
    timeWeightedPerformance: Big
  ) {
    const symbolValues = valuesBySymbol[symbol];

    const currentValue = symbolValues.currentValues?.[dateString] ?? new Big(0);

    const currentValueWithCurrencyEffect =
      symbolValues.currentValuesWithCurrencyEffect?.[dateString] ?? new Big(0);

    const investmentValueAccumulated =
      symbolValues.investmentValuesAccumulated?.[dateString] ?? new Big(0);

    const investmentValueAccumulatedWithCurrencyEffect =
      symbolValues.investmentValuesAccumulatedWithCurrencyEffect?.[
        dateString
      ] ?? new Big(0);

    const investmentValueWithCurrencyEffect =
      symbolValues.investmentValuesWithCurrencyEffect?.[dateString] ??
      new Big(0);

    const netPerformanceValue =
      symbolValues.netPerformanceValues?.[dateString] ?? new Big(0);

    const netPerformanceValueWithCurrencyEffect =
      symbolValues.netPerformanceValuesWithCurrencyEffect?.[dateString] ??
      new Big(0);

    const timeWeightedInvestmentValue =
      symbolValues.timeWeightedInvestmentValues?.[dateString] ?? new Big(0);

    const timeWeightedInvestmentValueWithCurrencyEffect =
      symbolValues.timeWeightedInvestmentValuesWithCurrencyEffect?.[
        dateString
      ] ?? new Big(0);

    accumulatedValuesByDate[dateString] = {
      investmentValueWithCurrencyEffect: (
        accumulatedValuesByDate[dateString]
          ?.investmentValueWithCurrencyEffect ?? new Big(0)
      ).add(investmentValueWithCurrencyEffect),
      totalCurrentValue: (
        accumulatedValuesByDate[dateString]?.totalCurrentValue ?? new Big(0)
      ).add(currentValue),
      totalCurrentValueWithCurrencyEffect: (
        accumulatedValuesByDate[dateString]
          ?.totalCurrentValueWithCurrencyEffect ?? new Big(0)
      ).add(currentValueWithCurrencyEffect),
      totalInvestmentValue: (
        accumulatedValuesByDate[dateString]?.totalInvestmentValue ?? new Big(0)
      ).add(investmentValueAccumulated),
      totalInvestmentValueWithCurrencyEffect: (
        accumulatedValuesByDate[dateString]
          ?.totalInvestmentValueWithCurrencyEffect ?? new Big(0)
      ).add(investmentValueAccumulatedWithCurrencyEffect),
      totalNetPerformanceValue: (
        accumulatedValuesByDate[dateString]?.totalNetPerformanceValue ??
        new Big(0)
      ).add(netPerformanceValue),
      totalNetPerformanceValueWithCurrencyEffect: (
        accumulatedValuesByDate[dateString]
          ?.totalNetPerformanceValueWithCurrencyEffect ?? new Big(0)
      ).add(netPerformanceValueWithCurrencyEffect),
      totalTimeWeightedInvestmentValue: (
        accumulatedValuesByDate[dateString]?.totalTimeWeightedInvestmentValue ??
        new Big(0)
      ).add(timeWeightedInvestmentValue),
      totalTimeWeightedInvestmentValueWithCurrencyEffect: (
        accumulatedValuesByDate[dateString]
          ?.totalTimeWeightedInvestmentValueWithCurrencyEffect ?? new Big(0)
      ).add(timeWeightedInvestmentValueWithCurrencyEffect),
      totalTimeWeightedPerformance: (
        accumulatedValuesByDate[dateString]?.totalTimeWeightedPerformance ??
        new Big(0)
      ).add(timeWeightedPerformance)
    };

    return accumulatedValuesByDate;
  }

  @LogPerformance
  private populateSymbolMetrics(
    symbols: { [symbol: string]: boolean },
    end: Date,
    marketSymbolMap: { [date: string]: { [symbol: string]: Big } },
    start: Date,
    step: number,
    exchangeRatesByCurrency,
    valuesBySymbol: {
      [symbol: string]: {
        currentValues: { [date: string]: Big };
        currentValuesWithCurrencyEffect: { [date: string]: Big };
        investmentValuesAccumulated: { [date: string]: Big };
        investmentValuesAccumulatedWithCurrencyEffect: { [date: string]: Big };
        investmentValuesWithCurrencyEffect: { [date: string]: Big };
        netPerformanceValues: { [date: string]: Big };
        netPerformanceValuesWithCurrencyEffect: { [date: string]: Big };
        timeWeightedInvestmentValues: { [date: string]: Big };
        timeWeightedInvestmentValuesWithCurrencyEffect: { [date: string]: Big };
        netPerformanceValuesPercentage: { [date: string]: Big };
        unitPrices: { [date: string]: Big };
      };
    },
    currencies: { [symbol: string]: string }
  ) {
    for (const symbol of Object.keys(symbols)) {
      const {
        currentValues,
        currentValuesWithCurrencyEffect,
        investmentValuesAccumulated,
        investmentValuesAccumulatedWithCurrencyEffect,
        investmentValuesWithCurrencyEffect,
        netPerformanceValues,
        netPerformanceValuesWithCurrencyEffect,
        timeWeightedInvestmentValues,
        timeWeightedInvestmentValuesWithCurrencyEffect,
        netPerformanceValuesPercentage,
        unitPrices
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
        netPerformanceValuesWithCurrencyEffect,
        timeWeightedInvestmentValues,
        timeWeightedInvestmentValuesWithCurrencyEffect,
        netPerformanceValuesPercentage,
        unitPrices
      };
    }
  }

  @LogPerformance
  private populateMarketSymbolMap(
    marketSymbols: GetValueObject[],
    marketSymbolMap: { [date: string]: { [symbol: string]: Big } }
  ) {
    for (const marketSymbol of marketSymbols) {
      const dateString = format(marketSymbol.date, DATE_FORMAT);
      if (!marketSymbolMap[dateString]) {
        marketSymbolMap[dateString] = {};
      }
      if (marketSymbol.marketPrice) {
        marketSymbolMap[dateString][marketSymbol.symbol] = new Big(
          marketSymbol.marketPrice
        );
      }
    }
  }

  @LogPerformance
  private async getInformationFromCurrentRateService(
    currencies: { [symbol: string]: string },
    dataGatheringItems: IDataGatheringItem[],
    dates: Date[]
  ): Promise<{
    dataProviderInfos: DataProviderInfo[];
    values: GetValueObject[];
  }> {
    return await this.currentRateService.getValues({
      dataGatheringItems,
      dateQuery: {
        in: dates
      }
    });
  }

  @LogPerformance
  private pushDataGatheringsSymbols(
    transactionPointsBeforeEndDate: TransactionPoint[],
    firstIndex: number,
    dataGatheringItems: IDataGatheringItem[],
    currencies: { [symbol: string]: string },
    symbols: { [symbol: string]: boolean }
  ) {
    if (transactionPointsBeforeEndDate.length > 0) {
      for (const item of transactionPointsBeforeEndDate[firstIndex - 1].items) {
        dataGatheringItems.push({
          dataSource: item.dataSource,
          symbol: item.symbol
        });
        currencies[item.symbol] = item.currency;
        symbols[item.symbol] = true;
      }
    }
  }

  @LogPerformance
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

  @LogPerformance
  public async getCurrentPositions(
    start: Date,
    end = new Date(Date.now()),
    calculatePerformance = true
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
        symbol: item.symbol,
        calculatePerformance
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

  @LogPerformance
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

  @LogPerformance
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

    return Object.keys(groupedData).map((dateGroup) => ({
      date: groupBy === 'month' ? `${dateGroup}-01` : `${dateGroup}-01-01`,
      investment: groupedData[dateGroup].toNumber()
    }));
  }

  @LogPerformance
  private calculateOverallPerformance(positions: TimelinePosition[]) {
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

      if (currentPosition.grossPerformance) {
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

      if (currentPosition.timeWeightedInvestment) {
        totalTimeWeightedInvestment = totalTimeWeightedInvestment.plus(
          currentPosition.timeWeightedInvestment
        );

        totalTimeWeightedInvestmentWithCurrencyEffect =
          totalTimeWeightedInvestmentWithCurrencyEffect.plus(
            currentPosition.timeWeightedInvestmentWithCurrencyEffect
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

  @LogPerformance
  private getSymbolMetrics({
    end,
    exchangeRates,
    isChartMode = false,
    marketSymbolMap,
    start,
    step = 1,
    symbol,
    calculatePerformance = true
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
    calculatePerformance?: boolean;
  }): SymbolMetrics {
    let {
      averagePriceAtStartDate,
      totalUnits,
      totalInvestment,
      investmentAtStartDate,
      valueAtStartDate,
      maxTotalInvestment,
      averagePriceAtEndDate,
      initialValue,
      fees,
      feesAtStartDate,
      lastAveragePrice,
      grossPerformanceFromSells,
      totalInvestmentWithGrossPerformanceFromSell,
      grossPerformance,
      grossPerformanceAtStartDate,
      currentValues,
      netPerformanceValues,
      netPerformanceValuesPercentage,
      investmentValues,
      investmentValuesAccumulated,
      maxInvestmentValues,
      timeWeightedInvestmentValues
    }: {
      averagePriceAtStartDate: Big;
      totalUnits: Big;
      totalInvestment: WithCurrencyEffect<Big>;
      investmentAtStartDate: any;
      valueAtStartDate: WithCurrencyEffect<Big>;
      maxTotalInvestment: Big;
      averagePriceAtEndDate: Big;
      initialValue: any;
      fees: WithCurrencyEffect<Big>;
      feesAtStartDate: WithCurrencyEffect<Big>;
      lastAveragePrice: WithCurrencyEffect<Big>;
      grossPerformanceFromSells: WithCurrencyEffect<Big>;
      totalInvestmentWithGrossPerformanceFromSell: WithCurrencyEffect<Big>;
      grossPerformance: WithCurrencyEffect<Big>;
      grossPerformanceAtStartDate: WithCurrencyEffect<Big>;
      currentValues: WithCurrencyEffect<{ [date: string]: Big }>;
      netPerformanceValues: WithCurrencyEffect<{ [date: string]: Big }>;
      netPerformanceValuesPercentage: { [date: string]: Big };
      investmentValues: WithCurrencyEffect<{ [date: string]: Big }>;
      investmentValuesAccumulated: WithCurrencyEffect<{ [date: string]: Big }>;
      maxInvestmentValues: { [date: string]: Big };
      timeWeightedInvestmentValues: WithCurrencyEffect<{ [date: string]: Big }>;
    } = this.InitializeSymbolMetricValues();

    const currentExchangeRate = exchangeRates[format(new Date(), DATE_FORMAT)];

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
        netPerformanceValuesWithCurrencyEffect: {},
        netPerformanceWithCurrencyEffect: new Big(0),
        timeWeightedInvestment: new Big(0),
        timeWeightedInvestmentWithCurrencyEffect: new Big(0),
        timeWeightedInvestmentValues: {},
        timeWeightedInvestmentValuesWithCurrencyEffect: {},
        totalInvestment: new Big(0),
        totalInvestmentWithCurrencyEffect: new Big(0),
        netPerformanceValuesPercentage: {},
        unitPrices: {}
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
        netPerformancePercentageWithCurrencyEffect: new Big(0),
        netPerformanceValues: {},
        netPerformanceValuesWithCurrencyEffect: {},
        netPerformanceWithCurrencyEffect: new Big(0),
        timeWeightedInvestment: new Big(0),
        timeWeightedInvestmentValues: {},
        timeWeightedInvestmentValuesWithCurrencyEffect: {},
        timeWeightedInvestmentWithCurrencyEffect: new Big(0),
        totalInvestment: new Big(0),
        totalInvestmentWithCurrencyEffect: new Big(0),
        netPerformanceValuesPercentage: {},
        unitPrices: {}
      };
    }

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

    const result = this.calculatePerformanceOfSymbol(
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
      feesAtStartDate,
      lastAveragePrice,
      grossPerformanceFromSells,
      totalInvestmentWithGrossPerformanceFromSell,
      grossPerformance,
      grossPerformanceAtStartDate,
      isChartMode,
      currentValues,
      netPerformanceValues,
      netPerformanceValuesPercentage,
      investmentValues,
      investmentValuesAccumulated,
      maxInvestmentValues,
      timeWeightedInvestmentValues,
      unitPriceAtEndDate,
      symbol,
      exchangeRates,
      currentExchangeRate,
      calculatePerformance
    );

    let unitPrices = Object.keys(marketSymbolMap).reduce(
      (obj, date) =>
        (obj = Object.assign(obj, { [date]: marketSymbolMap[date][symbol] })),
      {}
    );

    return {
      currentValues: result.currentValues.Value,
      currentValuesWithCurrencyEffect: result.currentValues.WithCurrencyEffect,
      grossPerformancePercentage: result.grossPerformancePercentage.Value,
      grossPerformancePercentageWithCurrencyEffect:
        result.grossPerformancePercentage.WithCurrencyEffect,
      initialValue: result.initialValue.Value,
      initialValueWithCurrencyEffect: result.initialValue.WithCurrencyEffect,
      investmentValuesWithCurrencyEffect:
        result.investmentValues.WithCurrencyEffect,
      netPerformancePercentage: result.netPerformancePercentage.Value,
      netPerformancePercentageWithCurrencyEffect:
        result.netPerformancePercentage.WithCurrencyEffect,
      netPerformanceValues: result.netPerformanceValues.Value,
      netPerformanceValuesWithCurrencyEffect:
        result.netPerformanceValues.WithCurrencyEffect,
      grossPerformance: result.grossPerformance.Value,
      grossPerformanceWithCurrencyEffect:
        result.grossPerformance.WithCurrencyEffect,
      hasErrors: result.hasErrors,
      netPerformance: result.netPerformance.Value,
      netPerformanceWithCurrencyEffect:
        result.netPerformance.WithCurrencyEffect,
      totalInvestment: result.totalInvestment.Value,
      totalInvestmentWithCurrencyEffect:
        result.totalInvestment.WithCurrencyEffect,
      netPerformanceValuesPercentage: result.netPerformanceValuesPercentage,
      investmentValuesAccumulated: result.investmentValuesAccumulated.Value,
      investmentValuesAccumulatedWithCurrencyEffect:
        result.investmentValuesAccumulated.WithCurrencyEffect,
      timeWeightedInvestmentValues: result.timeWeightedInvestmentValues.Value,
      timeWeightedInvestmentValuesWithCurrencyEffect:
        result.timeWeightedInvestmentValues.WithCurrencyEffect,
      timeWeightedInvestment:
        result.timeWeightedAverageInvestmentBetweenStartAndEndDate.Value,
      timeWeightedInvestmentWithCurrencyEffect:
        result.timeWeightedAverageInvestmentBetweenStartAndEndDate
          .WithCurrencyEffect,
      unitPrices
    };
  }

  private InitializeSymbolMetricValues() {
    const currentValues: WithCurrencyEffect<{ [date: string]: Big }> = {
      Value: {},
      WithCurrencyEffect: {}
    };
    let fees: WithCurrencyEffect<Big> = {
      Value: new Big(0),
      WithCurrencyEffect: new Big(0)
    };
    let feesAtStartDate: WithCurrencyEffect<Big> = {
      Value: new Big(0),
      WithCurrencyEffect: new Big(0)
    };
    let grossPerformance: WithCurrencyEffect<Big> = {
      Value: new Big(0),
      WithCurrencyEffect: new Big(0)
    };
    let grossPerformanceAtStartDate: WithCurrencyEffect<Big> = {
      Value: new Big(0),
      WithCurrencyEffect: new Big(0)
    };
    let grossPerformanceFromSells: WithCurrencyEffect<Big> = {
      Value: new Big(0),
      WithCurrencyEffect: new Big(0)
    };
    let averagePriceAtEndDate = new Big(0);
    let averagePriceAtStartDate = new Big(0);
    const investmentValues: WithCurrencyEffect<{ [date: string]: Big }> = {
      Value: {},
      WithCurrencyEffect: {}
    };
    const maxInvestmentValues: { [date: string]: Big } = {};
    let maxTotalInvestment = new Big(0);
    const netPerformanceValuesPercentage: { [date: string]: Big } = {};
    let initialValue;
    let investmentAtStartDate;
    const investmentValuesAccumulated: WithCurrencyEffect<{
      [date: string]: Big;
    }> = {
      Value: {},
      WithCurrencyEffect: {}
    };
    let lastAveragePrice: WithCurrencyEffect<Big> = {
      Value: new Big(0),
      WithCurrencyEffect: new Big(0)
    };
    const netPerformanceValues: WithCurrencyEffect<{ [date: string]: Big }> = {
      Value: {},
      WithCurrencyEffect: {}
    };
    const timeWeightedInvestmentValues: WithCurrencyEffect<{
      [date: string]: Big;
    }> = {
      Value: {},
      WithCurrencyEffect: {}
    };

    let totalInvestment: WithCurrencyEffect<Big> = {
      Value: new Big(0),
      WithCurrencyEffect: new Big(0)
    };

    let totalInvestmentWithGrossPerformanceFromSell: WithCurrencyEffect<Big> = {
      Value: new Big(0),
      WithCurrencyEffect: new Big(0)
    };

    let totalUnits = new Big(0);
    let valueAtStartDate: WithCurrencyEffect<Big> = {
      Value: new Big(0),
      WithCurrencyEffect: new Big(0)
    };
    return {
      averagePriceAtStartDate,
      totalUnits,
      totalInvestment,
      investmentAtStartDate,
      valueAtStartDate,
      maxTotalInvestment,
      averagePriceAtEndDate,
      initialValue,
      fees,
      feesAtStartDate,
      lastAveragePrice,
      grossPerformanceFromSells,
      totalInvestmentWithGrossPerformanceFromSell,
      grossPerformance,
      grossPerformanceAtStartDate,
      currentValues,
      netPerformanceValues,
      netPerformanceValuesPercentage,
      investmentValues,
      investmentValuesAccumulated,
      maxInvestmentValues,
      timeWeightedInvestmentValues
    };
  }

  @LogPerformance
  private calculatePerformanceOfSymbol(
    orders: PortfolioOrderItem[],
    indexOfStartOrder: number,
    unitPriceAtStartDate: Big,
    averagePriceAtStartDate: Big,
    totalUnits: Big,
    totalInvestment: WithCurrencyEffect<Big>,
    investmentAtStartDate: WithCurrencyEffect<Big>,
    valueAtStartDate: WithCurrencyEffect<Big>,
    maxTotalInvestment: Big,
    indexOfEndOrder: number,
    averagePriceAtEndDate: Big,
    initialValue: WithCurrencyEffect<Big>,
    marketSymbolMap: { [date: string]: { [symbol: string]: Big } },
    fees: WithCurrencyEffect<Big>,
    feesAtStartDate: WithCurrencyEffect<Big>,
    lastAveragePrice: WithCurrencyEffect<Big>,
    grossPerformanceFromSells: WithCurrencyEffect<Big>,
    totalInvestmentWithGrossPerformanceFromSell: WithCurrencyEffect<Big>,
    grossPerformance: WithCurrencyEffect<Big>,
    grossPerformanceAtStartDate: WithCurrencyEffect<Big>,
    isChartMode: boolean,
    currentValues: WithCurrencyEffect<{ [date: string]: Big }>,
    netPerformanceValues: WithCurrencyEffect<{ [date: string]: Big }>,
    netPerformanceValuesPercentage: { [date: string]: Big },
    investmentValues: WithCurrencyEffect<{ [date: string]: Big }>,
    investmentValuesAccumulated: WithCurrencyEffect<{ [date: string]: Big }>,
    maxInvestmentValues: { [date: string]: Big },
    timeWeightedInvestmentValues: WithCurrencyEffect<{ [date: string]: Big }>,
    unitPriceAtEndDate: Big,
    symbol: string,
    exchangeRates: { [dateString: string]: number },
    currentExchangeRate: number,
    calculatePerformance: boolean
  ) {
    let totalInvestmentDays = 0;
    let sumOfTimeWeightedInvestments = {
      Value: new Big(0),
      WithCurrencyEffect: new Big(0)
    };

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
      netPerformanceValuesPercentage,
      totalInvestmentDays
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
      feesAtStartDate,
      indexOfEndOrder,
      marketSymbolMap,
      grossPerformanceFromSells,
      totalInvestmentWithGrossPerformanceFromSell,
      lastAveragePrice,
      grossPerformance,
      grossPerformanceAtStartDate,
      isChartMode,
      currentValues,
      netPerformanceValues,
      netPerformanceValuesPercentage,
      investmentValues,
      investmentValuesAccumulated,
      totalInvestmentDays,
      sumOfTimeWeightedInvestments,
      timeWeightedInvestmentValues,
      exchangeRates,
      currentExchangeRate,
      calculatePerformance
    ));

    if (!calculatePerformance) {
      return {
        currentValues,
        grossPerformancePercentage: {
          Value: new Big(0),
          WithCurrencyEffect: new Big(0)
        },
        initialValue,
        investmentValues,
        maxInvestmentValues,
        netPerformancePercentage: {
          Value: new Big(0),
          WithCurrencyEffect: new Big(0)
        },
        netPerformanceValues,
        grossPerformance: { Value: new Big(0), WithCurrencyEffect: new Big(0) },
        hasErrors: totalUnits.gt(0) && (!initialValue || !unitPriceAtEndDate),
        netPerformance: { Value: new Big(0), WithCurrencyEffect: new Big(0) },
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
        netPerformanceValuesPercentage,
        investmentValuesAccumulated,
        timeWeightedInvestmentValues,
        timeWeightedAverageInvestmentBetweenStartAndEndDate: {
          Value: new Big(0),
          WithCurrencyEffect: new Big(0)
        }
      };
    }

    const totalGrossPerformance = {
      Value: grossPerformance.Value.minus(grossPerformanceAtStartDate.Value),
      WithCurrencyEffect: grossPerformance.WithCurrencyEffect.minus(
        grossPerformanceAtStartDate.WithCurrencyEffect
      )
    };

    const totalNetPerformance = {
      Value: grossPerformance.Value.minus(
        grossPerformanceAtStartDate.Value
      ).minus(fees.Value.minus(feesAtStartDate.Value)),
      WithCurrencyEffect: grossPerformance.WithCurrencyEffect.minus(
        grossPerformanceAtStartDate.WithCurrencyEffect
      ).minus(fees.WithCurrencyEffect.minus(feesAtStartDate.WithCurrencyEffect))
    };

    const maxInvestmentBetweenStartAndEndDate = valueAtStartDate.Value.plus(
      maxTotalInvestment.minus(investmentAtStartDate.Value)
    );

    const timeWeightedAverageInvestmentBetweenStartAndEndDate = {
      Value:
        totalInvestmentDays > 0
          ? sumOfTimeWeightedInvestments.Value.div(totalInvestmentDays)
          : new Big(0),
      WithCurrencyEffect:
        totalInvestmentDays > 0
          ? sumOfTimeWeightedInvestments.WithCurrencyEffect.div(
              totalInvestmentDays
            )
          : new Big(0)
    };

    const grossPerformancePercentage = {
      Value: timeWeightedAverageInvestmentBetweenStartAndEndDate.Value.gt(0)
        ? totalGrossPerformance.Value.div(
            timeWeightedAverageInvestmentBetweenStartAndEndDate.Value
          )
        : new Big(0),
      WithCurrencyEffect:
        timeWeightedAverageInvestmentBetweenStartAndEndDate.WithCurrencyEffect.gt(
          0
        )
          ? totalGrossPerformance.WithCurrencyEffect.div(
              timeWeightedAverageInvestmentBetweenStartAndEndDate.WithCurrencyEffect
            )
          : new Big(0)
    };

    const feesPerUnit = {
      Value: totalUnits.gt(0)
        ? fees.Value.minus(feesAtStartDate.Value).div(totalUnits)
        : new Big(0),
      WithCurrencyEffect: totalUnits.gt(0)
        ? fees.WithCurrencyEffect.minus(feesAtStartDate.WithCurrencyEffect).div(
            totalUnits
          )
        : new Big(0)
    };

    const netPerformancePercentage = this.calculateNetPerformancePercentage(
      timeWeightedAverageInvestmentBetweenStartAndEndDate,
      totalNetPerformance
    );

    this.handleLogging(
      symbol,
      orders,
      indexOfStartOrder,
      unitPriceAtEndDate,
      totalInvestment,
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
      netPerformanceValuesPercentage,
      investmentValuesAccumulated,
      timeWeightedInvestmentValues,
      timeWeightedAverageInvestmentBetweenStartAndEndDate
    };
  }

  @LogPerformance
  private handleOrders(
    orders: PortfolioOrderItem[],
    indexOfStartOrder: number,
    unitPriceAtStartDate: Big,
    averagePriceAtStartDate: Big,
    totalUnits: Big,
    totalInvestment: WithCurrencyEffect<Big>,
    investmentAtStartDate: WithCurrencyEffect<Big>,
    valueAtStartDate: WithCurrencyEffect<Big>,
    maxTotalInvestment: Big,
    averagePriceAtEndDate: Big,
    initialValue: WithCurrencyEffect<Big>,
    fees: WithCurrencyEffect<Big>,
    feesAtStartDate: WithCurrencyEffect<Big>,
    indexOfEndOrder: number,
    marketSymbolMap: { [date: string]: { [symbol: string]: Big } },
    grossPerformanceFromSells: WithCurrencyEffect<Big>,
    totalInvestmentWithGrossPerformanceFromSell: WithCurrencyEffect<Big>,
    lastAveragePrice: WithCurrencyEffect<Big>,
    grossPerformance: WithCurrencyEffect<Big>,
    grossPerformanceAtStartDate: WithCurrencyEffect<Big>,
    isChartMode: boolean,
    currentValues: WithCurrencyEffect<{ [date: string]: Big }>,
    netPerformanceValues: WithCurrencyEffect<{ [date: string]: Big }>,
    netPerformanceValuesPercentage: { [date: string]: Big },
    investmentValues: WithCurrencyEffect<{ [date: string]: Big }>,
    investmentValuesAccumulated: WithCurrencyEffect<{ [date: string]: Big }>,
    totalInvestmentDays: number,
    sumOfTimeWeightedInvestments: WithCurrencyEffect<Big>,
    timeWeightedInvestmentValues: WithCurrencyEffect<{ [date: string]: Big }>,
    exchangeRates: { [dateString: string]: number },
    currentExchangeRate: number,
    calculatePerformance: boolean
  ) {
    for (let i = 0; i < orders.length; i += 1) {
      const order = orders[i];
      const previousOrderDateString = i > 0 ? orders[i - 1].date : '';
      if (calculatePerformance) {
        this.calculateNetPerformancePercentageForDateAndSymbol(
          i,
          orders,
          order,
          netPerformanceValuesPercentage,
          marketSymbolMap
        );
      }

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

      const exchangeRateAtOrderDate = exchangeRates[order.date];

      this.handleFeeAndUnitPriceOfOrder(
        order,
        currentExchangeRate,
        exchangeRateAtOrderDate
      );

      // Calculate the average start price as soon as any units are held
      let transactionInvestment: WithCurrencyEffect<Big>;
      let totalInvestmentBeforeTransaction: WithCurrencyEffect<Big>;

      let valueOfInvestment: WithCurrencyEffect<Big>;
      let valueOfInvestmentBeforeTransaction: WithCurrencyEffect<Big>;
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
        fees,
        totalInvestmentBeforeTransaction,
        valueOfInvestmentBeforeTransaction
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

      if (calculatePerformance) {
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
      }

      lastAveragePrice.Value = totalUnits.eq(0)
        ? new Big(0)
        : totalInvestmentWithGrossPerformanceFromSell.Value.div(totalUnits);

      lastAveragePrice.WithCurrencyEffect = totalUnits.eq(0)
        ? new Big(0)
        : totalInvestmentWithGrossPerformanceFromSell.WithCurrencyEffect.div(
            totalUnits
          );

      if (PortfolioCalculator.ENABLE_LOGGING) {
        console.log(
          'totalInvestmentWithGrossPerformanceFromSell',
          totalInvestmentWithGrossPerformanceFromSell.Value.toNumber()
        );
        console.log(
          'totalInvestmentWithGrossPerformanceFromSellWithCurrencyEffect',
          totalInvestmentWithGrossPerformanceFromSell.WithCurrencyEffect.toNumber()
        );
        console.log(
          'grossPerformanceFromSells',
          grossPerformanceFromSells.Value.toNumber()
        );
        console.log(
          'grossPerformanceFromSellsWithCurrencyEffect',
          grossPerformanceFromSells.WithCurrencyEffect.toNumber()
        );
      }

      if (!calculatePerformance) {
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
          netPerformanceValuesPercentage,
          totalInvestmentDays
        };
      }

      const newGrossPerformance = valueOfInvestment.Value.minus(
        totalInvestment.Value
      ).plus(grossPerformanceFromSells.Value);

      const newGrossPerformanceWithCurrencyEffect =
        valueOfInvestment.WithCurrencyEffect.minus(
          totalInvestment.WithCurrencyEffect
        ).plus(grossPerformanceFromSells.WithCurrencyEffect);

      grossPerformance.Value = newGrossPerformance;

      grossPerformance.WithCurrencyEffect =
        newGrossPerformanceWithCurrencyEffect;

      if (order.itemType === 'start') {
        feesAtStartDate = {
          Value: fees.Value,
          WithCurrencyEffect: fees.WithCurrencyEffect
        };
        grossPerformanceAtStartDate.Value = grossPerformance.Value;

        grossPerformanceAtStartDate.WithCurrencyEffect =
          grossPerformance.WithCurrencyEffect;
      }

      totalInvestmentDays =
        this.calculatePerformancesForDateAndReturnTotalInvestmentDays(
          isChartMode,
          i,
          indexOfStartOrder,
          currentValues,
          order,
          valueOfInvestment,
          valueOfInvestmentBeforeTransaction,
          netPerformanceValues,
          grossPerformance,
          grossPerformanceAtStartDate,
          fees,
          feesAtStartDate,
          investmentValues,
          investmentValuesAccumulated,
          totalInvestment,
          timeWeightedInvestmentValues,
          previousOrderDateString,
          totalInvestmentDays,
          sumOfTimeWeightedInvestments,
          valueAtStartDate,
          investmentAtStartDate,
          totalInvestmentBeforeTransaction,
          transactionInvestment.WithCurrencyEffect
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
      netPerformanceValuesPercentage,
      totalInvestmentDays
    };
  }

  @LogPerformance
  private handleFeeAndUnitPriceOfOrder(
    order: PortfolioOrderItem,
    currentExchangeRate: number,
    exchangeRateAtOrderDate: number
  ) {
    if (order.fee) {
      order.feeInBaseCurrency = order.fee.mul(currentExchangeRate ?? 1);
      order.feeInBaseCurrencyWithCurrencyEffect = order.fee.mul(
        exchangeRateAtOrderDate ?? 1
      );
    }

    if (order.unitPrice) {
      order.unitPriceInBaseCurrency = order.unitPrice.mul(
        currentExchangeRate ?? 1
      );

      order.unitPriceInBaseCurrencyWithCurrencyEffect = order.unitPrice.mul(
        exchangeRateAtOrderDate ?? 1
      );
    }
  }

  @LogPerformance
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

  @LogPerformance
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

  @LogPerformance
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

  @LogPerformance
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

  @LogPerformance
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

  @LogPerformance
  private handleLoggingOfInvestmentMetrics(
    totalInvestment: WithCurrencyEffect<Big>,
    order: PortfolioOrderItem,
    transactionInvestment: WithCurrencyEffect<Big>,
    totalInvestmentWithGrossPerformanceFromSell: WithCurrencyEffect<Big>,
    grossPerformanceFromSells: WithCurrencyEffect<Big>,
    grossPerformance: WithCurrencyEffect<Big>,
    grossPerformanceAtStartDate: WithCurrencyEffect<Big>
  ) {
    if (PortfolioCalculator.ENABLE_LOGGING) {
      console.log('totalInvestment', totalInvestment.Value.toNumber());
      console.log('order.quantity', order.quantity.toNumber());
      console.log(
        'transactionInvestment',
        transactionInvestment.Value.toNumber()
      );
      console.log(
        'totalInvestmentWithGrossPerformanceFromSell',
        totalInvestmentWithGrossPerformanceFromSell.Value.toNumber()
      );
      console.log(
        'grossPerformanceFromSells',
        grossPerformanceFromSells.Value.toNumber()
      );
      console.log('totalInvestment', totalInvestment.Value.toNumber());
      console.log(
        'totalGrossPerformance',
        grossPerformance.Value.minus(
          grossPerformanceAtStartDate.Value
        ).toNumber()
      );
    }
  }

  @LogPerformance
  private calculateNetPerformancePercentage(
    timeWeightedAverageInvestmentBetweenStartAndEndDate: WithCurrencyEffect<Big>,
    totalNetPerformance: WithCurrencyEffect<Big>
  ) {
    return {
      Value: timeWeightedAverageInvestmentBetweenStartAndEndDate.Value.gt(0)
        ? totalNetPerformance.Value.div(
            timeWeightedAverageInvestmentBetweenStartAndEndDate.Value
          )
        : new Big(0),
      WithCurrencyEffect:
        timeWeightedAverageInvestmentBetweenStartAndEndDate.WithCurrencyEffect.gt(
          0
        )
          ? totalNetPerformance.WithCurrencyEffect.div(
              timeWeightedAverageInvestmentBetweenStartAndEndDate.WithCurrencyEffect
            )
          : new Big(0)
    };
  }

  @LogPerformance
  private calculateInvestmentSpecificMetrics(
    averagePriceAtStartDate: Big,
    i: number,
    indexOfStartOrder: number,
    totalUnits: Big,
    totalInvestment: WithCurrencyEffect<Big>,
    order: PortfolioOrderItem,
    investmentAtStartDate: WithCurrencyEffect<Big>,
    valueAtStartDate: WithCurrencyEffect<Big>,
    maxTotalInvestment: Big,
    averagePriceAtEndDate: Big,
    indexOfEndOrder: number,
    initialValue: WithCurrencyEffect<Big>,
    marketSymbolMap: { [date: string]: { [symbol: string]: Big } },
    fees: WithCurrencyEffect<Big>
  ) {
    averagePriceAtStartDate = this.calculateAveragePrice(
      averagePriceAtStartDate,
      i,
      indexOfStartOrder,
      totalUnits,
      totalInvestment.Value
    );

    const totalInvestmentBeforeTransaction = { ...totalInvestment };

    const valueOfInvestmentBeforeTransaction = {
      Value: totalUnits.mul(order.unitPriceInBaseCurrency),
      WithCurrencyEffect: totalUnits.mul(
        order.unitPriceInBaseCurrencyWithCurrencyEffect
      )
    };
    if (!investmentAtStartDate && i >= indexOfStartOrder) {
      investmentAtStartDate = {
        Value: totalInvestment.Value ?? new Big(0),
        WithCurrencyEffect: totalInvestment.WithCurrencyEffect ?? new Big(0)
      };
      valueAtStartDate.Value = valueOfInvestmentBeforeTransaction.Value;
      valueAtStartDate.WithCurrencyEffect =
        valueOfInvestmentBeforeTransaction.WithCurrencyEffect;
    }

    const transactionInvestment = {
      Value: this.getTransactionInvestment(
        order,
        totalUnits,
        totalInvestment.Value
      ),
      WithCurrencyEffect: this.getTransactionInvestment(
        order,
        totalUnits,
        totalInvestment.WithCurrencyEffect,
        true
      )
    };

    totalInvestment.Value = totalInvestment.Value.plus(
      transactionInvestment.Value
    );

    totalInvestment.WithCurrencyEffect =
      totalInvestment.WithCurrencyEffect.plus(
        transactionInvestment.WithCurrencyEffect
      );

    if (
      i >= indexOfStartOrder &&
      totalInvestment.Value.gt(maxTotalInvestment)
    ) {
      maxTotalInvestment = totalInvestment.Value;
    }

    averagePriceAtEndDate = this.calculateAveragePriceAtEnd(
      i,
      indexOfEndOrder,
      totalUnits,
      averagePriceAtEndDate,
      totalInvestment.Value
    );

    initialValue = this.calculateInitialValue(
      i,
      indexOfStartOrder,
      initialValue?.Value,
      valueOfInvestmentBeforeTransaction,
      transactionInvestment,
      order,
      marketSymbolMap,
      initialValue?.WithCurrencyEffect
    );

    fees.Value = fees.Value.plus(order.fee);

    fees.WithCurrencyEffect = fees.WithCurrencyEffect.plus(
      order.feeInBaseCurrencyWithCurrencyEffect ?? 0
    );

    totalUnits = totalUnits.plus(
      order.quantity.mul(this.getFactor(order.type))
    );

    const valueOfInvestment = {
      Value: totalUnits.mul(order.unitPriceInBaseCurrency),
      WithCurrencyEffect: totalUnits.mul(
        order.unitPriceInBaseCurrencyWithCurrencyEffect
      )
    };

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
      fees,
      totalInvestmentBeforeTransaction,
      valueOfInvestmentBeforeTransaction
    };
  }

  @LogPerformance
  private calculatePerformancesForDateAndReturnTotalInvestmentDays(
    isChartMode: boolean,
    i: number,
    indexOfStartOrder: number,
    currentValues: WithCurrencyEffect<{ [date: string]: Big }>,
    order: PortfolioOrderItem,
    valueOfInvestment: WithCurrencyEffect<Big>,
    valueOfInvestmentBeforeTransaction: WithCurrencyEffect<Big>,
    netPerformanceValues: WithCurrencyEffect<{ [date: string]: Big }>,
    grossPerformance: WithCurrencyEffect<Big>,
    grossPerformanceAtStartDate: WithCurrencyEffect<Big>,
    fees: WithCurrencyEffect<Big>,
    feesAtStartDate: WithCurrencyEffect<Big>,
    investmentValues: WithCurrencyEffect<{ [date: string]: Big }>,
    investmentValuesAccumulated: WithCurrencyEffect<{ [date: string]: Big }>,
    totalInvestment: WithCurrencyEffect<Big>,
    timeWeightedInvestmentValues: WithCurrencyEffect<{ [date: string]: Big }>,
    previousOrderDateString: string,
    totalInvestmentDays: number,
    sumOfTimeWeightedInvestments: WithCurrencyEffect<Big>,
    valueAtStartDate: WithCurrencyEffect<Big>,
    investmentAtStartDate: WithCurrencyEffect<Big>,
    totalInvestmentBeforeTransaction: WithCurrencyEffect<Big>,
    transactionInvestmentWithCurrencyEffect: Big
  ): number {
    if (i > indexOfStartOrder) {
      if (valueOfInvestmentBeforeTransaction.Value.gt(0)) {
        // Calculate the number of days since the previous order
        const orderDate = new Date(order.date);
        const previousOrderDate = new Date(previousOrderDateString);

        let daysSinceLastOrder = differenceInDays(orderDate, previousOrderDate);

        // Set to at least 1 day, otherwise the transactions on the same day
        // would not be considered in the time weighted calculation
        if (daysSinceLastOrder <= 0) {
          daysSinceLastOrder = 1;
        }

        // Sum up the total investment days since the start date to calculate
        // the time weighted investment
        totalInvestmentDays += daysSinceLastOrder;

        sumOfTimeWeightedInvestments.Value =
          sumOfTimeWeightedInvestments.Value.add(
            valueAtStartDate.Value.minus(investmentAtStartDate.Value)
              .plus(totalInvestmentBeforeTransaction.Value)
              .mul(daysSinceLastOrder)
          );

        sumOfTimeWeightedInvestments.WithCurrencyEffect =
          sumOfTimeWeightedInvestments.WithCurrencyEffect.add(
            valueAtStartDate.WithCurrencyEffect.minus(
              investmentAtStartDate.WithCurrencyEffect
            )
              .plus(totalInvestmentBeforeTransaction.WithCurrencyEffect)
              .mul(daysSinceLastOrder)
          );
      }

      if (isChartMode) {
        currentValues.Value[order.date] = valueOfInvestment.Value;

        currentValues.WithCurrencyEffect[order.date] =
          valueOfInvestment.WithCurrencyEffect;

        netPerformanceValues.Value[order.date] = grossPerformance.Value.minus(
          grossPerformanceAtStartDate.Value
        ).minus(fees.Value.minus(feesAtStartDate.Value));

        netPerformanceValues.WithCurrencyEffect[order.date] =
          grossPerformance.WithCurrencyEffect.minus(
            grossPerformanceAtStartDate.WithCurrencyEffect
          ).minus(
            fees.WithCurrencyEffect.minus(feesAtStartDate.WithCurrencyEffect)
          );

        investmentValuesAccumulated.Value[order.date] = totalInvestment.Value;

        investmentValuesAccumulated.WithCurrencyEffect[order.date] =
          totalInvestment.WithCurrencyEffect;

        investmentValues.WithCurrencyEffect[order.date] = (
          investmentValues.WithCurrencyEffect[order.date] ?? new Big(0)
        ).add(transactionInvestmentWithCurrencyEffect);

        timeWeightedInvestmentValues.Value[order.date] =
          totalInvestmentDays > 0
            ? sumOfTimeWeightedInvestments.Value.div(totalInvestmentDays)
            : new Big(0);

        timeWeightedInvestmentValues.WithCurrencyEffect[order.date] =
          totalInvestmentDays > 0
            ? sumOfTimeWeightedInvestments.WithCurrencyEffect.div(
                totalInvestmentDays
              )
            : new Big(0);
      }
    }
    return totalInvestmentDays;
  }

  @LogPerformance
  private calculateSellOrders(
    order: PortfolioOrderItem,
    lastAveragePrice: WithCurrencyEffect<Big>,
    grossPerformanceFromSells: WithCurrencyEffect<Big>,
    totalInvestmentWithGrossPerformanceFromSell: WithCurrencyEffect<Big>,
    transactionInvestment: WithCurrencyEffect<Big>
  ) {
    const grossPerformanceFromSell =
      order.type === TypeOfOrder.SELL
        ? order.unitPriceInBaseCurrency
            .minus(lastAveragePrice.Value)
            .mul(order.quantity)
        : new Big(0);

    const grossPerformanceFromSellWithCurrencyEffect =
      order.type === TypeOfOrder.SELL
        ? order.unitPriceInBaseCurrencyWithCurrencyEffect
            .minus(lastAveragePrice.WithCurrencyEffect)
            .mul(order.quantity)
        : new Big(0);

    grossPerformanceFromSells.Value = grossPerformanceFromSells.Value.plus(
      grossPerformanceFromSell
    );

    grossPerformanceFromSells.WithCurrencyEffect =
      grossPerformanceFromSells.WithCurrencyEffect.plus(
        grossPerformanceFromSellWithCurrencyEffect
      );

    totalInvestmentWithGrossPerformanceFromSell.Value =
      totalInvestmentWithGrossPerformanceFromSell.Value.plus(
        transactionInvestment.Value
      ).plus(grossPerformanceFromSell);

    totalInvestmentWithGrossPerformanceFromSell.WithCurrencyEffect =
      totalInvestmentWithGrossPerformanceFromSell.WithCurrencyEffect.plus(
        transactionInvestment.WithCurrencyEffect
      ).plus(grossPerformanceFromSellWithCurrencyEffect);

    return {
      grossPerformanceFromSells,
      totalInvestmentWithGrossPerformanceFromSell
    };
  }

  @LogPerformance
  private calculateInitialValue(
    i: number,
    indexOfStartOrder: number,
    initialValue: Big,
    valueOfInvestmentBeforeTransaction: WithCurrencyEffect<Big>,
    transactionInvestment: WithCurrencyEffect<Big>,
    order: PortfolioOrderItem,
    marketSymbolMap: { [date: string]: { [symbol: string]: Big } },
    initialValueWithCurrencyEffect: Big
  ) {
    if (i >= indexOfStartOrder && !initialValue) {
      if (
        i === indexOfStartOrder &&
        !valueOfInvestmentBeforeTransaction.Value.eq(0)
      ) {
        initialValue = valueOfInvestmentBeforeTransaction.Value;
        initialValueWithCurrencyEffect =
          valueOfInvestmentBeforeTransaction.WithCurrencyEffect;
      } else if (transactionInvestment.Value.gt(0)) {
        initialValue = transactionInvestment.Value;
        initialValueWithCurrencyEffect =
          transactionInvestment.WithCurrencyEffect;
      } else if (order.type === 'STAKE') {
        // For Parachain Rewards or Stock SpinOffs, first transactionInvestment might be 0 if the symbol has been acquired for free
        initialValue = order.quantity.mul(
          marketSymbolMap[order.date]?.[order.symbol] ?? new Big(0)
        );
      }
    }
    return {
      Value: initialValue,
      WithCurrencyEffect: initialValueWithCurrencyEffect
    };
  }

  @LogPerformance
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

  @LogPerformance
  private getTransactionInvestment(
    order: PortfolioOrderItem,
    totalUnits: Big,
    totalInvestment: Big,
    withCurrencyEffect: boolean = false
  ) {
    return order.type === 'BUY' || order.type === 'STAKE'
      ? order.quantity
          .mul(
            withCurrencyEffect
              ? order.unitPriceInBaseCurrencyWithCurrencyEffect
              : order.unitPriceInBaseCurrency
          )
          .mul(this.getFactor(order.type))
      : totalUnits.gt(0)
        ? totalInvestment
            .div(totalUnits)
            .mul(order.quantity)
            .mul(this.getFactor(order.type))
        : new Big(0);
  }

  @LogPerformance
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

  @LogPerformance
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

  @LogPerformance
  private handleLogging(
    symbol: string,
    orders: PortfolioOrderItem[],
    indexOfStartOrder: number,
    unitPriceAtEndDate: Big,
    totalInvestment: WithCurrencyEffect<Big>,
    totalGrossPerformance: WithCurrencyEffect<Big>,
    grossPerformancePercentage: WithCurrencyEffect<Big>,
    feesPerUnit: WithCurrencyEffect<Big>,
    totalNetPerformance: WithCurrencyEffect<Big>,
    netPerformancePercentage: WithCurrencyEffect<Big>
  ) {
    if (PortfolioCalculator.ENABLE_LOGGING) {
      console.log(
        `
        ${symbol}
        Unit price: ${orders[indexOfStartOrder].unitPrice.toFixed(
          2
        )} -> ${unitPriceAtEndDate.toFixed(2)}
        Total investment: ${totalInvestment.Value.toFixed(2)}
        Total investment with currency effect: ${totalInvestment.WithCurrencyEffect.toFixed(
          2
        )}        
        Gross performance: ${totalGrossPerformance.Value.toFixed(
          2
        )} / ${grossPerformancePercentage.Value.mul(100).toFixed(2)}%
        Gross performance with currency effect: ${totalGrossPerformance.WithCurrencyEffect.toFixed(
          2
        )} / ${grossPerformancePercentage.WithCurrencyEffect.mul(100).toFixed(
          2
        )}%
        Fees per unit: ${feesPerUnit.Value.toFixed(2)}
        Fees per unit with currency effect: ${feesPerUnit.WithCurrencyEffect.toFixed(
          2
        )}
        Net performance: ${totalNetPerformance.Value.toFixed(
          2
        )} / ${netPerformancePercentage.Value.mul(100).toFixed(2)}
        Net performance with currency effect: ${totalNetPerformance.WithCurrencyEffect.toFixed(
          2
        )} / ${netPerformancePercentage.WithCurrencyEffect.mul(100).toFixed(2)}%`
      );
    }
  }

  @LogPerformance
  private sortOrdersByTime(orders: PortfolioOrderItem[]) {
    return sortBy(orders, (order) => {
      let sortIndex = new Date(order.date);

      if (order.itemType === 'start') {
        sortIndex = addMilliseconds(sortIndex, -1);
      }

      if (order.itemType === 'end') {
        sortIndex = addMilliseconds(sortIndex, 1);
      }

      return sortIndex.getTime();
    });
  }

  @LogPerformance
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

  @LogPerformance
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

  @LogPerformance
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
}
