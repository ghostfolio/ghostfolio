import { getIntervalFromDateRange } from '@ghostfolio/common/calculation-helper';
import { DATE_FORMAT } from '@ghostfolio/common/helper';
import { SymbolMetrics } from '@ghostfolio/common/interfaces';
import { DateRangeTypes } from '@ghostfolio/common/types/date-range.type';

import { DataSource } from '@prisma/client';
import { Big } from 'big.js';
import { isBefore, addMilliseconds, format } from 'date-fns';
import { sortBy } from 'lodash';

import { getFactor } from '../../../../helper/portfolio.helper';
import { PortfolioOrderItem } from '../../interfaces/portfolio-order-item.interface';
import { PortfolioCalculatorSymbolMetricsHelperObject } from './portfolio-calculator-helper-object';

export class RoiPortfolioCalculatorSymbolMetricsHelper {
  private ENABLE_LOGGING: boolean;
  private baseCurrencySuffix = 'InBaseCurrency';
  private chartDates: string[];
  private marketSymbolMap: { [date: string]: { [symbol: string]: Big } };
  public constructor(
    ENABLE_LOGGING: boolean,
    marketSymbolMap: { [date: string]: { [symbol: string]: Big } },
    chartDates: string[]
  ) {
    this.ENABLE_LOGGING = ENABLE_LOGGING;
    this.marketSymbolMap = marketSymbolMap;
    this.chartDates = chartDates;
  }

  public calculateNetPerformanceByDateRange(
    start: Date,
    symbolMetricsHelper: PortfolioCalculatorSymbolMetricsHelperObject
  ) {
    for (const dateRange of DateRangeTypes) {
      const dateInterval = getIntervalFromDateRange(dateRange);
      const endDate = dateInterval.endDate;
      let startDate = dateInterval.startDate;

      if (isBefore(startDate, start)) {
        startDate = start;
      }

      const rangeEndDateString = format(endDate, DATE_FORMAT);
      const rangeStartDateString = format(startDate, DATE_FORMAT);

      symbolMetricsHelper.symbolMetrics.netPerformanceWithCurrencyEffectMap[
        dateRange
      ] =
        symbolMetricsHelper.symbolMetrics.netPerformanceValuesWithCurrencyEffect[
          rangeEndDateString
        ]?.minus(
          // If the date range is 'max', take 0 as a start value. Otherwise,
          // the value of the end of the day of the start date is taken which
          // differs from the buying price.
          dateRange === 'max'
            ? new Big(0)
            : (symbolMetricsHelper.symbolMetrics
                .netPerformanceValuesWithCurrencyEffect[rangeStartDateString] ??
                new Big(0))
        ) ?? new Big(0);

      symbolMetricsHelper.symbolMetrics.netPerformancePercentageWithCurrencyEffectMap[
        dateRange
      ] =
        symbolMetricsHelper.symbolMetrics.timeWeightedInvestmentValuesWithCurrencyEffect[
          rangeEndDateString
        ]?.gt(0)
          ? symbolMetricsHelper.symbolMetrics.netPerformanceWithCurrencyEffectMap[
              dateRange
            ].div(
              symbolMetricsHelper.symbolMetrics
                .timeWeightedInvestmentValuesWithCurrencyEffect[
                rangeEndDateString
              ]
            )
          : new Big(0);
    }
  }

