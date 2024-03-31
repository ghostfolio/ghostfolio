import { Activity } from '@ghostfolio/api/app/order/interfaces/activities.interface';
import { CurrentRateService } from '@ghostfolio/api/app/portfolio/current-rate.service';
import { CurrentPositions } from '@ghostfolio/api/app/portfolio/interfaces/current-positions.interface';
import { PortfolioOrder } from '@ghostfolio/api/app/portfolio/interfaces/portfolio-order.interface';
import { TransactionPointSymbol } from '@ghostfolio/api/app/portfolio/interfaces/transaction-point-symbol.interface';
import { TransactionPoint } from '@ghostfolio/api/app/portfolio/interfaces/transaction-point.interface';
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
  TimelinePosition,
  UniqueAsset
} from '@ghostfolio/common/interfaces';
import { GroupBy } from '@ghostfolio/common/types';

import { Big } from 'big.js';
import {
  eachDayOfInterval,
  endOfDay,
  format,
  isBefore,
  isSameDay,
  max,
  subDays
} from 'date-fns';
import { isNumber, last, uniq } from 'lodash';

export abstract class PortfolioCalculator {
  protected static readonly ENABLE_LOGGING = false;

  protected orders: PortfolioOrder[];

  private currency: string;
  private currentRateService: CurrentRateService;
  private dataProviderInfos: DataProviderInfo[];
  private exchangeRateDataService: ExchangeRateDataService;
  private transactionPoints: TransactionPoint[];

  public constructor({
    activities,
    currency,
    currentRateService,
    exchangeRateDataService
  }: {
    activities: Activity[];
    currency: string;
    currentRateService: CurrentRateService;
    exchangeRateDataService: ExchangeRateDataService;
  }) {
    this.currency = currency;
    this.currentRateService = currentRateService;
    this.exchangeRateDataService = exchangeRateDataService;
    this.orders = activities.map(
      ({ date, fee, quantity, SymbolProfile, type, unitPrice }) => {
        return {
          SymbolProfile,
          type,
          date: format(date, DATE_FORMAT),
          fee: new Big(fee),
          quantity: new Big(quantity),
          unitPrice: new Big(unitPrice)
        };
      }
    );

    this.orders.sort((a, b) => {
      return a.date?.localeCompare(b.date);
    });

    this.computeTransactionPoints();
  }

  protected abstract calculateOverallPerformance(
    positions: TimelinePosition[]
  ): CurrentPositions;

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
        startDate: this.getStartDate(),
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
        dataSource: null,
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
        totalInvestment: new Big(0),
        totalInvestmentWithCurrencyEffect: new Big(0)
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
        startDate: this.getStartDate(),
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
        dataSource: item.dataSource,
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

  public getStartDate() {
    return this.transactionPoints.length > 0
      ? parseDate(this.transactionPoints[0].date)
      : new Date();
  }

  protected abstract getSymbolMetrics({
    dataSource,
    end,
    exchangeRates,
    isChartMode,
    marketSymbolMap,
    start,
    step,
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
  } & UniqueAsset): SymbolMetrics;

  public getTransactionPoints() {
    return this.transactionPoints;
  }

  private computeTransactionPoints() {
    this.transactionPoints = [];
    const symbols: { [symbol: string]: TransactionPointSymbol } = {};

    let lastDate: string = null;
    let lastTransactionPoint: TransactionPoint = null;

    for (const {
      fee,
      date,
      quantity,
      SymbolProfile,
      tags,
      type,
      unitPrice
    } of this.orders) {
      let currentTransactionPointItem: TransactionPointSymbol;
      const oldAccumulatedSymbol = symbols[SymbolProfile.symbol];

      const factor = getFactor(type);

      if (oldAccumulatedSymbol) {
        let investment = oldAccumulatedSymbol.investment;

        const newQuantity = quantity
          .mul(factor)
          .plus(oldAccumulatedSymbol.quantity);

        if (type === 'BUY') {
          investment = oldAccumulatedSymbol.investment.plus(
            quantity.mul(unitPrice)
          );
        } else if (type === 'SELL') {
          investment = oldAccumulatedSymbol.investment.minus(
            quantity.mul(oldAccumulatedSymbol.averagePrice)
          );
        }

        currentTransactionPointItem = {
          investment,
          tags,
          averagePrice: newQuantity.gt(0)
            ? investment.div(newQuantity)
            : new Big(0),
          currency: SymbolProfile.currency,
          dataSource: SymbolProfile.dataSource,
          dividend: new Big(0),
          fee: fee.plus(oldAccumulatedSymbol.fee),
          firstBuyDate: oldAccumulatedSymbol.firstBuyDate,
          quantity: newQuantity,
          symbol: SymbolProfile.symbol,
          transactionCount: oldAccumulatedSymbol.transactionCount + 1
        };
      } else {
        currentTransactionPointItem = {
          fee,
          tags,
          averagePrice: unitPrice,
          currency: SymbolProfile.currency,
          dataSource: SymbolProfile.dataSource,
          dividend: new Big(0),
          firstBuyDate: date,
          investment: unitPrice.mul(quantity).mul(factor),
          quantity: quantity.mul(factor),
          symbol: SymbolProfile.symbol,
          transactionCount: 1
        };
      }

      symbols[SymbolProfile.symbol] = currentTransactionPointItem;

      const items = lastTransactionPoint?.items ?? [];

      const newItems = items.filter(({ symbol }) => {
        return symbol !== SymbolProfile.symbol;
      });

      newItems.push(currentTransactionPointItem);

      newItems.sort((a, b) => {
        return a.symbol?.localeCompare(b.symbol);
      });

      if (lastDate !== date || lastTransactionPoint === null) {
        lastTransactionPoint = {
          date,
          items: newItems
        };

        this.transactionPoints.push(lastTransactionPoint);
      } else {
        lastTransactionPoint.items = newItems;
      }

      lastDate = date;
    }
  }
}
