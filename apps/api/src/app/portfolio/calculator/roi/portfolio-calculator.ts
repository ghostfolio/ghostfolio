import { PortfolioCalculator } from '@ghostfolio/api/app/portfolio/calculator/portfolio-calculator';
import { AccumulatedValues } from '@ghostfolio/api/app/portfolio/interfaces/accumulated-values.interface';
import { HoldingPerformance } from '@ghostfolio/api/app/portfolio/interfaces/holding-performance.interface';
import { InvestedCapital } from '@ghostfolio/api/app/portfolio/interfaces/invested-capital.interface';
import { PortfolioCalculatorHolding } from '@ghostfolio/api/app/portfolio/interfaces/portfolio-calculator-holding.interface';
import { PerformancePercentages } from '@ghostfolio/api/app/portfolio/types/performance-percentages.type';
import {
  AssetProfileIdentifier,
  HistoricalDataItem
} from '@ghostfolio/common/interfaces';
import { PortfolioSnapshot } from '@ghostfolio/common/models';
import { DateRange } from '@ghostfolio/common/types';
import { PerformanceCalculationType } from '@ghostfolio/common/types/performance-calculation-type.type';

import { Big } from 'big.js';
import { mapValues, sortedLastIndex } from 'lodash-es';

/**
 * Return on Investment (ROI): the gain divided by the invested capital, without
 * time weighting.
 *
 * The invested capital of a holding is the sum of its buy amounts. It fills the
 * average investment of the holding performance. The average investment values
 * per date stay empty, because the invested capital of the portfolio is not the
 * sum of the holdings.
 *
 * The invested capital of the portfolio is the sum of the positive net
 * investment changes from date to date. Thus money which moves from one holding
 * to another on the same date counts one time only, for example a buy with cash
 * in a foreign currency. The invested capital of a date range is the value at
 * the start of the range plus the positive net investment changes during the
 * range.
 *
 * A sell amount does not reduce the invested capital, so that a sold holding
 * keeps its share of the gain. Therefore money which moves from one holding to
 * another on different dates counts two times.
 */
export class RoiPortfolioCalculator extends PortfolioCalculator {
  protected calculateOverallPerformance({
    accumulatedValuesByDate,
    positions
  }: {
    accumulatedValuesByDate: { [date: string]: AccumulatedValues };
    positions: PortfolioCalculatorHolding[];
  }): PortfolioSnapshot {
    // The invested capital of the portfolio at the last date
    const { investedCapital, investedCapitalWithCurrencyEffect } =
      Object.values(
        this.getInvestedCapitalByDate({ accumulatedValuesByDate })
      ).at(-1) ?? {
        investedCapital: new Big(0),
        investedCapitalWithCurrencyEffect: new Big(0)
      };

    return this.getOverallPerformance({
      investedCapital,
      investedCapitalWithCurrencyEffect,
      positions
    });
  }

  protected calculatePerformancePercentages({
    accumulatedValuesByDate
  }: {
    accumulatedValuesByDate: { [date: string]: AccumulatedValues };
  }): { [date: string]: PerformancePercentages } {
    const investedCapitalByDate = this.getInvestedCapitalByDate({
      accumulatedValuesByDate
    });

    return mapValues(accumulatedValuesByDate, (accumulatedValues, date) => {
      return this.getPerformancePercentagesOfAccumulatedValues({
        accumulatedValues,
        ...investedCapitalByDate[date]
      });
    });
  }

  protected calculatePerformancePercentagesForDateRange({
    historicalDataItems
  }: {
    historicalDataItems: HistoricalDataItem[];
  }): { [date: string]: PerformancePercentages } {
    let investedCapital = 0;
    let investedCapitalWithCurrencyEffect = 0;

    const performancePercentagesByDate: {
      [date: string]: PerformancePercentages;
    } = {};

    for (const [index, historicalDataItem] of historicalDataItems.entries()) {
      if (index === 0) {
        // The invested capital of the date range starts with the value at
        // the start date
        investedCapital = historicalDataItem.value;
        investedCapitalWithCurrencyEffect =
          historicalDataItem.valueWithCurrencyEffect;
      } else {
        // A positive net investment change of the portfolio increases the
        // invested capital. A negative change does not reduce it, so that a
        // sold holding keeps its share of the gain.
        const investmentChange =
          historicalDataItem.totalInvestment -
          historicalDataItems[index - 1].totalInvestment;

        if (investmentChange > 0) {
          investedCapital += investmentChange;
        }

        const investmentChangeWithCurrencyEffect =
          historicalDataItem.totalInvestmentValueWithCurrencyEffect -
          historicalDataItems[index - 1].totalInvestmentValueWithCurrencyEffect;

        if (investmentChangeWithCurrencyEffect > 0) {
          investedCapitalWithCurrencyEffect +=
            investmentChangeWithCurrencyEffect;
        }
      }

      performancePercentagesByDate[historicalDataItem.date] =
        this.getPerformancePercentagesOfHistoricalDataItem({
          historicalDataItem,
          investedCapital,
          investedCapitalWithCurrencyEffect
        });
    }

    return performancePercentagesByDate;
  }