  public handleOverallPerformanceCalculation(
    symbolMetricsHelper: PortfolioCalculatorSymbolMetricsHelperObject
  ) {
    symbolMetricsHelper.symbolMetrics.grossPerformance =
      symbolMetricsHelper.symbolMetrics.grossPerformance.minus(
        symbolMetricsHelper.grossPerformanceAtStartDate
      );
    symbolMetricsHelper.symbolMetrics.grossPerformanceWithCurrencyEffect =
      symbolMetricsHelper.symbolMetrics.grossPerformanceWithCurrencyEffect.minus(
        symbolMetricsHelper.grossPerformanceAtStartDateWithCurrencyEffect
      );

    symbolMetricsHelper.symbolMetrics.netPerformance =
      symbolMetricsHelper.symbolMetrics.grossPerformance.minus(
        symbolMetricsHelper.fees.minus(symbolMetricsHelper.feesAtStartDate)
      );

    symbolMetricsHelper.symbolMetrics.timeWeightedInvestment = new Big(
      symbolMetricsHelper.totalInvestmentFromBuyTransactions
    );
    symbolMetricsHelper.symbolMetrics.timeWeightedInvestmentWithCurrencyEffect =
      new Big(
        symbolMetricsHelper.totalInvestmentFromBuyTransactionsWithCurrencyEffect
      );

    if (symbolMetricsHelper.symbolMetrics.timeWeightedInvestment.gt(0)) {
      symbolMetricsHelper.symbolMetrics.netPerformancePercentage =
        symbolMetricsHelper.symbolMetrics.netPerformance.div(
          symbolMetricsHelper.symbolMetrics.timeWeightedInvestment
        );
      symbolMetricsHelper.symbolMetrics.grossPerformancePercentage =
        symbolMetricsHelper.symbolMetrics.grossPerformance.div(
          symbolMetricsHelper.symbolMetrics.timeWeightedInvestment
        );
      symbolMetricsHelper.symbolMetrics.grossPerformancePercentageWithCurrencyEffect =
        symbolMetricsHelper.symbolMetrics.grossPerformanceWithCurrencyEffect.div(
          symbolMetricsHelper.symbolMetrics
            .timeWeightedInvestmentWithCurrencyEffect
        );
    }
  }

  public processOrderMetrics(
    orders: PortfolioOrderItem[],
    i: number,
    exchangeRates: { [dateString: string]: number },
    symbolMetricsHelper: PortfolioCalculatorSymbolMetricsHelperObject
  ) {
    const order = orders[i];
    this.writeOrderToLogIfNecessary(i, order);

    symbolMetricsHelper.exchangeRateAtOrderDate = exchangeRates[order.date];
    const value = order.quantity.gt(0)
      ? order.quantity.mul(order.unitPrice)
      : new Big(0);

    this.handleNoneBuyAndSellOrders(order, value, symbolMetricsHelper);
    this.handleStartOrder(
      order,
      i,
      orders,
      symbolMetricsHelper.unitPriceAtStartDate
    );
    this.handleOrderFee(order, symbolMetricsHelper);
    symbolMetricsHelper.unitPrice = this.getUnitPriceAndFillCurrencyDeviations(
      order,
      symbolMetricsHelper
    );

    if (order.unitPriceInBaseCurrency) {
      symbolMetricsHelper.investmentValueBeforeTransaction =
        symbolMetricsHelper.totalUnits.mul(order.unitPriceInBaseCurrency);
      symbolMetricsHelper.investmentValueBeforeTransactionWithCurrencyEffect =
        symbolMetricsHelper.totalUnits.mul(
          order.unitPriceInBaseCurrencyWithCurrencyEffect
        );
    }

    this.handleInitialInvestmentValues(symbolMetricsHelper, i, order);

    const { transactionInvestment, transactionInvestmentWithCurrencyEffect } =
      this.handleBuyAndSellTranscation(order, symbolMetricsHelper);

    this.logTransactionValuesIfRequested(
      order,
      transactionInvestment,
      transactionInvestmentWithCurrencyEffect
    );

    this.updateTotalInvestments(
      symbolMetricsHelper,
      transactionInvestment,
      transactionInvestmentWithCurrencyEffect
    );

    this.setInitialValueIfNecessary(
      symbolMetricsHelper,
      transactionInvestment,
      transactionInvestmentWithCurrencyEffect
    );

    this.accumulateFees(symbolMetricsHelper, order);

    symbolMetricsHelper.totalUnits = symbolMetricsHelper.totalUnits.plus(
      order.quantity.mul(getFactor(order.type))
    );

    this.fillOrderUnitPricesIfMissing(order, symbolMetricsHelper);

    const valueOfInvestment = symbolMetricsHelper.totalUnits.mul(
      order.unitPriceInBaseCurrency
    );

    const valueOfInvestmentWithCurrencyEffect =
      symbolMetricsHelper.totalUnits.mul(
        order.unitPriceInBaseCurrencyWithCurrencyEffect
      );

    const valueOfPositionsSold =
      order.type === 'SELL'
        ? order.unitPriceInBaseCurrency.mul(order.quantity)
        : new Big(0);

    const valueOfPositionsSoldWithCurrencyEffect =
      order.type === 'SELL'
        ? order.unitPriceInBaseCurrencyWithCurrencyEffect.mul(order.quantity)
        : new Big(0);

    symbolMetricsHelper.totalValueOfPositionsSold =
      symbolMetricsHelper.totalValueOfPositionsSold.plus(valueOfPositionsSold);
    symbolMetricsHelper.totalValueOfPositionsSoldWithCurrencyEffect =
      symbolMetricsHelper.totalValueOfPositionsSoldWithCurrencyEffect.plus(
        valueOfPositionsSoldWithCurrencyEffect
      );

    this.handlePerformanceCalculation(
      valueOfInvestment,
      symbolMetricsHelper,
      valueOfInvestmentWithCurrencyEffect,
      order
    );

    symbolMetricsHelper.symbolMetrics.investmentValuesAccumulated[order.date] =
      new Big(symbolMetricsHelper.symbolMetrics.totalInvestment.toNumber());

    symbolMetricsHelper.symbolMetrics.investmentValuesAccumulatedWithCurrencyEffect[
      order.date
    ] = new Big(
      symbolMetricsHelper.symbolMetrics.totalInvestmentWithCurrencyEffect.toNumber()
    );

    symbolMetricsHelper.symbolMetrics.investmentValuesWithCurrencyEffect[
      order.date
    ] = (
      symbolMetricsHelper.symbolMetrics.investmentValuesWithCurrencyEffect[
        order.date
      ] ?? new Big(0)
    ).add(transactionInvestmentWithCurrencyEffect);
  }

