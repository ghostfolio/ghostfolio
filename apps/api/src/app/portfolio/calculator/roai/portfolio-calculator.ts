import { PortfolioCalculator } from '@ghostfolio/api/app/portfolio/calculator/portfolio-calculator';
import { AccumulatedValues } from '@ghostfolio/api/app/portfolio/interfaces/accumulated-values.interface';
import { AverageInvestmentItem } from '@ghostfolio/api/app/portfolio/interfaces/average-investment-item.interface';
import { HoldingPerformance } from '@ghostfolio/api/app/portfolio/interfaces/holding-performance.interface';
import { PortfolioCalculatorHolding } from '@ghostfolio/api/app/portfolio/interfaces/portfolio-calculator-holding.interface';
import { WeightedInvestment } from '@ghostfolio/api/app/portfolio/interfaces/weighted-investment.interface';
import { PerformancePercentages } from '@ghostfolio/api/app/portfolio/types/performance-percentages.type';
import { getSum } from '@ghostfolio/common/helper';
import {
  AssetProfileIdentifier,
  HistoricalDataItem
} from '@ghostfolio/common/interfaces';
import { PortfolioSnapshot } from '@ghostfolio/common/models';
import { DateRange } from '@ghostfolio/common/types';
import { PerformanceCalculationType } from '@ghostfolio/common/types/performance-calculation-type.type';

import { Big } from 'big.js';
import { mapValues, sortedIndex } from 'lodash-es';

import { differenceInAccountingDays } from './accounting-days';

export class RoaiPortfolioCalculator extends PortfolioCalculator {
  protected calculateOverallPerformance({
    positions
  }: {
    accumulatedValuesByDate: { [date: string]: AccumulatedValues };
    positions: PortfolioCalculatorHolding[];
  }): PortfolioSnapshot {
    // The invested capital of the portfolio is the sum of the average
    // investments of the holdings
    const positionsIncludedInPerformance = positions.filter(
      ({ includeInPerformance }) => {
        return includeInPerformance;
      }
    );

    return this.getOverallPerformance({
      positions,
      investedCapital: getSum(
        positionsIncludedInPerformance.map(({ averageInvestment }) => {
          return averageInvestment;
        })
      ),
      investedCapitalWithCurrencyEffect: getSum(
        positionsIncludedInPerformance.map(
          ({ averageInvestmentWithCurrencyEffect }) => {
            return averageInvestmentWithCurrencyEffect;
          }
        )
      )
    });
  }

  protected calculatePerformancePercentages({
    accumulatedValuesByDate
  }: {
    accumulatedValuesByDate: { [date: string]: AccumulatedValues };
  }): { [date: string]: PerformancePercentages } {
    return mapValues(accumulatedValuesByDate, (accumulatedValues) => {
      return this.getPerformancePercentagesOfAccumulatedValues({
        accumulatedValues,
        investedCapital: accumulatedValues.totalAverageInvestmentValue,
        investedCapitalWithCurrencyEffect:
          accumulatedValues.totalAverageInvestmentValueWithCurrencyEffect
      });
    });
  }

