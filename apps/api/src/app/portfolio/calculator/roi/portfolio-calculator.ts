import { PortfolioCalculator } from '@ghostfolio/api/app/portfolio/calculator/portfolio-calculator';
import { AccumulatedValues } from '@ghostfolio/api/app/portfolio/interfaces/accumulated-values.interface';
import { HoldingPerformance } from '@ghostfolio/api/app/portfolio/interfaces/holding-performance.interface';
import { PerformancePercentages } from '@ghostfolio/api/app/portfolio/types/performance-percentages.type';
import {
  AssetProfileIdentifier,
  HistoricalDataItem
} from '@ghostfolio/common/interfaces';
import { PortfolioSnapshot } from '@ghostfolio/common/models';
import { PerformanceCalculationType } from '@ghostfolio/common/types/performance-calculation-type.type';

import { Big } from 'big.js';

export class RoiPortfolioCalculator extends PortfolioCalculator {
  protected calculateOverallPerformance(): PortfolioSnapshot {
    throw new Error('Method not implemented.');
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

  protected getHoldingPerformance({}: {
    chartDates: string[];
    end: Date;
    exchangeRates: { [dateString: string]: number };
    marketSymbolMap: {
      [date: string]: { [assetProfileIdentifier: string]: Big };
    };
    start: Date;
  } & AssetProfileIdentifier): HoldingPerformance {
    throw new Error('Method not implemented.');
  }

  protected getPerformanceCalculationType() {
    return PerformanceCalculationType.ROI;
  }
}