  public handlePerformanceCalculation(
    valueOfInvestment: Big,
    symbolMetricsHelper: PortfolioCalculatorSymbolMetricsHelperObject,
    valueOfInvestmentWithCurrencyEffect: Big,
    order: PortfolioOrderItem
  ) {
    this.calculateGrossPerformance(
      valueOfInvestment,
      symbolMetricsHelper,
      valueOfInvestmentWithCurrencyEffect
    );

    this.calculateNetPerformance(
      symbolMetricsHelper,
      order,
      valueOfInvestment,
      valueOfInvestmentWithCurrencyEffect
    );
  }

  public calculateNetPerformance(
    symbolMetricsHelper: PortfolioCalculatorSymbolMetricsHelperObject,
    order: PortfolioOrderItem,
    valueOfInvestment: Big,
    valueOfInvestmentWithCurrencyEffect: Big
  ) {
    symbolMetricsHelper.symbolMetrics.currentValues[order.date] = new Big(
      valueOfInvestment
    );
    symbolMetricsHelper.symbolMetrics.currentValuesWithCurrencyEffect[
      order.date
    ] = new Big(valueOfInvestmentWithCurrencyEffect);

    symbolMetricsHelper.symbolMetrics.timeWeightedInvestmentValues[order.date] =
      new Big(symbolMetricsHelper.totalInvestmentFromBuyTransactions);
    symbolMetricsHelper.symbolMetrics.timeWeightedInvestmentValuesWithCurrencyEffect[
      order.date
    ] = new Big(
      symbolMetricsHelper.totalInvestmentFromBuyTransactionsWithCurrencyEffect
    );

    symbolMetricsHelper.symbolMetrics.netPerformanceValues[order.date] =
      symbolMetricsHelper.symbolMetrics.grossPerformance
        .minus(symbolMetricsHelper.grossPerformanceAtStartDate)
        .minus(
          symbolMetricsHelper.fees.minus(symbolMetricsHelper.feesAtStartDate)
        );

    symbolMetricsHelper.symbolMetrics.netPerformanceValuesWithCurrencyEffect[
      order.date
    ] = symbolMetricsHelper.symbolMetrics.grossPerformanceWithCurrencyEffect
      .minus(symbolMetricsHelper.grossPerformanceAtStartDateWithCurrencyEffect)
      .minus(
        symbolMetricsHelper.feesWithCurrencyEffect.minus(
          symbolMetricsHelper.feesAtStartDateWithCurrencyEffect
        )
      );
  }

