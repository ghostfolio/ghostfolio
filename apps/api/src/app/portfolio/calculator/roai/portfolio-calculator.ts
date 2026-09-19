import { PortfolioCalculator } from '@ghostfolio/api/app/portfolio/calculator/portfolio-calculator';
import { HoldingPerformance } from '@ghostfolio/api/app/portfolio/interfaces/holding-performance.interface';
import { PortfolioCalculatorActivityItem } from '@ghostfolio/api/app/portfolio/interfaces/portfolio-calculator-activity-item.interface';
import { PortfolioCalculatorHolding } from '@ghostfolio/api/app/portfolio/interfaces/portfolio-calculator-holding.interface';
import { getIntervalFromDateRange } from '@ghostfolio/common/calculation-helper';
import {
  DATE_FORMAT,
  getAssetProfileIdentifier,
  parseDate
} from '@ghostfolio/common/helper';
import { AssetProfileIdentifier } from '@ghostfolio/common/interfaces';
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

export class RoaiPortfolioCalculator extends PortfolioCalculator {
  protected calculateOverallPerformance(
    positions: PortfolioCalculatorHolding[]
  ): PortfolioSnapshot {
    let currentValueInBaseCurrency = new Big(0);
    let grossPerformance = new Big(0);
    let grossPerformanceWithCurrencyEffect = new Big(0);
    let hasErrors = false;
    let netPerformance = new Big(0);
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

      if (currentPosition.grossPerformance) {
        grossPerformance = grossPerformance.plus(
          currentPosition.grossPerformance
        );

        grossPerformanceWithCurrencyEffect =
          grossPerformanceWithCurrencyEffect.plus(
            currentPosition.grossPerformanceWithCurrencyEffect
          );

        netPerformance = netPerformance.plus(currentPosition.netPerformance);
      } else if (!currentPosition.quantity.eq(0)) {
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

    return {
      currentValueInBaseCurrency,
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

      let average = new Big(0);
      let dayCount = 0;

      for (let i = chartDates.length - 1; i >= 0; i -= 1) {
        const date = chartDates[i];

        if (date > rangeEndDateString) {
          continue;
        } else if (date < rangeStartDateString) {
          break;
        }

        if (
          investmentValuesAccumulatedWithCurrencyEffect[date] instanceof Big &&
          investmentValuesAccumulatedWithCurrencyEffect[date].gt(0)
        ) {
          average = average.add(
            investmentValuesAccumulatedWithCurrencyEffect[date].add(
              grossPerformanceAtDateRangeStartWithCurrencyEffect
            )
          );

          dayCount++;
        }
      }

      if (dayCount > 0) {
        average = average.div(dayCount);
      }

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
}
