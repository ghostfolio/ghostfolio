import { TimelineInfoInterface } from '@ghostfolio/api/app/portfolio/interfaces/timeline-info.interface';
import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.service';
import { IDataGatheringItem } from '@ghostfolio/api/services/interfaces/interfaces';
import { DATE_FORMAT, parseDate, resetHours } from '@ghostfolio/common/helper';
import {
  DataProviderInfo,
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
import {
  cloneDeep,
  first,
  flatten,
  isNumber,
  last,
  sortBy,
  uniq
} from 'lodash';

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
          tags: order.tags,
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
          tags: order.tags,
          transactionCount: 1
        };
      }

      symbols[order.symbol] = currentTransactionPointItem;

      const items = lastTransactionPoint?.items ?? [];
      const newItems = items.filter(
        (transactionPointItem) => transactionPointItem.symbol !== order.symbol
      );
      newItems.push(currentTransactionPointItem);
      newItems.sort((a, b) => {
        return a.symbol?.localeCompare(b.symbol);
      });
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

    const currencies: { [symbol: string]: string } = {};
    const dates: Date[] = [];
    const dataGatheringItems: IDataGatheringItem[] = [];
    const firstIndex = transactionPointsBeforeEndDate.length;

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

    const { dataProviderInfos, values: marketSymbols } =
      await this.currentRateService.getValues({
        dataGatheringItems,
        dateQuery: {
          in: dates
        }
      });

    this.dataProviderInfos = dataProviderInfos;

    const marketSymbolMap: {
      [date: string]: { [symbol: string]: Big };
    } = {};

    let exchangeRatesByCurrency =
      await this.exchangeRateDataService.getExchangeRatesByCurrency({
        currencies: uniq(Object.values(currencies)),
        endDate: endOfDay(end),
        startDate: parseDate(this.transactionPoints?.[0]?.date),
        targetCurrency: this.currency
      });

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

    const accumulatedValuesByDate: {
      [date: string]: {
        totalCurrentValue: Big;
        totalCurrentValueWithCurrencyEffect: Big;
        totalInvestmentValue: Big;
        totalInvestmentValueWithCurrencyEffect: Big;
        totalNetPerformanceValue: Big;
        totalNetPerformanceValueWithCurrencyEffect: Big;
        totalTimeWeightedInvestmentValue: Big;
        totalTimeWeightedInvestmentValueWithCurrencyEffect: Big;
      };
    } = {};

    const valuesBySymbol: {
      [symbol: string]: {
        currentValues: { [date: string]: Big };
        currentValuesWithCurrencyEffect: { [date: string]: Big };
        investmentValues: { [date: string]: Big };
        investmentValuesWithCurrencyEffect: { [date: string]: Big };
        netPerformanceValues: { [date: string]: Big };
        netPerformanceValuesWithCurrencyEffect: { [date: string]: Big };
        timeWeightedInvestmentValues: { [date: string]: Big };
        timeWeightedInvestmentValuesWithCurrencyEffect: { [date: string]: Big };
      };
    } = {};

    for (const symbol of Object.keys(symbols)) {
      const {
        currentValues,
        currentValuesWithCurrencyEffect,
        investmentValues,
        investmentValuesWithCurrencyEffect,
        netPerformanceValues,
        netPerformanceValuesWithCurrencyEffect,
        timeWeightedInvestmentValues,
        timeWeightedInvestmentValuesWithCurrencyEffect
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
        investmentValues,
        investmentValuesWithCurrencyEffect,
        netPerformanceValues,
        netPerformanceValuesWithCurrencyEffect,
        timeWeightedInvestmentValues,
        timeWeightedInvestmentValuesWithCurrencyEffect
      };
    }

    for (const currentDate of dates) {
      const dateString = format(currentDate, DATE_FORMAT);

      for (const symbol of Object.keys(valuesBySymbol)) {
        const symbolValues = valuesBySymbol[symbol];

        const currentValue =
          symbolValues.currentValues?.[dateString] ?? new Big(0);

        const currentValueWithCurrencyEffect =
          symbolValues.currentValuesWithCurrencyEffect?.[dateString] ??
          new Big(0);

        const investmentValue =
          symbolValues.investmentValues?.[dateString] ?? new Big(0);

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
          totalCurrentValue: (
            accumulatedValuesByDate[dateString]?.totalCurrentValue ?? new Big(0)
          ).add(currentValue),
          totalCurrentValueWithCurrencyEffect: (
            accumulatedValuesByDate[dateString]
              ?.totalCurrentValueWithCurrencyEffect ?? new Big(0)
          ).add(currentValueWithCurrencyEffect),
          totalInvestmentValue: (
            accumulatedValuesByDate[dateString]?.totalInvestmentValue ??
            new Big(0)
          ).add(investmentValue),
          totalInvestmentValueWithCurrencyEffect: (
            accumulatedValuesByDate[dateString]
              ?.totalInvestmentValueWithCurrencyEffect ?? new Big(0)
          ).add(investmentValueWithCurrencyEffect),
          totalNetPerformanceValue: (
            accumulatedValuesByDate[dateString]?.totalNetPerformanceValue ??
            new Big(0)
          ).add(netPerformanceValue),
          totalNetPerformanceValueWithCurrencyEffect: (
            accumulatedValuesByDate[dateString]
              ?.totalNetPerformanceValueWithCurrencyEffect ?? new Big(0)
          ).add(netPerformanceValueWithCurrencyEffect),
          totalTimeWeightedInvestmentValue: (
            accumulatedValuesByDate[dateString]
              ?.totalTimeWeightedInvestmentValue ?? new Big(0)
          ).add(timeWeightedInvestmentValue),
          totalTimeWeightedInvestmentValueWithCurrencyEffect: (
            accumulatedValuesByDate[dateString]
              ?.totalTimeWeightedInvestmentValueWithCurrencyEffect ?? new Big(0)
          ).add(timeWeightedInvestmentValueWithCurrencyEffect)
        };
      }
    }

    return Object.entries(accumulatedValuesByDate).map(([date, values]) => {
      const {
        totalCurrentValue,
        totalCurrentValueWithCurrencyEffect,
        totalInvestmentValue,
        totalInvestmentValueWithCurrencyEffect,
        totalNetPerformanceValue,
        totalNetPerformanceValueWithCurrencyEffect,
        totalTimeWeightedInvestmentValue,
        totalTimeWeightedInvestmentValueWithCurrencyEffect
      } = values;

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
        date,
        netPerformanceInPercentage,
        netPerformanceInPercentageWithCurrencyEffect,
        netPerformance: totalNetPerformanceValue.toNumber(),
        netPerformanceWithCurrencyEffect:
          totalNetPerformanceValueWithCurrencyEffect.toNumber(),
        totalInvestment: totalInvestmentValue.toNumber(),
        totalInvestmentValueWithCurrencyEffect:
          totalInvestmentValueWithCurrencyEffect.toNumber(),
        value: totalCurrentValue.toNumber(),
        valueWithCurrencyEffect: totalCurrentValueWithCurrencyEffect.toNumber()
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

    return sortBy(investments, ({ date }) => {
      return date;
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
            dataGatheringItems,
            dateQuery: {
              gte: startDate,
              lt: endOfDay(endDate)
            }
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
    const investmentValues: { [date: string]: Big } = {};
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
        investmentValues: {},
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
        investmentValues: {},
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
        totalInvestmentWithCurrencyEffect: new Big(0)
      };
    }

    // Add a synthetic order at the start and the end date
    orders.push({
      symbol,
      currency: null,
      date: format(start, DATE_FORMAT),
      dataSource: null,
      fee: new Big(0),
      feeInBaseCurrency: new Big(0),
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
      feeInBaseCurrency: new Big(0),
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
            feeInBaseCurrency: new Big(0),
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

    let totalInvestmentDays = 0;
    let sumOfTimeWeightedInvestments = new Big(0);
    let sumOfTimeWeightedInvestmentsWithCurrencyEffect = new Big(0);

    for (let i = 0; i < orders.length; i += 1) {
      const order = orders[i];

      if (PortfolioCalculator.ENABLE_LOGGING) {
        console.log();
        console.log();
        console.log(i + 1, order.type, order.itemType);
      }

      const exchangeRateAtOrderDate = exchangeRates[order.date];

      if (order.itemType === 'start') {
        // Take the unit price of the order as the market price if there are no
        // orders of this symbol before the start date
        order.unitPrice =
          indexOfStartOrder === 0
            ? orders[i + 1]?.unitPrice
            : unitPriceAtStartDate;
      }

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

      const valueOfInvestmentBeforeTransaction = totalUnits.mul(
        order.unitPriceInBaseCurrency
      );

      const valueOfInvestmentBeforeTransactionWithCurrencyEffect =
        totalUnits.mul(order.unitPriceInBaseCurrencyWithCurrencyEffect);

      if (!investmentAtStartDate && i >= indexOfStartOrder) {
        investmentAtStartDate = totalInvestment ?? new Big(0);

        investmentAtStartDateWithCurrencyEffect =
          totalInvestmentWithCurrencyEffect ?? new Big(0);

        valueAtStartDate = valueOfInvestmentBeforeTransaction;

        valueAtStartDateWithCurrencyEffect =
          valueOfInvestmentBeforeTransactionWithCurrencyEffect;
      }

      const transactionInvestment =
        order.type === 'BUY'
          ? order.quantity
              .mul(order.unitPriceInBaseCurrency)
              .mul(this.getFactor(order.type))
          : totalUnits.gt(0)
            ? totalInvestment
                .div(totalUnits)
                .mul(order.quantity)
                .mul(this.getFactor(order.type))
            : new Big(0);

      const transactionInvestmentWithCurrencyEffect =
        order.type === 'BUY'
          ? order.quantity
              .mul(order.unitPriceInBaseCurrencyWithCurrencyEffect)
              .mul(this.getFactor(order.type))
          : totalUnits.gt(0)
            ? totalInvestmentWithCurrencyEffect
                .div(totalUnits)
                .mul(order.quantity)
                .mul(this.getFactor(order.type))
            : new Big(0);

      if (PortfolioCalculator.ENABLE_LOGGING) {
        console.log('totalInvestment', totalInvestment.toNumber());

        console.log(
          'totalInvestmentWithCurrencyEffect',
          totalInvestmentWithCurrencyEffect.toNumber()
        );

        console.log('order.quantity', order.quantity.toNumber());
        console.log('transactionInvestment', transactionInvestment.toNumber());

        console.log(
          'transactionInvestmentWithCurrencyEffect',
          transactionInvestmentWithCurrencyEffect.toNumber()
        );
      }

      const totalInvestmentBeforeTransaction = totalInvestment;

      const totalInvestmentBeforeTransactionWithCurrencyEffect =
        totalInvestmentWithCurrencyEffect;

      totalInvestment = totalInvestment.plus(transactionInvestment);

      totalInvestmentWithCurrencyEffect =
        totalInvestmentWithCurrencyEffect.plus(
          transactionInvestmentWithCurrencyEffect
        );

      if (i >= indexOfStartOrder && !initialValue) {
        if (
          i === indexOfStartOrder &&
          !valueOfInvestmentBeforeTransaction.eq(0)
        ) {
          initialValue = valueOfInvestmentBeforeTransaction;

          initialValueWithCurrencyEffect =
            valueOfInvestmentBeforeTransactionWithCurrencyEffect;
        } else if (transactionInvestment.gt(0)) {
          initialValue = transactionInvestment;

          initialValueWithCurrencyEffect =
            transactionInvestmentWithCurrencyEffect;
        }
      }

      fees = fees.plus(order.feeInBaseCurrency ?? 0);

      feesWithCurrencyEffect = feesWithCurrencyEffect.plus(
        order.feeInBaseCurrencyWithCurrencyEffect ?? 0
      );

      totalUnits = totalUnits.plus(
        order.quantity.mul(this.getFactor(order.type))
      );

      const valueOfInvestment = totalUnits.mul(order.unitPriceInBaseCurrency);

      const valueOfInvestmentWithCurrencyEffect = totalUnits.mul(
        order.unitPriceInBaseCurrencyWithCurrencyEffect
      );

      const grossPerformanceFromSell =
        order.type === TypeOfOrder.SELL
          ? order.unitPriceInBaseCurrency
              .minus(lastAveragePrice)
              .mul(order.quantity)
          : new Big(0);

      const grossPerformanceFromSellWithCurrencyEffect =
        order.type === TypeOfOrder.SELL
          ? order.unitPriceInBaseCurrencyWithCurrencyEffect
              .minus(lastAveragePriceWithCurrencyEffect)
              .mul(order.quantity)
          : new Big(0);

      grossPerformanceFromSells = grossPerformanceFromSells.plus(
        grossPerformanceFromSell
      );

      grossPerformanceFromSellsWithCurrencyEffect =
        grossPerformanceFromSellsWithCurrencyEffect.plus(
          grossPerformanceFromSellWithCurrencyEffect
        );

      totalInvestmentWithGrossPerformanceFromSell =
        totalInvestmentWithGrossPerformanceFromSell
          .plus(transactionInvestment)
          .plus(grossPerformanceFromSell);

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

      if (i > indexOfStartOrder) {
        // Only consider periods with an investment for the calculation of
        // the time weighted investment
        if (valueOfInvestmentBeforeTransaction.gt(0)) {
          // Calculate the number of days since the previous order
          const orderDate = new Date(order.date);
          const previousOrderDate = new Date(orders[i - 1].date);

          let daysSinceLastOrder = differenceInDays(
            orderDate,
            previousOrderDate
          );

          // Set to at least 1 day, otherwise the transactions on the same day
          // would not be considered in the time weighted calculation
          if (daysSinceLastOrder <= 0) {
            daysSinceLastOrder = 1;
          }

          // Sum up the total investment days since the start date to calculate
          // the time weighted investment
          totalInvestmentDays += daysSinceLastOrder;

          sumOfTimeWeightedInvestments = sumOfTimeWeightedInvestments.add(
            valueAtStartDate
              .minus(investmentAtStartDate)
              .plus(totalInvestmentBeforeTransaction)
              .mul(daysSinceLastOrder)
          );

          sumOfTimeWeightedInvestmentsWithCurrencyEffect =
            sumOfTimeWeightedInvestmentsWithCurrencyEffect.add(
              valueAtStartDateWithCurrencyEffect
                .minus(investmentAtStartDateWithCurrencyEffect)
                .plus(totalInvestmentBeforeTransactionWithCurrencyEffect)
                .mul(daysSinceLastOrder)
            );
        }

        if (isChartMode) {
          currentValues[order.date] = valueOfInvestment;

          currentValuesWithCurrencyEffect[order.date] =
            valueOfInvestmentWithCurrencyEffect;

          netPerformanceValues[order.date] = grossPerformance
            .minus(grossPerformanceAtStartDate)
            .minus(fees.minus(feesAtStartDate));

          netPerformanceValuesWithCurrencyEffect[order.date] =
            grossPerformanceWithCurrencyEffect
              .minus(grossPerformanceAtStartDateWithCurrencyEffect)
              .minus(
                feesWithCurrencyEffect.minus(feesAtStartDateWithCurrencyEffect)
              );

          investmentValues[order.date] = totalInvestment;

          investmentValuesWithCurrencyEffect[order.date] =
            totalInvestmentWithCurrencyEffect;

          timeWeightedInvestmentValues[order.date] =
            totalInvestmentDays > 0
              ? sumOfTimeWeightedInvestments.div(totalInvestmentDays)
              : new Big(0);

          timeWeightedInvestmentValuesWithCurrencyEffect[order.date] =
            totalInvestmentDays > 0
              ? sumOfTimeWeightedInvestmentsWithCurrencyEffect.div(
                  totalInvestmentDays
                )
              : new Big(0);
        }
      }

      if (PortfolioCalculator.ENABLE_LOGGING) {
        console.log('totalInvestment', totalInvestment.toNumber());

        console.log(
          'totalInvestmentWithCurrencyEffect',
          totalInvestmentWithCurrencyEffect.toNumber()
        );

        console.log(
          'totalGrossPerformance',
          grossPerformance.minus(grossPerformanceAtStartDate).toNumber()
        );

        console.log(
          'totalGrossPerformanceWithCurrencyEffect',
          grossPerformanceWithCurrencyEffect
            .minus(grossPerformanceAtStartDateWithCurrencyEffect)
            .toNumber()
        );
      }

      if (i === indexOfEndOrder) {
        break;
      }
    }

    const totalGrossPerformance = grossPerformance.minus(
      grossPerformanceAtStartDate
    );

    const totalGrossPerformanceWithCurrencyEffect =
      grossPerformanceWithCurrencyEffect.minus(
        grossPerformanceAtStartDateWithCurrencyEffect
      );

    const totalNetPerformance = grossPerformance
      .minus(grossPerformanceAtStartDate)
      .minus(fees.minus(feesAtStartDate));

    const totalNetPerformanceWithCurrencyEffect =
      grossPerformanceWithCurrencyEffect
        .minus(grossPerformanceAtStartDateWithCurrencyEffect)
        .minus(feesWithCurrencyEffect.minus(feesAtStartDateWithCurrencyEffect));

    const timeWeightedAverageInvestmentBetweenStartAndEndDate =
      totalInvestmentDays > 0
        ? sumOfTimeWeightedInvestments.div(totalInvestmentDays)
        : new Big(0);

    const timeWeightedAverageInvestmentBetweenStartAndEndDateWithCurrencyEffect =
      totalInvestmentDays > 0
        ? sumOfTimeWeightedInvestmentsWithCurrencyEffect.div(
            totalInvestmentDays
          )
        : new Big(0);

    const grossPerformancePercentage =
      timeWeightedAverageInvestmentBetweenStartAndEndDate.gt(0)
        ? totalGrossPerformance.div(
            timeWeightedAverageInvestmentBetweenStartAndEndDate
          )
        : new Big(0);

    const grossPerformancePercentageWithCurrencyEffect =
      timeWeightedAverageInvestmentBetweenStartAndEndDateWithCurrencyEffect.gt(
        0
      )
        ? totalGrossPerformanceWithCurrencyEffect.div(
            timeWeightedAverageInvestmentBetweenStartAndEndDateWithCurrencyEffect
          )
        : new Big(0);

    const feesPerUnit = totalUnits.gt(0)
      ? fees.minus(feesAtStartDate).div(totalUnits)
      : new Big(0);

    const feesPerUnitWithCurrencyEffect = totalUnits.gt(0)
      ? feesWithCurrencyEffect
          .minus(feesAtStartDateWithCurrencyEffect)
          .div(totalUnits)
      : new Big(0);

    const netPerformancePercentage =
      timeWeightedAverageInvestmentBetweenStartAndEndDate.gt(0)
        ? totalNetPerformance.div(
            timeWeightedAverageInvestmentBetweenStartAndEndDate
          )
        : new Big(0);

    const netPerformancePercentageWithCurrencyEffect =
      timeWeightedAverageInvestmentBetweenStartAndEndDateWithCurrencyEffect.gt(
        0
      )
        ? totalNetPerformanceWithCurrencyEffect.div(
            timeWeightedAverageInvestmentBetweenStartAndEndDateWithCurrencyEffect
          )
        : new Big(0);

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
        Time weighted investment: ${timeWeightedAverageInvestmentBetweenStartAndEndDate.toFixed(
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

    return {
      currentValues,
      currentValuesWithCurrencyEffect,
      grossPerformancePercentage,
      grossPerformancePercentageWithCurrencyEffect,
      initialValue,
      initialValueWithCurrencyEffect,
      investmentValues,
      investmentValuesWithCurrencyEffect,
      netPerformancePercentage,
      netPerformancePercentageWithCurrencyEffect,
      netPerformanceValues,
      netPerformanceValuesWithCurrencyEffect,
      timeWeightedInvestmentValues,
      timeWeightedInvestmentValuesWithCurrencyEffect,
      totalInvestment,
      totalInvestmentWithCurrencyEffect,
      grossPerformance: totalGrossPerformance,
      grossPerformanceWithCurrencyEffect:
        totalGrossPerformanceWithCurrencyEffect,
      hasErrors: totalUnits.gt(0) && (!initialValue || !unitPriceAtEndDate),
      netPerformance: totalNetPerformance,
      netPerformanceWithCurrencyEffect: totalNetPerformanceWithCurrencyEffect,
      timeWeightedInvestment:
        timeWeightedAverageInvestmentBetweenStartAndEndDate,
      timeWeightedInvestmentWithCurrencyEffect:
        timeWeightedAverageInvestmentBetweenStartAndEndDateWithCurrencyEffect
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