  public calculateGrossPerformance(
    valueOfInvestment: Big,
    symbolMetricsHelper: PortfolioCalculatorSymbolMetricsHelperObject,
    valueOfInvestmentWithCurrencyEffect: Big
  ) {
    const newGrossPerformance = valueOfInvestment
      .minus(symbolMetricsHelper.totalInvestmentFromBuyTransactions)
      .plus(symbolMetricsHelper.totalValueOfPositionsSold)
      .plus(
        symbolMetricsHelper.symbolMetrics.totalDividend.mul(
          symbolMetricsHelper.currentExchangeRate
        )
      )
      .plus(
        symbolMetricsHelper.symbolMetrics.totalInterest.mul(
          symbolMetricsHelper.currentExchangeRate
        )
      );

    const newGrossPerformanceWithCurrencyEffect =
      valueOfInvestmentWithCurrencyEffect
        .minus(
          symbolMetricsHelper.totalInvestmentFromBuyTransactionsWithCurrencyEffect
        )
        .plus(symbolMetricsHelper.totalValueOfPositionsSoldWithCurrencyEffect)
        .plus(symbolMetricsHelper.symbolMetrics.totalDividendInBaseCurrency)
        .plus(symbolMetricsHelper.symbolMetrics.totalInterestInBaseCurrency);

    symbolMetricsHelper.symbolMetrics.grossPerformance = newGrossPerformance;
    symbolMetricsHelper.symbolMetrics.grossPerformanceWithCurrencyEffect =
      newGrossPerformanceWithCurrencyEffect;
  }

  public accumulateFees(
    symbolMetricsHelper: PortfolioCalculatorSymbolMetricsHelperObject,
    order: PortfolioOrderItem
  ) {
    symbolMetricsHelper.fees = symbolMetricsHelper.fees.plus(
      order.feeInBaseCurrency ?? 0
    );

    symbolMetricsHelper.feesWithCurrencyEffect =
      symbolMetricsHelper.feesWithCurrencyEffect.plus(
        order.feeInBaseCurrencyWithCurrencyEffect ?? 0
      );
  }

  public updateTotalInvestments(
    symbolMetricsHelper: PortfolioCalculatorSymbolMetricsHelperObject,
    transactionInvestment: Big,
    transactionInvestmentWithCurrencyEffect: Big
  ) {
    symbolMetricsHelper.symbolMetrics.totalInvestment =
      symbolMetricsHelper.symbolMetrics.totalInvestment.plus(
        transactionInvestment
      );

    symbolMetricsHelper.symbolMetrics.totalInvestmentWithCurrencyEffect =
      symbolMetricsHelper.symbolMetrics.totalInvestmentWithCurrencyEffect.plus(
        transactionInvestmentWithCurrencyEffect
      );
  }

  public setInitialValueIfNecessary(
    symbolMetricsHelper: PortfolioCalculatorSymbolMetricsHelperObject,
    transactionInvestment: Big,
    transactionInvestmentWithCurrencyEffect: Big
  ) {
    if (!symbolMetricsHelper.initialValue && transactionInvestment.gt(0)) {
      symbolMetricsHelper.initialValue = transactionInvestment;
      symbolMetricsHelper.initialValueWithCurrencyEffect =
        transactionInvestmentWithCurrencyEffect;
    }
  }

  public logTransactionValuesIfRequested(
    order: PortfolioOrderItem,
    transactionInvestment: Big,
    transactionInvestmentWithCurrencyEffect: Big
  ) {
    if (this.ENABLE_LOGGING) {
      console.log('order.quantity', order.quantity.toNumber());
      console.log('transactionInvestment', transactionInvestment.toNumber());

      console.log(
        'transactionInvestmentWithCurrencyEffect',
        transactionInvestmentWithCurrencyEffect.toNumber()
      );
    }
  }

  public handleBuyAndSellTranscation(
    order: PortfolioOrderItem,
    symbolMetricsHelper: PortfolioCalculatorSymbolMetricsHelperObject
  ) {
    switch (order.type) {
      case 'BUY':
        return this.handleBuyTransaction(order, symbolMetricsHelper);
      case 'SELL':
        return this.handleSellTransaction(symbolMetricsHelper, order);
      default:
        return {
          transactionInvestment: new Big(0),
          transactionInvestmentWithCurrencyEffect: new Big(0)
        };
    }
  }

