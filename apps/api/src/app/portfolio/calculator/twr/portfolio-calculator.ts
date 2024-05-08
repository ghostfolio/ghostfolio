import { PortfolioCalculator } from '@ghostfolio/api/app/portfolio/calculator/portfolio-calculator';
import { PortfolioOrderItem } from '@ghostfolio/api/app/portfolio/interfaces/portfolio-order-item.interface';
import { getFactor } from '@ghostfolio/api/helper/portfolio.helper';
import { DATE_FORMAT } from '@ghostfolio/common/helper';
import { SymbolMetrics, UniqueAsset } from '@ghostfolio/common/interfaces';
import { PortfolioSnapshot, TimelinePosition } from '@ghostfolio/common/models';

import { Logger } from '@nestjs/common';
import { Big } from 'big.js';
import {
  addDays,
  addMilliseconds,
  differenceInDays,
  format,
  isBefore
} from 'date-fns';
import { cloneDeep, first, last, sortBy } from 'lodash';

export class TWRPortfolioCalculator extends PortfolioCalculator {
  protected calculateOverallPerformance(
    positions: TimelinePosition[]
  ): PortfolioSnapshot {
    let currentValueInBaseCurrency = new Big(0);
    let grossPerformance = new Big(0);
    let grossPerformanceWithCurrencyEffect = new Big(0);
    let hasErrors = false;
    let netPerformance = new Big(0);
    let netPerformanceWithCurrencyEffect = new Big(0);
    let totalFeesWithCurrencyEffect = new Big(0);
    let totalInterestWithCurrencyEffect = new Big(0);
    let totalInvestment = new Big(0);
    let totalInvestmentWithCurrencyEffect = new Big(0);
    let totalTimeWeightedInvestment = new Big(0);
    let totalTimeWeightedInvestmentWithCurrencyEffect = new Big(0);

    for (const currentPosition of positions) {
      if (currentPosition.fee) {
        totalFeesWithCurrencyEffect = totalFeesWithCurrencyEffect.plus(
          currentPosition.fee
        );
      }

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

    console.log(
      'Overall: totalTimeWeightedInvestmentValue',
      totalTimeWeightedInvestment.toFixed()
    );

    return {
      currentValueInBaseCurrency,
      grossPerformance,
      grossPerformanceWithCurrencyEffect,
      hasErrors,
      netPerformance,
      netPerformanceWithCurrencyEffect,
      positions,
      totalFeesWithCurrencyEffect,
      totalInterestWithCurrencyEffect,
      totalInvestment,
      totalInvestmentWithCurrencyEffect,
      chartData: [],
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
            ),
      totalLiabilitiesWithCurrencyEffect: new Big(0),
      totalValuablesWithCurrencyEffect: new Big(0)
    };
  }

  protected getSymbolMetrics({
    dataSource,
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
  } & UniqueAsset): SymbolMetrics {
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

    let totalAccountBalanceInBaseCurrency = new Big(0);
    let totalDividend = new Big(0);
    let totalDividendInBaseCurrency = new Big(0);
    let totalInterest = new Big(0);
    let totalInterestInBaseCurrency = new Big(0);
    let totalInvestment = new Big(0);
    let totalInvestmentFromBuyTransactions = new Big(0);
    let totalInvestmentFromBuyTransactionsWithCurrencyEffect = new Big(0);
    let totalInvestmentWithCurrencyEffect = new Big(0);
    let totalLiabilities = new Big(0);
    let totalLiabilitiesInBaseCurrency = new Big(0);
    let totalQuantityFromBuyTransactions = new Big(0);
    let totalUnits = new Big(0);
    let totalValuables = new Big(0);
    let totalValuablesInBaseCurrency = new Big(0);
    let valueAtStartDate: Big;
    let valueAtStartDateWithCurrencyEffect: Big;

    // Clone orders to keep the original values in this.orders
    let orders: PortfolioOrderItem[] = cloneDeep(this.activities).filter(
      ({ SymbolProfile }) => {
        return SymbolProfile.symbol === symbol;
      }
    );

    if (orders.length <= 0) {
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
        netPerformancePercentageWithCurrencyEffect: new Big(0),
        netPerformanceValues: {},
        netPerformanceValuesWithCurrencyEffect: {},
        netPerformanceWithCurrencyEffect: new Big(0),
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
        totalLiabilities: new Big(0),
        totalLiabilitiesInBaseCurrency: new Big(0),
        totalValuables: new Big(0),
        totalValuablesInBaseCurrency: new Big(0)
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
        feesWithCurrencyEffect: new Big(0),
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
        totalAccountBalanceInBaseCurrency: new Big(0),
        totalDividend: new Big(0),
        totalDividendInBaseCurrency: new Big(0),
        totalInterest: new Big(0),
        totalInterestInBaseCurrency: new Big(0),
        totalInvestment: new Big(0),
        totalInvestmentWithCurrencyEffect: new Big(0),
        totalLiabilities: new Big(0),
        totalLiabilitiesInBaseCurrency: new Big(0),
        totalValuables: new Big(0),
        totalValuablesInBaseCurrency: new Big(0)
      };
    }