  protected calculatePerformancePercentagesForDateRange({
    historicalDataItems
  }: {
    historicalDataItems: HistoricalDataItem[];
  }): { [date: string]: PerformancePercentages } {
    const performancePercentagesByDate: {
      [date: string]: PerformancePercentages;
    } = {};

    if (historicalDataItems.length === 0) {
      return performancePercentagesByDate;
    }

    const dates = historicalDataItems.map(({ date }) => date);

    const daysUntilNextItem = dates.slice(1).map((nextDate, index) => {
      return differenceInAccountingDays(nextDate, dates[index]);
    });

    // Take the values at the start date from the first day of the date range
    const [firstHistoricalDataItem] = historicalDataItems;

    const weightedInvestments = this.getWeightedInvestments({
      grossPerformanceAtStartDate: new Big(firstHistoricalDataItem.value).minus(
        firstHistoricalDataItem.totalInvestment
      ),
      items: historicalDataItems.map(({ totalInvestment }, index) => {
        return {
          daysUntilNextItem: daysUntilNextItem[index],
          investment: new Big(totalInvestment)
        };
      })
    });

    const weightedInvestmentsWithCurrencyEffect = this.getWeightedInvestments({
      grossPerformanceAtStartDate: new Big(
        firstHistoricalDataItem.valueWithCurrencyEffect
      ).minus(firstHistoricalDataItem.totalInvestmentValueWithCurrencyEffect),
      items: historicalDataItems.map(
        ({ totalInvestmentValueWithCurrencyEffect }, index) => {
          return {
            daysUntilNextItem: daysUntilNextItem[index],
            investment: new Big(totalInvestmentValueWithCurrencyEffect)
          };
        }
      )
    });

    for (const [index, historicalDataItem] of historicalDataItems.entries()) {
      performancePercentagesByDate[historicalDataItem.date] =
        this.getPerformancePercentagesOfHistoricalDataItem({
          historicalDataItem,
          investedCapital: this.getAverageInvestment(
            weightedInvestments[index]
          ).toNumber(),
          investedCapitalWithCurrencyEffect: this.getAverageInvestment(
            weightedInvestmentsWithCurrencyEffect[index]
          ).toNumber()
        });
    }

    return performancePercentagesByDate;
  }