  public handleSellTransaction(
    symbolMetricsHelper: PortfolioCalculatorSymbolMetricsHelperObject,
    order: PortfolioOrderItem
  ) {
    let transactionInvestment = new Big(0);
    let transactionInvestmentWithCurrencyEffect = new Big(0);
    if (symbolMetricsHelper.totalUnits.gt(0)) {
      transactionInvestment = symbolMetricsHelper.symbolMetrics.totalInvestment
        .div(symbolMetricsHelper.totalUnits)
        .mul(order.quantity)
        .mul(getFactor(order.type));
      transactionInvestmentWithCurrencyEffect =
        symbolMetricsHelper.symbolMetrics.totalInvestmentWithCurrencyEffect
          .div(symbolMetricsHelper.totalUnits)
          .mul(order.quantity)
          .mul(getFactor(order.type));
    }
    return { transactionInvestment, transactionInvestmentWithCurrencyEffect };
  }

  public handleBuyTransaction(
    order: PortfolioOrderItem,
    symbolMetricsHelper: PortfolioCalculatorSymbolMetricsHelperObject
  ) {
    const transactionInvestment = order.quantity
      .mul(order.unitPriceInBaseCurrency)
      .mul(getFactor(order.type));

    const transactionInvestmentWithCurrencyEffect = order.quantity
      .mul(order.unitPriceInBaseCurrencyWithCurrencyEffect)
      .mul(getFactor(order.type));

    symbolMetricsHelper.totalQuantityFromBuyTransactions =
      symbolMetricsHelper.totalQuantityFromBuyTransactions.plus(order.quantity);

    symbolMetricsHelper.totalInvestmentFromBuyTransactions =
      symbolMetricsHelper.totalInvestmentFromBuyTransactions.plus(
        transactionInvestment
      );

    symbolMetricsHelper.totalInvestmentFromBuyTransactionsWithCurrencyEffect =
      symbolMetricsHelper.totalInvestmentFromBuyTransactionsWithCurrencyEffect.plus(
        transactionInvestmentWithCurrencyEffect
      );
    return { transactionInvestment, transactionInvestmentWithCurrencyEffect };
  }

  public handleInitialInvestmentValues(
    symbolMetricsHelper: PortfolioCalculatorSymbolMetricsHelperObject,
    i: number,
    order: PortfolioOrderItem
  ) {
    if (
      !symbolMetricsHelper.investmentAtStartDate &&
      i >= symbolMetricsHelper.indexOfStartOrder
    ) {
      symbolMetricsHelper.investmentAtStartDate = new Big(
        symbolMetricsHelper.symbolMetrics.totalInvestment.toNumber()
      );
      symbolMetricsHelper.investmentAtStartDateWithCurrencyEffect = new Big(
        symbolMetricsHelper.symbolMetrics.totalInvestmentWithCurrencyEffect.toNumber()
      );

      symbolMetricsHelper.valueAtStartDate = new Big(
        symbolMetricsHelper.investmentValueBeforeTransaction.toNumber()
      );

      symbolMetricsHelper.valueAtStartDateWithCurrencyEffect = new Big(
        symbolMetricsHelper.investmentValueBeforeTransactionWithCurrencyEffect.toNumber()
      );
    }
    if (order.itemType === 'start') {
      symbolMetricsHelper.feesAtStartDate = symbolMetricsHelper.fees;
      symbolMetricsHelper.feesAtStartDateWithCurrencyEffect =
        symbolMetricsHelper.feesWithCurrencyEffect;
      symbolMetricsHelper.grossPerformanceAtStartDate =
        symbolMetricsHelper.symbolMetrics.grossPerformance;

      symbolMetricsHelper.grossPerformanceAtStartDateWithCurrencyEffect =
        symbolMetricsHelper.symbolMetrics.grossPerformanceWithCurrencyEffect;
    }

    if (
      i >= symbolMetricsHelper.indexOfStartOrder &&
      !symbolMetricsHelper.initialValue
    ) {
      if (
        i === symbolMetricsHelper.indexOfStartOrder &&
        !symbolMetricsHelper.symbolMetrics.totalInvestment.eq(0)
      ) {
        symbolMetricsHelper.initialValue = new Big(
          symbolMetricsHelper.symbolMetrics.totalInvestment.toNumber()
        );

        symbolMetricsHelper.initialValueWithCurrencyEffect = new Big(
          symbolMetricsHelper.symbolMetrics.totalInvestmentWithCurrencyEffect.toNumber()
        );
      }
    }
  }