    // Add a synthetic order at the start and the end date
    orders.push({
      date: format(start, DATE_FORMAT),
      fee: new Big(0),
      feeInBaseCurrency: new Big(0),
      itemType: 'start',
      quantity: new Big(0),
      SymbolProfile: {
        dataSource,
        symbol
      },
      type: 'BUY',
      unitPrice: unitPriceAtStartDate
    });

    orders.push({
      date: format(end, DATE_FORMAT),
      fee: new Big(0),
      feeInBaseCurrency: new Big(0),
      itemType: 'end',
      SymbolProfile: {
        dataSource,
        symbol
      },
      quantity: new Big(0),
      type: 'BUY',
      unitPrice: unitPriceAtEndDate
    });

    let day = start;
    let lastUnitPrice: Big;

    if (isChartMode) {
      const ordersByDate: { [date: string]: PortfolioOrderItem[] } = {};

      for (const order of orders) {
        ordersByDate[order.date] = ordersByDate[order.date] ?? [];
        ordersByDate[order.date].push(order);
      }

      while (isBefore(day, end)) {
        if (ordersByDate[format(day, DATE_FORMAT)]?.length > 0) {
          for (let order of ordersByDate[format(day, DATE_FORMAT)]) {
            order.unitPriceFromMarketData =
              marketSymbolMap[format(day, DATE_FORMAT)]?.[symbol] ??
              lastUnitPrice;
          }
        } else {
          orders.push({
            date: format(day, DATE_FORMAT),
            fee: new Big(0),
            feeInBaseCurrency: new Big(0),
            quantity: new Big(0),
            SymbolProfile: {
              dataSource,
              symbol
            },
            type: 'BUY',
            unitPrice:
              marketSymbolMap[format(day, DATE_FORMAT)]?.[symbol] ??
              lastUnitPrice,
            unitPriceFromMarketData:
              marketSymbolMap[format(day, DATE_FORMAT)]?.[symbol] ??
              lastUnitPrice
          });
        }

        const lastOrder = last(orders);

        lastUnitPrice =
          lastOrder.unitPriceFromMarketData ?? lastOrder.unitPrice;

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
        console.log(
          i + 1,
          order.date,
          order.type,
          order.itemType ? `(${order.itemType})` : ''
        );
      }

      const exchangeRateAtOrderDate = exchangeRates[order.date];

      if (order.type === 'DIVIDEND') {
        const dividend = order.quantity.mul(order.unitPrice);

        totalDividend = totalDividend.plus(dividend);
        totalDividendInBaseCurrency = totalDividendInBaseCurrency.plus(
          dividend.mul(exchangeRateAtOrderDate ?? 1)
        );
      } else if (order.type === 'INTEREST') {
        const interest = order.quantity.mul(order.unitPrice);

        totalInterest = totalInterest.plus(interest);
        totalInterestInBaseCurrency = totalInterestInBaseCurrency.plus(
          interest.mul(exchangeRateAtOrderDate ?? 1)
        );
      } else if (order.type === 'ITEM') {
        const valuables = order.quantity.mul(order.unitPrice);

        totalValuables = totalValuables.plus(valuables);
        totalValuablesInBaseCurrency = totalValuablesInBaseCurrency.plus(
          valuables.mul(exchangeRateAtOrderDate ?? 1)
        );
      } else if (order.type === 'LIABILITY') {
        const liabilities = order.quantity.mul(order.unitPrice);

        totalLiabilities = totalLiabilities.plus(liabilities);
        totalLiabilitiesInBaseCurrency = totalLiabilitiesInBaseCurrency.plus(
          liabilities.mul(exchangeRateAtOrderDate ?? 1)
        );
      }

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

      const unitPrice = ['BUY', 'SELL'].includes(order.type)
        ? order.unitPrice
        : order.unitPriceFromMarketData;

      if (unitPrice) {
        order.unitPriceInBaseCurrency = unitPrice.mul(currentExchangeRate ?? 1);

        order.unitPriceInBaseCurrencyWithCurrencyEffect = unitPrice.mul(
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

      if (i > indexOfStartOrder) {
        // Only consider periods with an investment for the calculation of
        // the time weighted investment
        if (
          valueOfInvestmentBeforeTransaction.gt(0) &&
          ['BUY', 'SELL'].includes(order.type)
        ) {
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
      feesWithCurrencyEffect,
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
      totalAccountBalanceInBaseCurrency,
      totalDividend,
      totalDividendInBaseCurrency,
      totalInterest,
      totalInterestInBaseCurrency,
      totalInvestment,
      totalInvestmentWithCurrencyEffect,
      totalLiabilities,
      totalLiabilitiesInBaseCurrency,
      totalValuables,
      totalValuablesInBaseCurrency,
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
