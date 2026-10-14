import { PortfolioCalculator } from '@ghostfolio/api/app/portfolio/calculator/portfolio-calculator';
import { AccumulatedValues } from '@ghostfolio/api/app/portfolio/interfaces/accumulated-values.interface';
import { HoldingPerformance } from '@ghostfolio/api/app/portfolio/interfaces/holding-performance.interface';
import { PortfolioCalculatorHolding } from '@ghostfolio/api/app/portfolio/interfaces/portfolio-calculator-holding.interface';
import { PerformancePercentages } from '@ghostfolio/api/app/portfolio/types/performance-percentages.type';
import { getAnnualizedPerformancePercent } from '@ghostfolio/common/calculation-helper';
import { DATE_FORMAT } from '@ghostfolio/common/helper';
import {
  AssetProfileIdentifier,
  HistoricalDataItem
} from '@ghostfolio/common/interfaces';
import { PortfolioSnapshot } from '@ghostfolio/common/models';
import { DateRange } from '@ghostfolio/common/types';
import { PerformanceCalculationType } from '@ghostfolio/common/types/performance-calculation-type.type';

import { Big } from 'big.js';
import { differenceInDays, format } from 'date-fns';

export class RoiPortfolioCalculator extends PortfolioCalculator {
  protected calculateOverallPerformance(
    positions: PortfolioCalculatorHolding[],
    accumulatedValuesByDate: { [date: string]: AccumulatedValues }
  ): PortfolioSnapshot {
    const {
      currentValueInBaseCurrency,
      hasErrors,
      totalFeesWithCurrencyEffect,
      totalInvestment,
      totalInvestmentWithCurrencyEffect
    } = this.getTotalsOfPositions(positions);

    const dateOfFirstActivity = this.getStartDate();

    const daysInMarket = dateOfFirstActivity
      ? differenceInDays(new Date(), dateOfFirstActivity)
      : 0;

    // The values of the last chart date contain the dividends and the buys of
    // the holdings with market prices only. Thus, the dividend yield is not
    // distorted by holdings without a total buy value.
    const lastAccumulatedValues = Object.values(accumulatedValuesByDate).at(-1);

    const totalBuyValue = lastAccumulatedValues?.totalBuyValue ?? new Big(0);

    const totalBuyValueWithCurrencyEffect =
      lastAccumulatedValues?.totalBuyValueWithCurrencyEffect ?? new Big(0);

    const totalDividendValueWithCurrencyEffect =
      lastAccumulatedValues?.totalDividendValueWithCurrencyEffect ?? new Big(0);

    const dividendYieldPercent = getAnnualizedPerformancePercent({
      daysInMarket,
      netPerformancePercentage: totalBuyValue.eq(0)
        ? new Big(0)
        : totalDividendValueWithCurrencyEffect.div(totalBuyValue)
    });

    const dividendYieldPercentWithCurrencyEffect =
      getAnnualizedPerformancePercent({
        daysInMarket,
        netPerformancePercentage: totalBuyValueWithCurrencyEffect.eq(0)
          ? new Big(0)
          : totalDividendValueWithCurrencyEffect.div(
              totalBuyValueWithCurrencyEffect
            )
      });

    return {
      currentValueInBaseCurrency,
      dividendYieldPercent,
      dividendYieldPercentWithCurrencyEffect,
      hasErrors,
      positions,
      totalFeesWithCurrencyEffect,
      totalInvestment,
      totalInvestmentWithCurrencyEffect,
      activitiesCount: this.activities.filter(({ type }) => {
        return ['BUY', 'SELL'].includes(type);
      }).length,
      createdAt: new Date(),
      errors: [],
      historicalData: [],
      totalCashInBaseCurrency: new Big(0),
      totalInterestWithCurrencyEffect: new Big(0),
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

    // The portfolio snapshot starts before the first activity, thus the
    // invested capital of each date is the total buy value
    for (const [
      date,
      {
        totalBuyValue,
        totalBuyValueWithCurrencyEffect,
        totalDividendValueWithCurrencyEffect,
        totalNetPerformanceValue,
        totalNetPerformanceValueWithCurrencyEffect
      }
    ] of Object.entries(accumulatedValuesByDate)) {
      performancePercentagesByDate[date] = {
        dividendInPercentageWithCurrencyEffect:
          totalBuyValueWithCurrencyEffect.eq(0)
            ? 0
            : totalDividendValueWithCurrencyEffect
                .div(totalBuyValueWithCurrencyEffect)
                .toNumber(),
        netPerformanceInPercentage: totalBuyValue.eq(0)
          ? 0
          : totalNetPerformanceValue.div(totalBuyValue).toNumber(),
        netPerformanceInPercentageWithCurrencyEffect:
          totalBuyValueWithCurrencyEffect.eq(0)
            ? 0
            : totalNetPerformanceValueWithCurrencyEffect
                .div(totalBuyValueWithCurrencyEffect)
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

    // The invested capital of the date range is the value at its start date
    // plus the value of each buy within the date range
    const [firstHistoricalDataItem] = historicalDataItems;

    for (const historicalDataItem of historicalDataItems) {
      const investedCapital = new Big(firstHistoricalDataItem.value ?? 0)
        .plus(historicalDataItem.totalBuyValue ?? 0)
        .minus(firstHistoricalDataItem.totalBuyValue ?? 0);

      const investedCapitalWithCurrencyEffect = new Big(
        firstHistoricalDataItem.valueWithCurrencyEffect ?? 0
      )
        .plus(historicalDataItem.totalBuyValueWithCurrencyEffect ?? 0)
        .minus(firstHistoricalDataItem.totalBuyValueWithCurrencyEffect ?? 0);

      performancePercentagesByDate[historicalDataItem.date] = {
        dividendInPercentageWithCurrencyEffect:
          investedCapitalWithCurrencyEffect.gt(0)
            ? new Big(historicalDataItem.dividendInBaseCurrency ?? 0)
                .div(investedCapitalWithCurrencyEffect)
                .toNumber()
            : 0,
        netPerformanceInPercentage: investedCapital.gt(0)
          ? new Big(historicalDataItem.netPerformance ?? 0)
              .div(investedCapital)
              .toNumber()
          : 0,
        netPerformanceInPercentageWithCurrencyEffect:
          investedCapitalWithCurrencyEffect.gt(0)
            ? new Big(historicalDataItem.netPerformanceWithCurrencyEffect ?? 0)
                .div(investedCapitalWithCurrencyEffect)
                .toNumber()
            : 0
      };
    }

    return performancePercentagesByDate;
  }

  protected getAdditionalHistoricalDataItemValues({
    totalBuyValue,
    totalBuyValueWithCurrencyEffect
  }: AccumulatedValues): Partial<HistoricalDataItem> {
    return {
      totalBuyValue: totalBuyValue.toNumber(),
      totalBuyValueWithCurrencyEffect:
        totalBuyValueWithCurrencyEffect.toNumber()
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
    daysUntilNextChartDate: number[];
    end: Date;
    exchangeRates: { [dateString: string]: number };
    marketSymbolMap: {
      [date: string]: { [assetProfileIdentifier: string]: Big };
    };
    start: Date;
  } & AssetProfileIdentifier): HoldingPerformance {
    const holdingValuationOfPeriod = this.getHoldingValuationOfPeriod({
      chartDates,
      dataSource,
      end,
      exchangeRates,
      marketSymbolMap,
      start,
      symbol
    });

    // `!` does not narrow the union under `strictNullChecks: false`
    if (holdingValuationOfPeriod.hasMarketPrices === false) {
      return holdingValuationOfPeriod.holdingPerformance;
    }

    const {
      dateOfFirstActivity,
      holdingValuation: {
        buyValuesAccumulated,
        buyValuesAccumulatedWithCurrencyEffect,
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
      },
      totalDividend,
      totalDividendInBaseCurrency,
      totalInterestInBaseCurrency,
      totalLiabilitiesInBaseCurrency,
      unitPriceAtEndDate
    } = holdingValuationOfPeriod;

    const endItem = items.find(({ itemType }) => {
      return itemType === 'end';
    });

    const startItem = items.find(({ itemType }) => {
      return itemType === 'start';
    });

    const endDateString = format(end, DATE_FORMAT);

    // The invested capital of the period is the value at the start date plus
    // the value of each buy. A sell does not reduce it.
    const investedCapital = startItem.value.plus(
      buyValuesAccumulated[endDateString] ?? new Big(0)
    );

    const investedCapitalWithCurrencyEffect =
      startItem.valueWithCurrencyEffect.plus(
        buyValuesAccumulatedWithCurrencyEffect[endDateString] ?? new Big(0)
      );

    const totalGrossPerformance = endItem.grossPerformance.minus(
      startItem.grossPerformance
    );

    const totalGrossPerformanceWithCurrencyEffect =
      endItem.grossPerformanceWithCurrencyEffect.minus(
        startItem.grossPerformanceWithCurrencyEffect
      );

    const totalNetPerformance = totalGrossPerformance.minus(
      endItem.fees.minus(startItem.fees)
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

    for (const dateRange of this.getDateRanges({ end, start })) {
      const { rangeEndDateString, rangeStartDateString } =
        this.getDateRangeBoundaries({ dateRange, start });

      netPerformanceWithCurrencyEffectMap[dateRange] =
        this.getNetPerformanceOfDateRange({
          dateRange,
          netPerformanceValuesWithCurrencyEffect,
          rangeEndDateString,
          rangeStartDateString
        });

      const investedCapitalOfDateRange = (
        currentValuesWithCurrencyEffect[rangeStartDateString] ?? new Big(0)
      )
        .plus(
          buyValuesAccumulatedWithCurrencyEffect[rangeEndDateString] ??
            new Big(0)
        )
        .minus(
          buyValuesAccumulatedWithCurrencyEffect[rangeStartDateString] ??
            new Big(0)
        );

      netPerformancePercentageWithCurrencyEffectMap[dateRange] =
        investedCapitalOfDateRange.gt(0)
          ? netPerformanceWithCurrencyEffectMap[dateRange].div(
              investedCapitalOfDateRange
            )
          : new Big(0);
    }

    return {
      buyValuesAccumulated,
      buyValuesAccumulatedWithCurrencyEffect,
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
      totalLiabilitiesInBaseCurrency,
      // The ROI does not weight the investment by time
      averageInvestment: new Big(0),
      averageInvestmentValues: {},
      averageInvestmentValuesWithCurrencyEffect: {},
      averageInvestmentWithCurrencyEffect: new Big(0),
      grossPerformance: totalGrossPerformance,
      grossPerformanceWithCurrencyEffect:
        totalGrossPerformanceWithCurrencyEffect,
      hasErrors:
        endItem.quantity.gt(0) && (!initialValue || !unitPriceAtEndDate),
      netPerformance: totalNetPerformance,
      totalInvestment: endItem.investment,
      totalInvestmentWithCurrencyEffect: endItem.investmentWithCurrencyEffect
    };
  }

  protected getPerformanceCalculationType() {
    return PerformanceCalculationType.ROI;
  }

  protected isCashIncludedInPerformance() {
    // The ROI relates the performance to the purchases of securities, so a
    // deposit of cash is neither a purchase nor a gain
    return false;
  }
}