  public getSymbolMetricHelperObject(
    exchangeRates: { [dateString: string]: number },
    start: Date,
    end: Date,
    marketSymbolMap: { [date: string]: { [symbol: string]: Big } },
    symbol: string
  ): PortfolioCalculatorSymbolMetricsHelperObject {
    const symbolMetricsHelper =
      new PortfolioCalculatorSymbolMetricsHelperObject();
    symbolMetricsHelper.symbolMetrics = this.createEmptySymbolMetrics();
    symbolMetricsHelper.currentExchangeRate =
      exchangeRates[format(new Date(), DATE_FORMAT)];
    symbolMetricsHelper.startDateString = format(start, DATE_FORMAT);
    symbolMetricsHelper.endDateString = format(end, DATE_FORMAT);
    symbolMetricsHelper.unitPriceAtStartDate =
      marketSymbolMap[symbolMetricsHelper.startDateString]?.[symbol];
    symbolMetricsHelper.unitPriceAtEndDate =
      marketSymbolMap[symbolMetricsHelper.endDateString]?.[symbol];

    symbolMetricsHelper.totalUnits = new Big(0);

    return symbolMetricsHelper;
  }

  public getUnitPriceAndFillCurrencyDeviations(
    order: PortfolioOrderItem,
    symbolMetricsHelper: PortfolioCalculatorSymbolMetricsHelperObject
  ) {
    const unitprice = ['BUY', 'SELL'].includes(order.type)
      ? order.unitPrice
      : order.unitPriceFromMarketData;
    if (unitprice) {
      order.unitPriceInBaseCurrency = unitprice.mul(
        symbolMetricsHelper.currentExchangeRate ?? 1
      );

      order.unitPriceInBaseCurrencyWithCurrencyEffect = unitprice.mul(
        symbolMetricsHelper.exchangeRateAtOrderDate ?? 1
      );
    }
    return unitprice;
  }

  public handleOrderFee(
    order: PortfolioOrderItem,
    symbolMetricsHelper: PortfolioCalculatorSymbolMetricsHelperObject
  ) {
    if (order.fee) {
      order.feeInBaseCurrency = order.fee.mul(
        symbolMetricsHelper.currentExchangeRate ?? 1
      );
      order.feeInBaseCurrencyWithCurrencyEffect = order.fee.mul(
        symbolMetricsHelper.exchangeRateAtOrderDate ?? 1
      );
    }
  }

  public handleStartOrder(
    order: PortfolioOrderItem,
    i: number,
    orders: PortfolioOrderItem[],
    unitPriceAtStartDate: Big.Big
  ) {
    if (order.itemType === 'start') {
      // Take the unit price of the order as the market price if there are no
      // orders of this symbol before the start date
      order.unitPrice =
        i === 0 ? orders[i + 1]?.unitPrice : unitPriceAtStartDate;
    }
  }

  public handleNoneBuyAndSellOrders(
    order: PortfolioOrderItem,
    value: Big.Big,
    symbolMetricsHelper: PortfolioCalculatorSymbolMetricsHelperObject
  ) {
    const symbolMetricsKey = this.getSymbolMetricsKeyFromOrderType(order.type);
    if (symbolMetricsKey) {
      this.calculateMetrics(value, symbolMetricsHelper, symbolMetricsKey);
    }
  }

  public getSymbolMetricsKeyFromOrderType(
    orderType: PortfolioOrderItem['type']
  ): keyof SymbolMetrics {
    switch (orderType) {
      case 'DIVIDEND':
        return 'totalDividend';
      case 'INTEREST':
        return 'totalInterest';
      case 'ITEM':
        return 'totalValuables';
      case 'LIABILITY':
        return 'totalLiabilities';
      default:
        return undefined;
    }
  }

