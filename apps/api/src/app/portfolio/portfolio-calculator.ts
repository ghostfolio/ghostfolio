import { getFactor } from '@ghostfolio/api/helper/portfolio.helper';
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
import { Big } from 'big.js';
import {
  addDays,
  addMilliseconds,
  differenceInDays,
  eachDayOfInterval,
  endOfDay,
  format,
  isBefore,
  isSameDay,
  max,
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
    orders,
    transactionPoints
  }: {
    currency: string;
    currentRateService: CurrentRateService;
    exchangeRateDataService: ExchangeRateDataService;
    orders: PortfolioOrder[];
    transactionPoints?: TransactionPoint[];
  }) {
    this.currency = currency;
    this.currentRateService = currentRateService;
    this.exchangeRateDataService = exchangeRateDataService;
    this.orders = orders;

    this.orders.sort((a, b) => {
      return a.date?.localeCompare(b.date);
    });

    if (transactionPoints) {
      this.transactionPoints = transactionPoints;
    }
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

      const factor = getFactor(order.type);

      if (oldAccumulatedSymbol) {
        let investment = oldAccumulatedSymbol.investment;

        const newQuantity = order.quantity
          .mul(factor)
          .plus(oldAccumulatedSymbol.quantity);

        if (order.type === 'BUY') {
          investment = oldAccumulatedSymbol.investment.plus(
            order.quantity.mul(order.unitPrice)
          );
        } else if (order.type === 'SELL') {
          investment = oldAccumulatedSymbol.investment.minus(
            order.quantity.mul(oldAccumulatedSymbol.averagePrice)
          );
        }

        currentTransactionPointItem = {
          investment,
          averagePrice: newQuantity.gt(0)
            ? investment.div(newQuantity)
            : new Big(0),
          currency: order.currency,
          dataSource: order.dataSource,
          dividend: new Big(0),
          fee: order.fee.plus(oldAccumulatedSymbol.fee),
          firstBuyDate: oldAccumulatedSymbol.firstBuyDate,
          quantity: newQuantity,
          symbol: order.symbol,
          tags: order.tags,
          transactionCount: oldAccumulatedSymbol.transactionCount + 1
        };
      } else {
        currentTransactionPointItem = {
          averagePrice: order.unitPrice,
          currency: order.currency,
          dataSource: order.dataSource,
          dividend: new Big(0),
          fee: order.fee,
          firstBuyDate: order.date,
          investment: order.unitPrice.mul(order.quantity).mul(factor),
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

  public async getChartData({
    end = new Date(Date.now()),
    start,
    step = 1
  }: {
    end?: Date;
    start: Date;
    step?: number;
  }): Promise<HistoricalDataItem[]> {
    const symbols: { [symbol: string]: boolean } = {};

    const transactionPointsBeforeEndDate =
      this.transactionPoints?.filter((transactionPoint) => {
        return isBefore(parseDate(transactionPoint.date), end);
      }) ?? [];

    const currencies: { [symbol: string]: string } = {};
    const dataGatheringItems: IDataGatheringItem[] = [];
    const firstIndex = transactionPointsBeforeEndDate.length;

    let dates = eachDayOfInterval({ start, end }, { step }).map((date) => {
      return resetHours(date);
    });

    const includesEndDate = isSameDay(last(dates), end);

    if (!includesEndDate) {
      dates.push(resetHours(end));
    }

    if (transactionPointsBeforeEndDate.length > 0) {
      for (const {
        currency,
        dataSource,
        symbol
      } of transactionPointsBeforeEndDate[firstIndex - 1].items) {
        dataGatheringItems.push({
          dataSource,
          symbol
        });
        currencies[symbol] = currency;
        symbols[symbol] = true;
      }
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
        investmentValueWithCurrencyEffect: Big;
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
        investmentValuesAccumulated: { [date: string]: Big };
        investmentValuesAccumulatedWithCurrencyEffect: { [date: string]: Big };
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
        investmentValuesAccumulated,
        investmentValuesAccumulatedWithCurrencyEffect,
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
        investmentValuesAccumulated,
        investmentValuesAccumulatedWithCurrencyEffect,
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
            accumulatedValuesByDate[dateString]?.totalInvestmentValue ??
            new Big(0)
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
        investmentValueWithCurrencyEffect,
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
        investmentValueWithCurrencyEffect:
          investmentValueWithCurrencyEffect.toNumber(),
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
    end?: Date
  ): Promise<CurrentPositions> {
    const lastTransactionPoint = last(this.transactionPoints);

    let endDate = end;

    if (!endDate) {
      endDate = new Date(Date.now());

      if (lastTransactionPoint) {
        endDate = max([endDate, parseDate(lastTransactionPoint.date)]);
      }
    }

    const transactionPoints = this.transactionPoints?.filter(({ date }) => {
      return isBefore(parseDate(date), endDate);
    });

    if (!transactionPoints.length) {
      return {
        currentValueInBaseCurrency: new Big(0),
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

    const currencies: { [symbol: string]: string } = {};
    const dataGatheringItems: IDataGatheringItem[] = [];
    let dates: Date[] = [];
    let firstIndex = transactionPoints.length;
    let firstTransactionPoint: TransactionPoint = null;

    dates.push(resetHours(start));

    for (const { currency, dataSource, symbol } of transactionPoints[
      firstIndex - 1
    ].items) {
      dataGatheringItems.push({
        dataSource,
        symbol
      });

      currencies[symbol] = currency;
    }

    for (let i = 0; i < transactionPoints.length; i++) {
      if (
        !isBefore(parseDate(transactionPoints[i].date), start) &&
        firstTransactionPoint === null
      ) {
        firstTransactionPoint = transactionPoints[i];
        firstIndex = i;
      }

      if (firstTransactionPoint !== null) {
        dates.push(resetHours(parseDate(transactionPoints[i].date)));
      }
    }

    dates.push(resetHours(endDate));

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
        endDate: endOfDay(endDate),
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

    const endDateString = format(endDate, DATE_FORMAT);

    if (firstIndex > 0) {
      firstIndex--;
    }

    const positions: TimelinePosition[] = [];
    let hasAnySymbolMetricsErrors = false;

    const errors: ResponseError['errors'] = [];

    for (const item of lastTransactionPoint.items) {
      const marketPriceInBaseCurrency = (
        marketSymbolMap[endDateString]?.[item.symbol] ?? item.averagePrice
      ).mul(
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
        totalDividend,
        totalDividendInBaseCurrency,
        totalInvestment,
        totalInvestmentWithCurrencyEffect
      } = this.getSymbolMetrics({
        marketSymbolMap,
        start,
        end: endDate,
        exchangeRates:
          exchangeRatesByCurrency[`${item.currency}${this.currency}`],
        symbol: item.symbol
      });

      hasAnySymbolMetricsErrors = hasAnySymbolMetricsErrors || hasErrors;

      positions.push({
        dividend: totalDividend,
        dividendInBaseCurrency: totalDividendInBaseCurrency,
        timeWeightedInvestment,
        timeWeightedInvestmentWithCurrencyEffect,
        averagePrice: item.averagePrice,
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
        transactionCount: item.transactionCount,
        valueInBaseCurrency: new Big(marketPriceInBaseCurrency).mul(
          item.quantity
        )
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

  private calculateOverallPerformance(positions: TimelinePosition[]) {
    let currentValueInBaseCurrency = new Big(0);
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
      if (currentPosition.valueInBaseCurrency) {
        currentValueInBaseCurrency = currentValueInBaseCurrency.plus(
          currentPosition.valueInBaseCurrency
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
      currentValueInBaseCurrency,
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

    let totalDividend = new Big(0);
    let totalDividendInBaseCurrency = new Big(0);
    let totalInvestment = new Big(0);
    let totalInvestmentFromBuyTransactions = new Big(0);
    let totalInvestmentFromBuyTransactionsWithCurrencyEffect = new Big(0);
    let totalInvestmentWithCurrencyEffect = new Big(0);
    let totalQuantityFromBuyTransactions = new Big(0);
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
        netPerformanceValuesWithCurrencyEffect: {},
        netPerformanceWithCurrencyEffect: new Big(0),
        timeWeightedInvestment: new Big(0),
        timeWeightedInvestmentValues: {},
        timeWeightedInvestmentValuesWithCurrencyEffect: {},
        timeWeightedInvestmentWithCurrencyEffect: new Big(0),
        totalDividend: new Big(0),
        totalDividendInBaseCurrency: new Big(0),
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
        netPerformancePercentageWithCurrencyEffect: new Big(0),
        netPerformanceValues: {},
        netPerformanceValuesWithCurrencyEffect: {},
        netPerformanceWithCurrencyEffect: new Big(0),
        timeWeightedInvestment: new Big(0),
        timeWeightedInvestmentValues: {},
        timeWeightedInvestmentValuesWithCurrencyEffect: {},
        timeWeightedInvestmentWithCurrencyEffect: new Big(0),
        totalDividend: new Big(0),
        totalDividendInBaseCurrency: new Big(0),
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
      type: 'BUY',
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
      type: 'BUY',
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
            type: 'BUY',
            unitPrice:
              marketSymbolMap[format(day, DATE_FORMAT)]?.[symbol] ??
              lastUnitPrice
          });
        }

        lastUnitPrice = last(orders).unitPrice;

        day = addDays(day, step);
      }
    }

    // Sort orders so that the start and end placeholder order are at the correct
    // position
    orders = sortBy(orders, ({ date, itemType }) => {
      let sortIndex = new Date(date);

      if (itemType === 'end') {
        sortIndex = addMilliseconds(sortIndex, 1);
      } else if (itemType === 'start') {
        sortIndex = addMilliseconds(sortIndex, -1);
      }

      return sortIndex.getTime();
    });

    const indexOfStartOrder = orders.findIndex(({ itemType }) => {
      return itemType === 'start';
    });

    const indexOfEndOrder = orders.findIndex(({ itemType }) => {
      return itemType === 'end';
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

      let transactionInvestment = new Big(0);
      let transactionInvestmentWithCurrencyEffect = new Big(0);

      if (order.type === 'BUY') {
        transactionInvestment = order.quantity
          .mul(order.unitPriceInBaseCurrency)
          .mul(getFactor(order.type));

        transactionInvestmentWithCurrencyEffect = order.quantity
          .mul(order.unitPriceInBaseCurrencyWithCurrencyEffect)
          .mul(getFactor(order.type));

        totalQuantityFromBuyTransactions =
          totalQuantityFromBuyTransactions.plus(order.quantity);

        totalInvestmentFromBuyTransactions =
          totalInvestmentFromBuyTransactions.plus(transactionInvestment);

        totalInvestmentFromBuyTransactionsWithCurrencyEffect =
          totalInvestmentFromBuyTransactionsWithCurrencyEffect.plus(
            transactionInvestmentWithCurrencyEffect
          );
      } else if (order.type === 'SELL') {
        if (totalUnits.gt(0)) {
          transactionInvestment = totalInvestment
            .div(totalUnits)
            .mul(order.quantity)
            .mul(getFactor(order.type));
          transactionInvestmentWithCurrencyEffect =
            totalInvestmentWithCurrencyEffect
              .div(totalUnits)
              .mul(order.quantity)
              .mul(getFactor(order.type));
        }
      }

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

      totalUnits = totalUnits.plus(order.quantity.mul(getFactor(order.type)));

      if (order.type === 'DIVIDEND') {
        const dividend = order.quantity.mul(order.unitPrice);

        totalDividend = totalDividend.plus(dividend);
        totalDividendInBaseCurrency = totalDividendInBaseCurrency.plus(
          dividend.mul(exchangeRateAtOrderDate ?? 1)
        );
      }

      const valueOfInvestment = totalUnits.mul(order.unitPriceInBaseCurrency);

      const valueOfInvestmentWithCurrencyEffect = totalUnits.mul(
        order.unitPriceInBaseCurrencyWithCurrencyEffect
      );

      const grossPerformanceFromSell =
        order.type === 'SELL'
          ? order.unitPriceInBaseCurrency
              .minus(lastAveragePrice)
              .mul(order.quantity)
          : new Big(0);

      const grossPerformanceFromSellWithCurrencyEffect =
        order.type === 'SELL'
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

      lastAveragePrice = totalQuantityFromBuyTransactions.eq(0)
        ? new Big(0)
        : totalInvestmentFromBuyTransactions.div(
            totalQuantityFromBuyTransactions
          );

      lastAveragePriceWithCurrencyEffect = totalQuantityFromBuyTransactions.eq(
        0
      )
        ? new Big(0)
        : totalInvestmentFromBuyTransactionsWithCurrencyEffect.div(
            totalQuantityFromBuyTransactions
          );

      if (PortfolioCalculator.ENABLE_LOGGING) {
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

      if (i > indexOfStartOrder && ['BUY', 'SELL'].includes(order.type)) {
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
          if (daysSinceLastOrder <= 0) {
            // The time between two activities on the same day is unknown
            // -> Set it to the smallest floating point number greater than 0
            daysSinceLastOrder = Number.EPSILON;
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

          investmentValuesAccumulated[order.date] = totalInvestment;

          investmentValuesAccumulatedWithCurrencyEffect[order.date] =
            totalInvestmentWithCurrencyEffect;

          investmentValuesWithCurrencyEffect[order.date] = (
            investmentValuesWithCurrencyEffect[order.date] ?? new Big(0)
          ).add(transactionInvestmentWithCurrencyEffect);

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
        Total dividend: ${totalDividend.toFixed(2)}
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
      investmentValuesAccumulated,
      investmentValuesAccumulatedWithCurrencyEffect,
      investmentValuesWithCurrencyEffect,
      netPerformancePercentage,
      netPerformancePercentageWithCurrencyEffect,
      netPerformanceValues,
      netPerformanceValuesWithCurrencyEffect,
      timeWeightedInvestmentValues,
      timeWeightedInvestmentValuesWithCurrencyEffect,
      totalDividend,
      totalDividendInBaseCurrency,
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
}