  protected getHoldingPerformance({
    chartDates,
    dataSource,
    daysUntilNextChartDate,
    end,
    exchangeRates,
    marketSymbolMap,
    start,
    symbol
  }: {
    chartDates: string[];
    daysUntilNextChartDate: number[];
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
      investmentValuesAccumulatedWithCurrencyEffect,
      items
    } = valuation;

    const averageInvestmentValues: { [date: string]: Big } = {};

    const averageInvestmentValuesWithCurrencyEffect: {
      [date: string]: Big;
    } = {};

    let investmentAtStartDate: Big;
    let investmentAtStartDateWithCurrencyEffect: Big;
    let valueAtStartDate: Big;
    let valueAtStartDateWithCurrencyEffect: Big;

    let sumOfWeightedInvestments = new Big(0);
    let sumOfWeightedInvestmentsWithCurrencyEffect = new Big(0);
    let totalInvestmentDays = 0;

    for (let i = 0; i < items.length; i += 1) {
      const item = items[i];

      if (!investmentAtStartDate && i >= indexOfStartActivity) {
        investmentAtStartDate = item.investmentBeforeTransaction;

        investmentAtStartDateWithCurrencyEffect =
          item.investmentBeforeTransactionWithCurrencyEffect;

        valueAtStartDate = item.valueBeforeTransaction;

        valueAtStartDateWithCurrencyEffect =
          item.valueBeforeTransactionWithCurrencyEffect;
      }

      if (i > indexOfStartActivity) {
        // Only consider periods with an investment for the calculation of
        // the average investment
        if (
          item.valueBeforeTransaction.gt(0) &&
          ['BUY', 'SELL'].includes(item.type)
        ) {
          // Calculate the number of days since the previous activity
          let daysSinceLastActivity = differenceInAccountingDays(
            item.date,
            items[i - 1].date
          );
          if (daysSinceLastActivity <= 0) {
            // The time between two activities on the same day is unknown
            // -> Set it to the smallest floating point number greater than 0
            daysSinceLastActivity = Number.EPSILON;
          }

          // Sum up the total investment days since the start date to calculate
          // the average investment
          totalInvestmentDays += daysSinceLastActivity;

          sumOfWeightedInvestments = sumOfWeightedInvestments.add(
            valueAtStartDate
              .minus(investmentAtStartDate)
              .plus(item.investmentBeforeTransaction)
              .mul(daysSinceLastActivity)
          );

          sumOfWeightedInvestmentsWithCurrencyEffect =
            sumOfWeightedInvestmentsWithCurrencyEffect.add(
              valueAtStartDateWithCurrencyEffect
                .minus(investmentAtStartDateWithCurrencyEffect)
                .plus(item.investmentBeforeTransactionWithCurrencyEffect)
                .mul(daysSinceLastActivity)
            );
        }

        // If duration is effectively zero (first day), use the actual investment as the base.
        // Otherwise, use the calculated average investment.
        averageInvestmentValues[item.date] =
          totalInvestmentDays > Number.EPSILON
            ? sumOfWeightedInvestments.div(totalInvestmentDays)
            : item.investment.gt(0)
              ? item.investment
              : new Big(0);

        averageInvestmentValuesWithCurrencyEffect[item.date] =
          totalInvestmentDays > Number.EPSILON
            ? sumOfWeightedInvestmentsWithCurrencyEffect.div(
                totalInvestmentDays
              )
            : item.investmentWithCurrencyEffect.gt(0)
              ? item.investmentWithCurrencyEffect
              : new Big(0);
      }

      if (i === indexOfEndActivity) {
        break;
      }
    }

    const averageInvestmentBetweenStartAndEndDate =
      totalInvestmentDays > 0
        ? sumOfWeightedInvestments.div(totalInvestmentDays)
        : new Big(0);

    const averageInvestmentBetweenStartAndEndDateWithCurrencyEffect =
      totalInvestmentDays > 0
        ? sumOfWeightedInvestmentsWithCurrencyEffect.div(totalInvestmentDays)
        : new Big(0);

    const averageInvestmentByDateRange: { [key: DateRange]: Big } = {};

    for (const {
      dateRange,
      endDateString: rangeEndDateString,
      startDateString: rangeStartDateString
    } of dateRanges) {
      const currentValuesAtDateRangeStartWithCurrencyEffect =
        currentValuesWithCurrencyEffect[rangeStartDateString] ?? new Big(0);

      const investmentValuesAccumulatedAtStartDateWithCurrencyEffect =
        investmentValuesAccumulatedWithCurrencyEffect[rangeStartDateString] ??
        new Big(0);

      const grossPerformanceAtDateRangeStartWithCurrencyEffect =
        currentValuesAtDateRangeStartWithCurrencyEffect.minus(
          investmentValuesAccumulatedAtStartDateWithCurrencyEffect
        );

      const averageInvestmentItems: AverageInvestmentItem[] = [];

      for (
        let i = sortedIndex(chartDates, rangeStartDateString);
        i < chartDates.length;
        i += 1
      ) {
        const date = chartDates[i];

        if (date > rangeEndDateString) {
          break;
        }

        averageInvestmentItems.push({
          daysUntilNextItem: daysUntilNextChartDate[i],
          investment:
            investmentValuesAccumulatedWithCurrencyEffect[date] ?? new Big(0)
        });
      }

      const weightedInvestment = this.getWeightedInvestments({
        grossPerformanceAtStartDate:
          grossPerformanceAtDateRangeStartWithCurrencyEffect,
        items: averageInvestmentItems
      }).at(-1);

      averageInvestmentByDateRange[dateRange] = weightedInvestment
        ? this.getAverageInvestment(weightedInvestment)
        : new Big(0);
    }

    const holdingPerformanceWithAverageInvestment =
      this.getHoldingPerformanceWithInvestedCapital({
        daysInMarket,
        holdingPerformance,
        investedCapital: averageInvestmentBetweenStartAndEndDate,
        investedCapitalByDateRange: averageInvestmentByDateRange,
        investedCapitalValues: averageInvestmentValues,
        investedCapitalValuesWithCurrencyEffect:
          averageInvestmentValuesWithCurrencyEffect,
        investedCapitalWithCurrencyEffect:
          averageInvestmentBetweenStartAndEndDateWithCurrencyEffect
      });

    if (PortfolioCalculator.ENABLE_LOGGING) {
      const { activities, unitPriceAtEndDate } = valuation;

      const {
        fees: feesAtStartDate,
        feesWithCurrencyEffect: feesAtStartDateWithCurrencyEffect
      } = items[indexOfStartActivity];

      const {
        fees,
        feesWithCurrencyEffect,
        quantity: totalQuantity
      } = items[indexOfEndActivity];

      const {
        grossPerformance,
        grossPerformancePercentage,
        grossPerformancePercentageWithCurrencyEffect,
        grossPerformanceWithCurrencyEffect,
        netPerformance,
        netPerformancePercentage,
        netPerformancePercentageWithCurrencyEffectMap,
        totalDividend,
        totalInvestment,
        totalInvestmentWithCurrencyEffect
      } = holdingPerformanceWithAverageInvestment;

      const feesPerUnit = totalQuantity.gt(0)
        ? fees.minus(feesAtStartDate).div(totalQuantity)
        : new Big(0);

      const feesPerUnitWithCurrencyEffect = totalQuantity.gt(0)
        ? feesWithCurrencyEffect
            .minus(feesAtStartDateWithCurrencyEffect)
            .div(totalQuantity)
        : new Big(0);

      console.log(
        `
        ${symbol}
        Unit price: ${activities[indexOfStartActivity].unitPrice.toFixed(
          2
        )} -> ${unitPriceAtEndDate.toFixed(2)}
        Total investment: ${totalInvestment.toFixed(2)}
        Total investment with currency effect: ${totalInvestmentWithCurrencyEffect.toFixed(
          2
        )}
        Average investment: ${averageInvestmentBetweenStartAndEndDate.toFixed(
          2
        )}
        Average investment with currency effect: ${averageInvestmentBetweenStartAndEndDateWithCurrencyEffect.toFixed(
          2
        )}
        Total dividend: ${totalDividend.toFixed(2)}
        Gross performance: ${grossPerformance.toFixed(
          2
        )} / ${grossPerformancePercentage.mul(100).toFixed(2)}%
        Gross performance with currency effect: ${grossPerformanceWithCurrencyEffect.toFixed(
          2
        )} / ${grossPerformancePercentageWithCurrencyEffect
          .mul(100)
          .toFixed(2)}%
        Fees per unit: ${feesPerUnit.toFixed(2)}
        Fees per unit with currency effect: ${feesPerUnitWithCurrencyEffect.toFixed(
          2
        )}
        Net performance: ${netPerformance.toFixed(
          2
        )} / ${netPerformancePercentage.mul(100).toFixed(2)}%
        Net performance with currency effect: ${netPerformancePercentageWithCurrencyEffectMap[
          'max'
        ].toFixed(2)}%`
      );
    }

    return holdingPerformanceWithAverageInvestment;
  }

