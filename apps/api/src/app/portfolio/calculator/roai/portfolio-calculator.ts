import { PortfolioCalculator } from '@ghostfolio/api/app/portfolio/calculator/portfolio-calculator';
import { AccumulatedValues } from '@ghostfolio/api/app/portfolio/interfaces/accumulated-values.interface';
import { AverageInvestmentItem } from '@ghostfolio/api/app/portfolio/interfaces/average-investment-item.interface';
import { HoldingPerformance } from '@ghostfolio/api/app/portfolio/interfaces/holding-performance.interface';
import { PortfolioCalculatorActivityItem } from '@ghostfolio/api/app/portfolio/interfaces/portfolio-calculator-activity-item.interface';
import { PortfolioCalculatorHolding } from '@ghostfolio/api/app/portfolio/interfaces/portfolio-calculator-holding.interface';
import { WeightedInvestment } from '@ghostfolio/api/app/portfolio/interfaces/weighted-investment.interface';
import { PerformancePercentages } from '@ghostfolio/api/app/portfolio/types/performance-percentages.type';
import {
  getAnnualizedPerformancePercent,
  getIntervalFromDateRange
} from '@ghostfolio/common/calculation-helper';
import {
  DATE_FORMAT,
  getAssetProfileIdentifier,
  parseDate
} from '@ghostfolio/common/helper';
import {
  AssetProfileIdentifier,
  HistoricalDataItem
} from '@ghostfolio/common/interfaces';
import { PortfolioSnapshot } from '@ghostfolio/common/models';
import { DateRange } from '@ghostfolio/common/types';
import { PerformanceCalculationType } from '@ghostfolio/common/types/performance-calculation-type.type';

import { Big } from 'big.js';
import {
  differenceInDays,
  eachYearOfInterval,
  format,
  isBefore,
  isThisYear
} from 'date-fns';
import { sortedIndex } from 'lodash-es';