  protected getHoldingPerformance({
    chartDates,
    dataSource,
    end,
    exchangeRates,
    marketSymbolMap,
    start,
    symbol
  }: {
    chartDates: string[];
    end: Date;
    exchangeRates: { [dateString: string]: number };
    marketSymbolMap: {
      [date: string]: { [assetProfileIdentifier: string]: Big };
    };
    start: Date;
  } & AssetProfileIdentifier): HoldingPerformance {
    const { holdingPerformance, valuation } =
      this.getMethodIndependentHoldingPerformance({
        chartDates,
        dataSource,
        end,
        exchangeRates,
        marketSymbolMap,
        start,
        symbol
      });

    if (!valuation) {
      return holdingPerformance;
    }

    const {
      currentValuesWithCurrencyEffect,
      dateRanges,
      daysInMarket,
      indexOfEndActivity,
      indexOfStartActivity,
      items
    } = valuation;

    let investedCapital = new Big(0);
    let investedCapitalWithCurrencyEffect = new Big(0);

    for (let i = indexOfStartActivity + 1; i <= indexOfEndActivity; i += 1) {
      const item = items[i];

      // A buy amount is a positive transaction investment. A sell amount does
      // not reduce the invested capital, so that a sold holding keeps its
      // share of the gain.
      if (item.transactionInvestment.gt(0)) {
        investedCapital = investedCapital.plus(item.transactionInvestment);

        investedCapitalWithCurrencyEffect =
          investedCapitalWithCurrencyEffect.plus(
            item.transactionInvestmentWithCurrencyEffect
          );
      }
    }

    // The sum of the buy amounts up to each item. The items are in
    // chronological order.
    const buyAmountsAccumulatedWithCurrencyEffect: Big[] = [];
    let buyAmountWithCurrencyEffect = new Big(0);

    for (const { transactionInvestmentWithCurrencyEffect } of items) {
      if (transactionInvestmentWithCurrencyEffect.gt(0)) {
        buyAmountWithCurrencyEffect = buyAmountWithCurrencyEffect.plus(
          transactionInvestmentWithCurrencyEffect
        );
      }

      buyAmountsAccumulatedWithCurrencyEffect.push(buyAmountWithCurrencyEffect);
    }

    const itemDates = items.map(({ date }) => {
      return date;
    });

    const investedCapitalByDateRange: { [key: DateRange]: Big } = {};

    for (const { dateRange, endDateString, startDateString } of dateRanges) {
      const buyAmountUntilEndDateWithCurrencyEffect =
        buyAmountsAccumulatedWithCurrencyEffect[
          sortedLastIndex(itemDates, endDateString) - 1
        ] ?? new Big(0);

      const buyAmountUntilStartDateWithCurrencyEffect =
        buyAmountsAccumulatedWithCurrencyEffect[
          sortedLastIndex(itemDates, startDateString) - 1
        ] ?? new Big(0);

      // The invested capital of the date range is the value at the start date
      // plus the buy amounts during the range
      investedCapitalByDateRange[dateRange] = (
        currentValuesWithCurrencyEffect[startDateString] ?? new Big(0)
      ).plus(
        buyAmountUntilEndDateWithCurrencyEffect.minus(
          buyAmountUntilStartDateWithCurrencyEffect
        )
      );
    }

    return this.getHoldingPerformanceWithInvestedCapital({
      daysInMarket,
      holdingPerformance,
      investedCapital,
      investedCapitalByDateRange,
      investedCapitalWithCurrencyEffect
    });
  }

  protected getPerformanceCalculationType() {
    return PerformanceCalculationType.ROI;
  }

  /**
   * Returns the invested capital of the portfolio per date: the sum of the
   * positive net investment changes up to the date
   */
  private getInvestedCapitalByDate({
    accumulatedValuesByDate
  }: {
    accumulatedValuesByDate: { [date: string]: AccumulatedValues };
  }) {
    let investedCapital = new Big(0);
    let investedCapitalWithCurrencyEffect = new Big(0);
    let previousTotalInvestmentValue = new Big(0);
    let previousTotalInvestmentValueWithCurrencyEffect = new Big(0);

    const investedCapitalByDate: { [date: string]: InvestedCapital } = {};

    // The dates are in chronological order
    for (const [
      date,
      { totalInvestmentValue, totalInvestmentValueWithCurrencyEffect }
    ] of Object.entries(accumulatedValuesByDate)) {
      // A positive net investment change of the portfolio increases the
      // invested capital. A negative change does not reduce it, so that a sold
      // holding keeps its share of the gain.
      const investmentChange = totalInvestmentValue.minus(
        previousTotalInvestmentValue
      );

      if (investmentChange.gt(0)) {
        investedCapital = investedCapital.plus(investmentChange);
      }

      const investmentChangeWithCurrencyEffect =
        totalInvestmentValueWithCurrencyEffect.minus(
          previousTotalInvestmentValueWithCurrencyEffect
        );

      if (investmentChangeWithCurrencyEffect.gt(0)) {
        investedCapitalWithCurrencyEffect =
          investedCapitalWithCurrencyEffect.plus(
            investmentChangeWithCurrencyEffect
          );
      }

      previousTotalInvestmentValue = totalInvestmentValue;

      previousTotalInvestmentValueWithCurrencyEffect =
        totalInvestmentValueWithCurrencyEffect;

      investedCapitalByDate[date] = {
        investedCapital,
        investedCapitalWithCurrencyEffect
      };
    }

    return investedCapitalByDate;
  }
}
