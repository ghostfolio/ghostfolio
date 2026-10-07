import { PortfolioCalculator } from '@ghostfolio/api/app/portfolio/calculator/portfolio-calculator';
import { AccumulatedValues } from '@ghostfolio/api/app/portfolio/interfaces/accumulated-values.interface';
import { HoldingPerformance } from '@ghostfolio/api/app/portfolio/interfaces/holding-performance.interface';
import { PortfolioCalculatorActivityItem } from '@ghostfolio/api/app/portfolio/interfaces/portfolio-calculator-activity-item.interface';
import { PortfolioCalculatorHolding } from '@ghostfolio/api/app/portfolio/interfaces/portfolio-calculator-holding.interface';
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

/**
 * Return on Investment (ROI): the gain divided by the invested capital, without
 * time weighting. The invested capital of a holding is the sum of its buy
 * amounts. The invested capital of a date range is the value at the start of
 * the range plus the buy amounts during the range.
 *
 * The invested capital fills the average investment fields of the holding
 * performance, which the base class sums per date.
 */
export class RoiPortfolioCalculator extends PortfolioCalculator {
  protected calculateOverallPerformance(
    positions: PortfolioCalculatorHolding[]
  ): PortfolioSnapshot {
    let currentValueInBaseCurrency = new Big(0);
    let hasErrors = false;
    let totalFeesWithCurrencyEffect = new Big(0);
    const totalInterestWithCurrencyEffect = new Big(0);
    let totalInvestedCapital = new Big(0);
    let totalInvestedCapitalWithCurrencyEffect = new Big(0);
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
        totalInvestedCapital = totalInvestedCapital.plus(
          currentPosition.averageInvestment
        );

        totalInvestedCapitalWithCurrencyEffect =
          totalInvestedCapitalWithCurrencyEffect.plus(
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
    // the performance, gives a dividend but no invested capital. Such a
    // holding makes the dividend yield too high. Therefore the dividend yield
    // stays 0 in this case.
    const hasDividendWithoutInvestedCapital = positions.some(
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
        hasDividendWithoutInvestedCapital || totalInvestedCapital.eq(0)
          ? new Big(0)
          : totalDividendInBaseCurrency.div(totalInvestedCapital)
    });

    const dividendYieldPercentWithCurrencyEffect =
      getAnnualizedPerformancePercent({
        daysInMarket,
        netPerformancePercentage:
          hasDividendWithoutInvestedCapital ||
          totalInvestedCapitalWithCurrencyEffect.eq(0)
            ? new Big(0)
            : totalDividendInBaseCurrency.div(
                totalInvestedCapitalWithCurrencyEffect
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
        totalAverageInvestmentValue: totalInvestedCapital,
        totalAverageInvestmentValueWithCurrencyEffect:
          totalInvestedCapitalWithCurrencyEffect,
        totalDividendValueWithCurrencyEffect,
        totalNetPerformanceValue,
        totalNetPerformanceValueWithCurrencyEffect
      }
    ] of Object.entries(accumulatedValuesByDate)) {
      performancePercentagesByDate[date] = {
        dividendInPercentageWithCurrencyEffect:
          totalInvestedCapitalWithCurrencyEffect.eq(0)
            ? 0
            : totalDividendValueWithCurrencyEffect
                .div(totalInvestedCapitalWithCurrencyEffect)
                .toNumber(),
        netPerformanceInPercentage: totalInvestedCapital.eq(0)
          ? 0
          : totalNetPerformanceValue.div(totalInvestedCapital).toNumber(),
        netPerformanceInPercentageWithCurrencyEffect:
          totalInvestedCapitalWithCurrencyEffect.eq(0)
            ? 0
            : totalNetPerformanceValueWithCurrencyEffect
                .div(totalInvestedCapitalWithCurrencyEffect)
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
        // The buy amounts during the date range increase the invested capital.
        // The sell amounts do not reduce it, so that a sold holding keeps its
        // share of the gain.
        const investmentChange =
          historicalDataItem.totalInvestment -
          historicalDataItems[index - 1].totalInvestment;

        if (investmentChange > 0) {
          investedCapital += investmentChange;
        }

        if (historicalDataItem.investmentValueWithCurrencyEffect > 0) {
          investedCapitalWithCurrencyEffect +=
            historicalDataItem.investmentValueWithCurrencyEffect;
        }
      }

      performancePercentagesByDate[historicalDataItem.date] = {
        dividendInPercentageWithCurrencyEffect:
          investedCapitalWithCurrencyEffect > 0
            ? historicalDataItem.dividendInBaseCurrency /
              investedCapitalWithCurrencyEffect
            : 0,
        netPerformanceInPercentage:
          investedCapital > 0
            ? historicalDataItem.netPerformance / investedCapital
            : 0,
        netPerformanceInPercentageWithCurrencyEffect:
          investedCapitalWithCurrencyEffect > 0
            ? historicalDataItem.netPerformanceWithCurrencyEffect /
              investedCapitalWithCurrencyEffect
            : 0
      };
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
    const investedCapitalValues: { [date: string]: Big } = {};
    const investedCapitalValuesWithCurrencyEffect: { [date: string]: Big } = {};

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

      investedCapitalValues[item.date] = investedCapital;

      investedCapitalValuesWithCurrencyEffect[item.date] =
        investedCapitalWithCurrencyEffect;
    }

    const {
      fees: feesAtStartDate,
      grossPerformance: grossPerformanceAtStartDate,
      grossPerformanceWithCurrencyEffect:
        grossPerformanceAtStartDateWithCurrencyEffect
    } = items[indexOfStartActivity];

    const {
      fees,
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

    const totalNetPerformance = totalGrossPerformance.minus(
      fees.minus(feesAtStartDate)
    );

    const grossPerformancePercentage = investedCapital.gt(0)
      ? totalGrossPerformance.div(investedCapital)
      : new Big(0);

    const grossPerformancePercentageWithCurrencyEffect =
      investedCapitalWithCurrencyEffect.gt(0)
        ? totalGrossPerformanceWithCurrencyEffect.div(
            investedCapitalWithCurrencyEffect
          )
        : new Big(0);

    const netPerformancePercentage = investedCapital.gt(0)
      ? totalNetPerformance.div(investedCapital)
      : new Big(0);

    const daysInMarket = differenceInDays(new Date(), dateOfFirstActivity);

    const dividendYieldPercent = getAnnualizedPerformancePercent({
      daysInMarket,
      netPerformancePercentage: investedCapital.eq(0)
        ? new Big(0)
        : totalDividendInBaseCurrency.div(investedCapital)
    });

    const dividendYieldPercentWithCurrencyEffect =
      getAnnualizedPerformancePercent({
        daysInMarket,
        netPerformancePercentage: investedCapitalWithCurrencyEffect.eq(0)
          ? new Big(0)
          : totalDividendInBaseCurrency.div(investedCapitalWithCurrencyEffect)
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

      // The invested capital of the date range is the value at the start date
      // plus the buy amounts during the range
      let investedCapitalOfDateRangeWithCurrencyEffect =
        currentValuesWithCurrencyEffect[rangeStartDateString] ?? new Big(0);

      for (const item of items) {
        if (
          item.date > rangeStartDateString &&
          item.date <= rangeEndDateString &&
          item.transactionInvestmentWithCurrencyEffect.gt(0)
        ) {
          investedCapitalOfDateRangeWithCurrencyEffect =
            investedCapitalOfDateRangeWithCurrencyEffect.plus(
              item.transactionInvestmentWithCurrencyEffect
            );
        }
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

      netPerformancePercentageWithCurrencyEffectMap[dateRange] =
        investedCapitalOfDateRangeWithCurrencyEffect.gt(0)
          ? netPerformanceWithCurrencyEffectMap[dateRange].div(
              investedCapitalOfDateRangeWithCurrencyEffect
            )
          : new Big(0);
    }

    return {
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
      averageInvestment: investedCapital,
      averageInvestmentValues: investedCapitalValues,
      averageInvestmentValuesWithCurrencyEffect:
        investedCapitalValuesWithCurrencyEffect,
      averageInvestmentWithCurrencyEffect: investedCapitalWithCurrencyEffect,
      grossPerformance: totalGrossPerformance,
      grossPerformanceWithCurrencyEffect:
        totalGrossPerformanceWithCurrencyEffect,
      hasErrors: totalQuantity.gt(0) && (!initialValue || !unitPriceAtEndDate),
      netPerformance: totalNetPerformance
    };
  }

  protected getPerformanceCalculationType() {
    return PerformanceCalculationType.ROI;
  }
}