export class RoaiPortfolioCalculator extends PortfolioCalculator {
  protected calculateOverallPerformance(
    positions: PortfolioCalculatorHolding[]
  ): PortfolioSnapshot {
    let currentValueInBaseCurrency = new Big(0);
    let hasErrors = false;
    let totalAverageInvestment = new Big(0);
    let totalAverageInvestmentWithCurrencyEffect = new Big(0);
    let totalFeesWithCurrencyEffect = new Big(0);
    const totalInterestWithCurrencyEffect = new Big(0);
    let totalInvestment = new Big(0);
    let totalInvestmentWithCurrencyEffect = new Big(0);

    for (const currentPosition of positions) {
      if (currentPosition.valueInBaseCurrency) {
        currentValueInBaseCurrency = currentValueInBaseCurrency.plus(
          currentPosition.valueInBaseCurrency
        );
      } else {
        hasErrors = true;
      }

      if (!currentPosition.includeInPerformance) {
        continue;
      }

      if (currentPosition.feeInBaseCurrency) {
        totalFeesWithCurrencyEffect = totalFeesWithCurrencyEffect.plus(
          currentPosition.feeInBaseCurrency
        );
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

      if (
        !currentPosition.grossPerformance &&
        !currentPosition.quantity.eq(0)
      ) {
        hasErrors = true;
      }

      if (currentPosition.averageInvestment) {
        totalAverageInvestment = totalAverageInvestment.plus(
          currentPosition.averageInvestment
        );

        totalAverageInvestmentWithCurrencyEffect =
          totalAverageInvestmentWithCurrencyEffect.plus(
            currentPosition.averageInvestmentWithCurrencyEffect
          );
      } else if (!currentPosition.quantity.eq(0)) {
        this.logger.warn(
          `Missing historical market data for ${currentPosition.symbol} (${currentPosition.dataSource})`
        );

        hasErrors = true;
      }
    }

    const dateOfFirstActivity = this.getStartDate();

    const daysInMarket = dateOfFirstActivity
      ? differenceInDays(new Date(), dateOfFirstActivity)
      : 0;

    const totalDividendInBaseCurrency =
      this.getDividendInBaseCurrencyOfHoldings(positions);

    // A holding without a market price, and a holding which is excluded from
    // the performance, gives a dividend but no average investment. Such a
    // holding makes the dividend yield too high. Therefore the dividend yield
    // stays 0 in this case.
    const hasDividendWithoutAverageInvestment = positions.some(
      ({ averageInvestment, dividendInBaseCurrency, includeInPerformance }) => {
        return (
          !dividendInBaseCurrency.eq(0) &&
          (!includeInPerformance || averageInvestment.eq(0))
        );
      }
    );

    const dividendYieldPercent = getAnnualizedPerformancePercent({
      daysInMarket,
      netPerformancePercentage:
        hasDividendWithoutAverageInvestment || totalAverageInvestment.eq(0)
          ? new Big(0)
          : totalDividendInBaseCurrency.div(totalAverageInvestment)
    });

    const dividendYieldPercentWithCurrencyEffect =
      getAnnualizedPerformancePercent({
        daysInMarket,
        netPerformancePercentage:
          hasDividendWithoutAverageInvestment ||
          totalAverageInvestmentWithCurrencyEffect.eq(0)
            ? new Big(0)
            : totalDividendInBaseCurrency.div(
                totalAverageInvestmentWithCurrencyEffect
              )
      });

    return {
      currentValueInBaseCurrency,
      dividendYieldPercent,
      dividendYieldPercentWithCurrencyEffect,
      hasErrors,
      positions,
      totalFeesWithCurrencyEffect,
      totalInterestWithCurrencyEffect,
      totalInvestment,
      totalInvestmentWithCurrencyEffect,
      activitiesCount: this.activities.filter(({ type }) => {
        return ['BUY', 'SELL'].includes(type);
      }).length,
      createdAt: new Date(),
      errors: [],
      historicalData: [],
      totalCashInBaseCurrency: new Big(0),
      totalLiabilitiesWithCurrencyEffect: new Big(0)
    };
  }

  protected calculatePerformancePercentages({
    accumulatedValuesByDate
  }: {
    accumulatedValuesByDate: { [date: string]: AccumulatedValues };
  }): { [date: string]: PerformancePercentages } {
    const performancePercentagesByDate: {
      [date: string]: PerformancePercentages;
    } = {};

    for (const [
      date,
      {
        totalAverageInvestmentValue,
        totalAverageInvestmentValueWithCurrencyEffect,
        totalDividendValueWithCurrencyEffect,
        totalNetPerformanceValue,
        totalNetPerformanceValueWithCurrencyEffect
      }
    ] of Object.entries(accumulatedValuesByDate)) {
      performancePercentagesByDate[date] = {
        dividendInPercentageWithCurrencyEffect:
          totalAverageInvestmentValueWithCurrencyEffect.eq(0)
            ? 0
            : totalDividendValueWithCurrencyEffect
                .div(totalAverageInvestmentValueWithCurrencyEffect)
                .toNumber(),
        netPerformanceInPercentage: totalAverageInvestmentValue.eq(0)
          ? 0
          : totalNetPerformanceValue
              .div(totalAverageInvestmentValue)
              .toNumber(),
        netPerformanceInPercentageWithCurrencyEffect:
          totalAverageInvestmentValueWithCurrencyEffect.eq(0)
            ? 0
            : totalNetPerformanceValueWithCurrencyEffect
                .div(totalAverageInvestmentValueWithCurrencyEffect)
                .toNumber()
      };
    }

    return performancePercentagesByDate;
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

    const parsedDates = historicalDataItems.map(({ date }) => {
      return parseDate(date);
    });

    const daysUntilNextItem = parsedDates.slice(1).map((nextDate, index) => {
      return differenceInDays(nextDate, parsedDates[index]);
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
      const averageInvestmentValue = this.getAverageInvestment(
        weightedInvestments[index]
      ).toNumber();

      const averageInvestmentValueWithCurrencyEffect =
        this.getAverageInvestment(
          weightedInvestmentsWithCurrencyEffect[index]
        ).toNumber();

      performancePercentagesByDate[historicalDataItem.date] = {
        dividendInPercentageWithCurrencyEffect:
          averageInvestmentValueWithCurrencyEffect > 0
            ? historicalDataItem.dividendInBaseCurrency /
              averageInvestmentValueWithCurrencyEffect
            : 0,
        netPerformanceInPercentage:
          averageInvestmentValue > 0
            ? historicalDataItem.netPerformance / averageInvestmentValue
            : 0,
        netPerformanceInPercentageWithCurrencyEffect:
          averageInvestmentValueWithCurrencyEffect > 0
            ? historicalDataItem.netPerformanceWithCurrencyEffect /
              averageInvestmentValueWithCurrencyEffect
            : 0
      };
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
    const averageInvestmentValues: { [date: string]: Big } = {};

    const averageInvestmentValuesWithCurrencyEffect: {
      [date: string]: Big;
    } = {};

    let investmentAtStartDate: Big;
    let investmentAtStartDateWithCurrencyEffect: Big;
    let valueAtStartDate: Big;
    let valueAtStartDateWithCurrencyEffect: Big;

    const assetProfileIdentifier = getAssetProfileIdentifier({
      dataSource,
      symbol
    });

    let activities: PortfolioCalculatorActivityItem[] =
      this.activitiesByAssetProfileIdentifier[assetProfileIdentifier] ?? [];

    const isCash = activities[0]?.assetProfile?.assetSubClass === 'CASH';

    if (activities.length <= 0) {
      return this.getEmptyHoldingPerformance();
    }

    // The dividends, the interest and the liabilities are derived from the
    // activities only. Accumulate them upfront so that they survive the bail
    // out for symbols without a market price below.
    const {
      totalDividend,
      totalDividendInBaseCurrency,
      totalInterestInBaseCurrency,
      totalLiabilitiesInBaseCurrency
    } = this.getTotalsFromActivities({ activities, exchangeRates });

    const dateOfFirstActivity = parseDate(activities[0].date);

    const endDateString = format(end, DATE_FORMAT);
    const startDateString = format(start, DATE_FORMAT);

    const unitPriceAtStartDate =
      marketSymbolMap[startDateString]?.[assetProfileIdentifier];

    const unitPriceAtEndDate = this.getUnitPriceAtEndDate({
      activities,
      dataSource,
      isCash,
      marketPriceAtEndDate:
        marketSymbolMap[endDateString]?.[assetProfileIdentifier]
    });

    if (
      !unitPriceAtEndDate ||
      (!unitPriceAtStartDate && isBefore(dateOfFirstActivity, start))
    ) {
      // A missing market price can only affect the quantity which is held. The
      // dividends, the interest and the liabilities do not hold any quantity
      // and are therefore not in error.
      const hasActivitiesWithQuantity = activities.some(({ type }) => {
        return ['BUY', 'SELL'].includes(type);
      });

      return {
        ...this.getEmptyHoldingPerformance(),
        totalDividend,
        totalDividendInBaseCurrency,
        totalInterestInBaseCurrency,
        totalLiabilitiesInBaseCurrency,
        hasErrors: hasActivitiesWithQuantity
      };
    }

    activities = this.getActivitiesWithMarketPrices({
      activities,
      chartDates,
      endDateString,
      marketSymbolMap,
      startDateString,
      unitPriceAtEndDate,
      unitPriceAtStartDate,
      assetProfile: {
        dataSource,
        symbol,
        assetSubClass: isCash ? 'CASH' : undefined
      }
    });

    const {
      currentValues,
      currentValuesWithCurrencyEffect,
      dividendValuesWithCurrencyEffect,
      initialValue,
      investmentValuesAccumulated,
      investmentValuesAccumulatedWithCurrencyEffect,
      investmentValuesWithCurrencyEffect,
      items,
      netPerformanceValues,
      netPerformanceValuesWithCurrencyEffect
    } = this.getHoldingValuation({
      activities,
      exchangeRates,
      unitPriceAtStartDate
    });

    const indexOfStartActivity = items.findIndex(({ itemType }) => {
      return itemType === 'start';
    });

    const indexOfEndActivity = items.findIndex(({ itemType }) => {
      return itemType === 'end';
    });

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
          const activityDate = new Date(item.date);
          const previousActivityDate = new Date(items[i - 1].date);

          let daysSinceLastActivity = differenceInDays(
            activityDate,
            previousActivityDate
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

    const {
      fees: feesAtStartDate,
      feesWithCurrencyEffect: feesAtStartDateWithCurrencyEffect,
      grossPerformance: grossPerformanceAtStartDate,
      grossPerformanceWithCurrencyEffect:
        grossPerformanceAtStartDateWithCurrencyEffect
    } = items[indexOfStartActivity];

    const {
      fees,
      feesWithCurrencyEffect,
      grossPerformance,
      grossPerformanceWithCurrencyEffect,
      investment: totalInvestment,
      investmentWithCurrencyEffect: totalInvestmentWithCurrencyEffect,
      quantity: totalQuantity
    } = items[indexOfEndActivity];

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

    const averageInvestmentBetweenStartAndEndDate =
      totalInvestmentDays > 0
        ? sumOfWeightedInvestments.div(totalInvestmentDays)
        : new Big(0);

    const averageInvestmentBetweenStartAndEndDateWithCurrencyEffect =
      totalInvestmentDays > 0
        ? sumOfWeightedInvestmentsWithCurrencyEffect.div(totalInvestmentDays)
        : new Big(0);

    const grossPerformancePercentage =
      averageInvestmentBetweenStartAndEndDate.gt(0)
        ? totalGrossPerformance.div(averageInvestmentBetweenStartAndEndDate)
        : new Big(0);

    const grossPerformancePercentageWithCurrencyEffect =
      averageInvestmentBetweenStartAndEndDateWithCurrencyEffect.gt(0)
        ? totalGrossPerformanceWithCurrencyEffect.div(
            averageInvestmentBetweenStartAndEndDateWithCurrencyEffect
          )
        : new Big(0);

    const feesPerUnit = totalQuantity.gt(0)
      ? fees.minus(feesAtStartDate).div(totalQuantity)
      : new Big(0);

    const feesPerUnitWithCurrencyEffect = totalQuantity.gt(0)
      ? feesWithCurrencyEffect
          .minus(feesAtStartDateWithCurrencyEffect)
          .div(totalQuantity)
      : new Big(0);

    const netPerformancePercentage = averageInvestmentBetweenStartAndEndDate.gt(
      0
    )
      ? totalNetPerformance.div(averageInvestmentBetweenStartAndEndDate)
      : new Big(0);

    const daysInMarket = differenceInDays(new Date(), dateOfFirstActivity);

    const dividendYieldPercent = getAnnualizedPerformancePercent({
      daysInMarket,
      netPerformancePercentage: averageInvestmentBetweenStartAndEndDate.eq(0)
        ? new Big(0)
        : totalDividendInBaseCurrency.div(
            averageInvestmentBetweenStartAndEndDate
          )
    });

    const dividendYieldPercentWithCurrencyEffect =
      getAnnualizedPerformancePercent({
        daysInMarket,
        netPerformancePercentage:
          averageInvestmentBetweenStartAndEndDateWithCurrencyEffect.eq(0)
            ? new Big(0)
            : totalDividendInBaseCurrency.div(
                averageInvestmentBetweenStartAndEndDateWithCurrencyEffect
              )
      });

    const netPerformancePercentageWithCurrencyEffectMap: {
      [key: DateRange]: Big;
    } = {};

    const netPerformanceWithCurrencyEffectMap: {
      [key: DateRange]: Big;
    } = {};

    for (const dateRange of [
      '1d',
      '1y',
      '5y',
      'max',
      'mtd',
      'wtd',
      'ytd',
      ...eachYearOfInterval({ end, start })
        .filter((date) => {
          return !isThisYear(date);
        })
        .map((date) => {
          return format(date, 'yyyy');
        })
    ] as DateRange[]) {
      const dateInterval = getIntervalFromDateRange({ dateRange });
      const endDate = dateInterval.endDate;
      let startDate = dateInterval.startDate;

      if (isBefore(startDate, start)) {
        startDate = start;
      }

      const rangeEndDateString = format(endDate, DATE_FORMAT);
      const rangeStartDateString = format(startDate, DATE_FORMAT);

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

      const average = weightedInvestment
        ? this.getAverageInvestment(weightedInvestment)
        : new Big(0);

      netPerformanceWithCurrencyEffectMap[dateRange] =
        netPerformanceValuesWithCurrencyEffect[rangeEndDateString]?.minus(
          // If the date range is 'max', take 0 as a start value. Otherwise,
          // the value of the end of the day of the start date is taken which
          // differs from the buying price.
          dateRange === 'max'
            ? new Big(0)
            : (netPerformanceValuesWithCurrencyEffect[rangeStartDateString] ??
                new Big(0))
        ) ?? new Big(0);

      netPerformancePercentageWithCurrencyEffectMap[dateRange] = average.gt(0)
        ? netPerformanceWithCurrencyEffectMap[dateRange].div(average)
        : new Big(0);
    }

    if (PortfolioCalculator.ENABLE_LOGGING) {
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
        Net performance with currency effect: ${netPerformancePercentageWithCurrencyEffectMap[
          'max'
        ].toFixed(2)}%`
      );
    }

    return {
      averageInvestmentValues,
      averageInvestmentValuesWithCurrencyEffect,
      currentValues,
      currentValuesWithCurrencyEffect,
      dividendValuesWithCurrencyEffect,
      dividendYieldPercent,
      dividendYieldPercentWithCurrencyEffect,
      grossPerformancePercentage,
      grossPerformancePercentageWithCurrencyEffect,
      investmentValuesAccumulated,
      investmentValuesAccumulatedWithCurrencyEffect,
      investmentValuesWithCurrencyEffect,
      netPerformancePercentage,
      netPerformancePercentageWithCurrencyEffectMap,
      netPerformanceValues,
      netPerformanceValuesWithCurrencyEffect,
      netPerformanceWithCurrencyEffectMap,
      totalDividend,
      totalDividendInBaseCurrency,
      totalInterestInBaseCurrency,
      totalInvestment,
      totalInvestmentWithCurrencyEffect,
      totalLiabilitiesInBaseCurrency,
      averageInvestment: averageInvestmentBetweenStartAndEndDate,
      averageInvestmentWithCurrencyEffect:
        averageInvestmentBetweenStartAndEndDateWithCurrencyEffect,
      grossPerformance: totalGrossPerformance,
      grossPerformanceWithCurrencyEffect:
        totalGrossPerformanceWithCurrencyEffect,
      hasErrors: totalQuantity.gt(0) && (!initialValue || !unitPriceAtEndDate),
      netPerformance: totalNetPerformance
    };
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