  public calculateMetrics(
    value: Big,
    symbolMetricsHelper: PortfolioCalculatorSymbolMetricsHelperObject,
    key: keyof SymbolMetrics
  ) {
    const stringKey = key.toString();
    symbolMetricsHelper.symbolMetrics[stringKey] = (
      symbolMetricsHelper.symbolMetrics[stringKey] as Big
    ).plus(value);

    if (
      Object.keys(symbolMetricsHelper.symbolMetrics).includes(
        stringKey + this.baseCurrencySuffix
      )
    ) {
      symbolMetricsHelper.symbolMetrics[stringKey + this.baseCurrencySuffix] = (
        symbolMetricsHelper.symbolMetrics[
          stringKey + this.baseCurrencySuffix
        ] as Big
      ).plus(value.mul(symbolMetricsHelper.exchangeRateAtOrderDate ?? 1));
    } else {
      throw new Error(
        `Key ${stringKey + this.baseCurrencySuffix} not found in symbolMetrics`
      );
    }
  }

  public writeOrderToLogIfNecessary(i: number, order: PortfolioOrderItem) {
    if (this.ENABLE_LOGGING) {
      console.log();
      console.log();
      console.log(
        i + 1,
        order.date,
        order.type,
        order.itemType ? `(${order.itemType})` : ''
      );
    }
  }

  public fillOrdersAndSortByTime(
    orders: PortfolioOrderItem[],
    symbolMetricsHelper: PortfolioCalculatorSymbolMetricsHelperObject,
    chartDateMap: { [date: string]: boolean },
    marketSymbolMap: { [date: string]: { [symbol: string]: Big.Big } },
    symbol: string,
    dataSource: DataSource
  ) {
    this.fillOrdersByDate(orders, symbolMetricsHelper.ordersByDate);

    this.chartDates ??= Object.keys(chartDateMap).sort();

    this.fillOrdersWithDatesFromChartDate(
      symbolMetricsHelper,
      marketSymbolMap,
      symbol,
      orders,
      dataSource
    );

    // Sort orders so that the start and end placeholder order are at the correct
    // position
    orders = this.sortOrdersByTime(orders);
    return orders;
  }

  public sortOrdersByTime(orders: PortfolioOrderItem[]) {
    orders = sortBy(orders, ({ date, itemType }) => {
      let sortIndex = new Date(date);

      if (itemType === 'end') {
        sortIndex = addMilliseconds(sortIndex, 1);
      } else if (itemType === 'start') {
        sortIndex = addMilliseconds(sortIndex, -1);
      }

      return sortIndex.getTime();
    });
    return orders;
  }

  public fillOrdersWithDatesFromChartDate(
    symbolMetricsHelper: PortfolioCalculatorSymbolMetricsHelperObject,
    marketSymbolMap: { [date: string]: { [symbol: string]: Big.Big } },
    symbol: string,
    orders: PortfolioOrderItem[],
    dataSource: DataSource
  ) {
    let lastUnitPrice: Big;
    for (const dateString of this.chartDates) {
      if (dateString < symbolMetricsHelper.startDateString) {
        continue;
      } else if (dateString > symbolMetricsHelper.endDateString) {
        break;
      }

      if (symbolMetricsHelper.ordersByDate[dateString]?.length > 0) {
        for (const order of symbolMetricsHelper.ordersByDate[dateString]) {
          order.unitPriceFromMarketData =
            marketSymbolMap[dateString]?.[symbol] ?? lastUnitPrice;
        }
      } else {
        orders.push(
          this.getFakeOrder(
            dateString,
            dataSource,
            symbol,
            marketSymbolMap,
            lastUnitPrice
          )
        );
      }

      const lastOrder = orders.at(-1);

      lastUnitPrice = lastOrder.unitPriceFromMarketData ?? lastOrder.unitPrice;
    }
    return lastUnitPrice;
  }