  protected getPerformanceCalculationType() {
    return PerformanceCalculationType.ROAI;
  }

  private getAverageInvestment({
    grossPerformanceAtStartDate,
    investment,
    sumOfWeightedInvestments,
    totalInvestmentDays
  }: WeightedInvestment) {
    // The investment of the current item counts for this day only
    if (investment.gt(0)) {
      return sumOfWeightedInvestments
        .add(investment.add(grossPerformanceAtStartDate))
        .div(totalInvestmentDays + 1);
    }

    return totalInvestmentDays > 0
      ? sumOfWeightedInvestments.div(totalInvestmentDays)
      : new Big(0);
  }

  /**
   * Returns the sum of the weighted investments and the number of investment
   * days before each item of a date range. The chart dates are not evenly
   * spaced, and the investment changes on a chart date only. Thus the
   * investment of an item applies to each day until the next item.
   *
   * The gross performance at the start date of the range is added to each
   * investment. Thus the range starts with the value of its first day, and
   * subsequent buy and sell activities stay included.
   */
  private getWeightedInvestments({
    grossPerformanceAtStartDate,
    items
  }: {
    grossPerformanceAtStartDate: Big;
    items: AverageInvestmentItem[];
  }) {
    const weightedInvestments: WeightedInvestment[] = [];

    let sumOfWeightedInvestments = new Big(0);
    let totalInvestmentDays = 0;

    for (const [index, { investment }] of items.entries()) {
      if (index > 0) {
        const previousItem = items[index - 1];

        if (previousItem.investment.gt(0)) {
          sumOfWeightedInvestments = sumOfWeightedInvestments.add(
            previousItem.investment
              .add(grossPerformanceAtStartDate)
              .mul(previousItem.daysUntilNextItem)
          );

          totalInvestmentDays += previousItem.daysUntilNextItem;
        }
      }

      weightedInvestments.push({
        grossPerformanceAtStartDate,
        investment,
        sumOfWeightedInvestments,
        totalInvestmentDays
      });
    }

    return weightedInvestments;
  }
}