  public getFakeOrder(
    dateString: string,
    dataSource: DataSource,
    symbol: string,
    marketSymbolMap: { [date: string]: { [symbol: string]: Big.Big } },
    lastUnitPrice: Big.Big
  ): PortfolioOrderItem {
    return {
      date: dateString,
      fee: new Big(0),
      feeInBaseCurrency: new Big(0),
      quantity: new Big(0),
      SymbolProfile: {
        dataSource,
        symbol
      },
      type: 'BUY',
      unitPrice: marketSymbolMap[dateString]?.[symbol] ?? lastUnitPrice,
      unitPriceFromMarketData:
        marketSymbolMap[dateString]?.[symbol] ?? lastUnitPrice
    };
  }

  public fillOrdersByDate(
    orders: PortfolioOrderItem[],
    ordersByDate: { [date: string]: PortfolioOrderItem[] }
  ) {
    for (const order of orders) {
      ordersByDate[order.date] = ordersByDate[order.date] ?? [];
      ordersByDate[order.date].push(order);
    }
  }

  public addSyntheticStartAndEndOrder(
    orders: PortfolioOrderItem[],
    symbolMetricsHelper: PortfolioCalculatorSymbolMetricsHelperObject,
    dataSource: DataSource,
    symbol: string
  ) {
    orders.push({
      date: symbolMetricsHelper.startDateString,
      fee: new Big(0),
      feeInBaseCurrency: new Big(0),
      itemType: 'start',
      quantity: new Big(0),
      SymbolProfile: {
        dataSource,
        symbol
      },
      type: 'BUY',
      unitPrice: symbolMetricsHelper.unitPriceAtStartDate
    });

    orders.push({
      date: symbolMetricsHelper.endDateString,
      fee: new Big(0),
      feeInBaseCurrency: new Big(0),
      itemType: 'end',
      SymbolProfile: {
        dataSource,
        symbol
      },
      quantity: new Big(0),
      type: 'BUY',
      unitPrice: symbolMetricsHelper.unitPriceAtEndDate
    });
  }

  public hasNoUnitPriceAtEndOrStartDate(
    unitPriceAtEndDate: Big.Big,
    unitPriceAtStartDate: Big.Big,
    orders: PortfolioOrderItem[],
    start: Date
  ) {
    return (
      !unitPriceAtEndDate ||
      (!unitPriceAtStartDate && isBefore(new Date(orders[0].date), start))
    );
  }

  public createEmptySymbolMetrics(): SymbolMetrics {
    return {
      currentValues: {},
      currentValuesWithCurrencyEffect: {},
      feesWithCurrencyEffect: new Big(0),
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
      netPerformancePercentageWithCurrencyEffectMap: {},
      netPerformanceValues: {},
      netPerformanceValuesWithCurrencyEffect: {},
      netPerformanceWithCurrencyEffectMap: {},
      timeWeightedInvestment: new Big(0),
      timeWeightedInvestmentValues: {},
      timeWeightedInvestmentValuesWithCurrencyEffect: {},
      timeWeightedInvestmentWithCurrencyEffect: new Big(0),
      totalAccountBalanceInBaseCurrency: new Big(0),
      totalDividend: new Big(0),
      totalDividendInBaseCurrency: new Big(0),
      totalInterest: new Big(0),
      totalInterestInBaseCurrency: new Big(0),
      totalInvestment: new Big(0),
      totalInvestmentWithCurrencyEffect: new Big(0),
      unitPrices: {},
      totalLiabilities: new Big(0),
      totalLiabilitiesInBaseCurrency: new Big(0),
      totalValuables: new Big(0),
      totalValuablesInBaseCurrency: new Big(0)
    };
  }

  private fillOrderUnitPricesIfMissing(
    order: PortfolioOrderItem,
    symbolMetricsHelper: PortfolioCalculatorSymbolMetricsHelperObject
  ) {
    order.unitPriceInBaseCurrency ??= this.marketSymbolMap[order.date]?.[
      order.SymbolProfile.symbol
    ].mul(symbolMetricsHelper.currentExchangeRate);

    order.unitPriceInBaseCurrencyWithCurrencyEffect ??= this.marketSymbolMap[
      order.date
    ]?.[order.SymbolProfile.symbol].mul(
      symbolMetricsHelper.exchangeRateAtOrderDate
    );
  }
}
