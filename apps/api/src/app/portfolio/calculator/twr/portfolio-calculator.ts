import { PortfolioCalculator } from '@ghostfolio/api/app/portfolio/calculator/portfolio-calculator';
import { AccumulatedValues } from '@ghostfolio/api/app/portfolio/interfaces/accumulated-values.interface';
import { HoldingPerformance } from '@ghostfolio/api/app/portfolio/interfaces/holding-performance.interface';
import { PortfolioCalculatorHolding } from '@ghostfolio/api/app/portfolio/interfaces/portfolio-calculator-holding.interface';
import { PerformancePercentages } from '@ghostfolio/api/app/portfolio/types/performance-percentages.type';
import { getAssetProfileIdentifier } from '@ghostfolio/common/helper';
import {
  AssetProfileIdentifier,
  HistoricalDataItem
} from '@ghostfolio/common/interfaces';
import { PortfolioSnapshot } from '@ghostfolio/common/models';
import { PerformanceCalculationType } from '@ghostfolio/common/types/performance-calculation-type.type';

import { Big } from 'big.js';

export class TwrPortfolioCalculator extends PortfolioCalculator {
  protected calculateOverallPerformance({
    accumulatedValuesByDate,
    positions
  }: {
    accumulatedValuesByDate: { [date: string]: AccumulatedValues };
    positions: PortfolioCalculatorHolding[];
  }): PortfolioSnapshot {
    const latestAccumulatedValues = Object.values(accumulatedValuesByDate).at(
      -1
    );

    return this.getOverallPerformance({
      investedCapital:
        latestAccumulatedValues?.totalInvestmentValue ?? new Big(0),
      investedCapitalWithCurrencyEffect:
        latestAccumulatedValues?.totalInvestmentValueWithCurrencyEffect ??
        new Big(0),
      positions
    });
  }

  protected calculatePerformancePercentages({
    accumulatedValuesByDate
  }: {
    accumulatedValuesByDate: { [date: string]: AccumulatedValues };
  }): { [date: string]: PerformancePercentages } {
    const lastDate = Object.keys(accumulatedValuesByDate).at(-1);

    const {
      cashFlowsByDate,
      dividendAdjustmentsByDate,
      performanceAdjustmentsByDate
    } = this.getPortfolioAdjustmentsByDate({
      currentExchangeRateDate: lastDate
    });

    const performancePercentagesByDate: {
      [date: string]: PerformancePercentages;
    } = {};

    let cumulativeReturn = new Big(1);
    let cumulativeReturnWithCurrencyEffect = new Big(1);
    let cumulativeReturnWithoutDividendsWithCurrencyEffect = new Big(1);
    let previousValue = new Big(0);
    let previousValueWithCurrencyEffect = new Big(0);

    for (const [date, accumulatedValues] of Object.entries(
      accumulatedValuesByDate
    )) {
      const cashFlow = cashFlowsByDate[date] ?? {
        value: new Big(0),
        valueWithCurrencyEffect: new Big(0)
      };

      const performanceAdjustment = performanceAdjustmentsByDate[date] ?? {
        value: new Big(0),
        valueWithCurrencyEffect: new Big(0)
      };

      const dividendAdjustment = dividendAdjustmentsByDate[date] ?? new Big(0);

      if (previousValue.gt(0)) {
        cumulativeReturn = cumulativeReturn.mul(
          accumulatedValues.totalCurrentValue
            .minus(cashFlow.value)
            .plus(performanceAdjustment.value)
            .div(previousValue)
        );
      }

      if (previousValueWithCurrencyEffect.gt(0)) {
        cumulativeReturnWithCurrencyEffect =
          cumulativeReturnWithCurrencyEffect.mul(
            accumulatedValues.totalCurrentValueWithCurrencyEffect
              .minus(cashFlow.valueWithCurrencyEffect)
              .plus(performanceAdjustment.valueWithCurrencyEffect)
              .div(previousValueWithCurrencyEffect)
          );

        cumulativeReturnWithoutDividendsWithCurrencyEffect =
          cumulativeReturnWithoutDividendsWithCurrencyEffect.mul(
            accumulatedValues.totalCurrentValueWithCurrencyEffect
              .minus(cashFlow.valueWithCurrencyEffect)
              .plus(performanceAdjustment.valueWithCurrencyEffect)
              .minus(dividendAdjustment)
              .div(previousValueWithCurrencyEffect)
          );
      }

      performancePercentagesByDate[date] = {
        dividendInPercentageWithCurrencyEffect:
          cumulativeReturnWithCurrencyEffect
            .minus(cumulativeReturnWithoutDividendsWithCurrencyEffect)
            .toNumber(),
        netPerformanceInPercentage: cumulativeReturn.minus(1).toNumber(),
        netPerformanceInPercentageWithCurrencyEffect:
          cumulativeReturnWithCurrencyEffect.minus(1).toNumber()
      };

      previousValue = accumulatedValues.totalCurrentValue;
      previousValueWithCurrencyEffect =
        accumulatedValues.totalCurrentValueWithCurrencyEffect;
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

    const {
      cashFlowsByDate,
      dividendAdjustmentsByDate,
      performanceAdjustmentsByDate
    } = this.getPortfolioAdjustmentsByDate({});

    let cumulativeReturn = new Big(1);
    let cumulativeReturnWithCurrencyEffect = new Big(1);
    let cumulativeReturnWithoutDividendsWithCurrencyEffect = new Big(1);

    let previousValue: Big;
    let previousValueWithCurrencyEffect: Big;

    for (const [index, historicalDataItem] of historicalDataItems.entries()) {
      const currentValue = new Big(historicalDataItem.value ?? 0);
      const currentValueWithCurrencyEffect = new Big(
        historicalDataItem.valueWithCurrencyEffect ?? 0
      );

      if (index === 0) {
        performancePercentagesByDate[historicalDataItem.date] = {
          dividendInPercentageWithCurrencyEffect: 0,
          netPerformanceInPercentage: 0,
          netPerformanceInPercentageWithCurrencyEffect: 0
        };

        previousValue = currentValue;
        previousValueWithCurrencyEffect = currentValueWithCurrencyEffect;

        continue;
      }

      const cashFlow = cashFlowsByDate[historicalDataItem.date] ?? {
        value: new Big(0),
        valueWithCurrencyEffect: new Big(0)
      };

      const performanceAdjustment = performanceAdjustmentsByDate[
        historicalDataItem.date
      ] ?? {
        value: new Big(0),
        valueWithCurrencyEffect: new Big(0)
      };

      const dividendAdjustment =
        dividendAdjustmentsByDate[historicalDataItem.date] ?? new Big(0);

      if (previousValue.gt(0)) {
        cumulativeReturn = cumulativeReturn.mul(
          currentValue
            .minus(cashFlow.value)
            .plus(performanceAdjustment.value)
            .div(previousValue)
        );
      }

      if (previousValueWithCurrencyEffect.gt(0)) {
        cumulativeReturnWithCurrencyEffect =
          cumulativeReturnWithCurrencyEffect.mul(
            currentValueWithCurrencyEffect
              .minus(cashFlow.valueWithCurrencyEffect)
              .plus(performanceAdjustment.valueWithCurrencyEffect)
              .div(previousValueWithCurrencyEffect)
          );

        cumulativeReturnWithoutDividendsWithCurrencyEffect =
          cumulativeReturnWithoutDividendsWithCurrencyEffect.mul(
            currentValueWithCurrencyEffect
              .minus(cashFlow.valueWithCurrencyEffect)
              .plus(performanceAdjustment.valueWithCurrencyEffect)
              .minus(dividendAdjustment)
              .div(previousValueWithCurrencyEffect)
          );
      }

      performancePercentagesByDate[historicalDataItem.date] = {
        dividendInPercentageWithCurrencyEffect:
          cumulativeReturnWithCurrencyEffect
            .minus(cumulativeReturnWithoutDividendsWithCurrencyEffect)
            .toNumber(),
        netPerformanceInPercentage: cumulativeReturn.minus(1).toNumber(),
        netPerformanceInPercentageWithCurrencyEffect:
          cumulativeReturnWithCurrencyEffect.minus(1).toNumber()
      };

      previousValue = currentValue;
      previousValueWithCurrencyEffect = currentValueWithCurrencyEffect;
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

    const { currentValues, currentValuesWithCurrencyEffect, dateRanges } =
      valuation;

    const assetProfileIdentifier = getAssetProfileIdentifier({
      dataSource,
      symbol
    });
    const activities =
      this.activitiesByAssetProfileIdentifier[assetProfileIdentifier] ?? [];

    const firstActivity = activities[0];
    const isCashInBaseCurrency =
      firstActivity?.assetProfile.assetSubClass === 'CASH' &&
      firstActivity.assetProfile.currency === this.getBaseCurrency() &&
      firstActivity.assetProfile.symbol === this.getBaseCurrency();

    const cashFlowsByDate: {
      [date: string]: {
        value: Big;
        valueWithCurrencyEffect: Big;
      };
    } = {};

    const currentExchangeRate = exchangeRates?.[chartDates.at(-1) ?? ''] ?? 1;

    for (const activity of activities) {
      const exchangeRateAtActivityDate = exchangeRates?.[activity.date] ?? 1;

      if (!isCashInBaseCurrency && ['BUY', 'SELL'].includes(activity.type)) {
        const factor = activity.type === 'BUY' ? 1 : -1;
        const transactionValue = activity.quantity
          .mul(activity.unitPrice)
          .mul(factor);

        const currentCashFlow = cashFlowsByDate[activity.date] ?? {
          value: new Big(0),
          valueWithCurrencyEffect: new Big(0)
        };

        cashFlowsByDate[activity.date] = {
          value: currentCashFlow.value.plus(
            transactionValue.mul(currentExchangeRate)
          ),
          valueWithCurrencyEffect: currentCashFlow.valueWithCurrencyEffect.plus(
            transactionValue.mul(exchangeRateAtActivityDate)
          )
        };
      }
    }

    const dividendAdjustmentsByDate: {
      [date: string]: {
        value: Big;
        valueWithCurrencyEffect: Big;
      };
    } = {};

    const feeAdjustmentsByDate: {
      [date: string]: {
        value: Big;
        valueWithCurrencyEffect: Big;
      };
    } = {};

    for (const activity of activities) {
      const exchangeRateAtActivityDate = exchangeRates?.[activity.date] ?? 1;

      if (activity.type === 'DIVIDEND') {
        const dividend = activity.quantity.mul(activity.unitPrice);

        const currentDividendAdjustment = dividendAdjustmentsByDate[
          activity.date
        ] ?? {
          value: new Big(0),
          valueWithCurrencyEffect: new Big(0)
        };

        dividendAdjustmentsByDate[activity.date] = {
          value: currentDividendAdjustment.value.plus(
            dividend.mul(currentExchangeRate)
          ),
          valueWithCurrencyEffect:
            currentDividendAdjustment.valueWithCurrencyEffect.plus(
              dividend.mul(exchangeRateAtActivityDate)
            )
        };
      }

      if (!activity.fee.eq(0)) {
        const currentFeeAdjustment = feeAdjustmentsByDate[activity.date] ?? {
          value: new Big(0),
          valueWithCurrencyEffect: new Big(0)
        };

        feeAdjustmentsByDate[activity.date] = {
          value: currentFeeAdjustment.value.plus(
            activity.fee.mul(currentExchangeRate)
          ),
          valueWithCurrencyEffect:
            currentFeeAdjustment.valueWithCurrencyEffect.plus(
              activity.fee.mul(exchangeRateAtActivityDate)
            )
        };
      }
    }

    let cumulativeGrossReturn = new Big(1);
    let cumulativeGrossReturnWithCurrencyEffect = new Big(1);
    let cumulativeNetReturn = new Big(1);
    let cumulativeNetReturnWithCurrencyEffect = new Big(1);

    let previousValue = new Big(0);
    let previousValueWithCurrencyEffect = new Big(0);

    const cumulativeNetReturnWithCurrencyEffectByDate: {
      [date: string]: Big;
    } = {};

    for (const date of chartDates) {
      const currentValue = currentValues[date] ?? new Big(0);
      const currentValueWithCurrencyEffect =
        currentValuesWithCurrencyEffect[date] ?? new Big(0);

      const cashFlow = cashFlowsByDate[date] ?? {
        value: new Big(0),
        valueWithCurrencyEffect: new Big(0)
      };

      const dividendAdjustment = dividendAdjustmentsByDate[date] ?? {
        value: new Big(0),
        valueWithCurrencyEffect: new Big(0)
      };

      const feeAdjustment = feeAdjustmentsByDate[date] ?? {
        value: new Big(0),
        valueWithCurrencyEffect: new Big(0)
      };

      if (previousValue.gt(0)) {
        cumulativeGrossReturn = cumulativeGrossReturn.mul(
          currentValue
            .minus(cashFlow.value)
            .plus(dividendAdjustment.value)
            .div(previousValue)
        );

        cumulativeNetReturn = cumulativeNetReturn.mul(
          currentValue
            .minus(cashFlow.value)
            .plus(dividendAdjustment.value)
            .minus(feeAdjustment.value)
            .div(previousValue)
        );
      }

      if (previousValueWithCurrencyEffect.gt(0)) {
        cumulativeGrossReturnWithCurrencyEffect =
          cumulativeGrossReturnWithCurrencyEffect.mul(
            currentValueWithCurrencyEffect
              .minus(cashFlow.valueWithCurrencyEffect)
              .plus(dividendAdjustment.valueWithCurrencyEffect)
              .div(previousValueWithCurrencyEffect)
          );

        cumulativeNetReturnWithCurrencyEffect =
          cumulativeNetReturnWithCurrencyEffect.mul(
            currentValueWithCurrencyEffect
              .minus(cashFlow.valueWithCurrencyEffect)
              .plus(dividendAdjustment.valueWithCurrencyEffect)
              .minus(feeAdjustment.valueWithCurrencyEffect)
              .div(previousValueWithCurrencyEffect)
          );
      }

      cumulativeNetReturnWithCurrencyEffectByDate[date] =
        cumulativeNetReturnWithCurrencyEffect;

      previousValue = currentValue;
      previousValueWithCurrencyEffect = currentValueWithCurrencyEffect;
    }

    const netPerformancePercentageWithCurrencyEffectMap = {
      ...holdingPerformance.netPerformancePercentageWithCurrencyEffectMap
    };

    for (const { dateRange, endDateString, startDateString } of dateRanges) {
      if (dateRange === 'max') {
        netPerformancePercentageWithCurrencyEffectMap[dateRange] =
          cumulativeNetReturnWithCurrencyEffect.minus(1);

        continue;
      }

      let cumulativeRangeReturnWithCurrencyEffect = new Big(1);
      let previousRangeValueWithCurrencyEffect =
        currentValuesWithCurrencyEffect[startDateString] ?? new Big(0);

      for (const date of chartDates) {
        if (date <= startDateString || date > endDateString) {
          continue;
        }

        const currentValueWithCurrencyEffect =
          currentValuesWithCurrencyEffect[date] ?? new Big(0);

        const cashFlow = cashFlowsByDate[date] ?? {
          value: new Big(0),
          valueWithCurrencyEffect: new Big(0)
        };

        const dividendAdjustment = dividendAdjustmentsByDate[date] ?? {
          value: new Big(0),
          valueWithCurrencyEffect: new Big(0)
        };

        const feeAdjustment = feeAdjustmentsByDate[date] ?? {
          value: new Big(0),
          valueWithCurrencyEffect: new Big(0)
        };

        if (previousRangeValueWithCurrencyEffect.gt(0)) {
          cumulativeRangeReturnWithCurrencyEffect =
            cumulativeRangeReturnWithCurrencyEffect.mul(
              currentValueWithCurrencyEffect
                .minus(cashFlow.valueWithCurrencyEffect)
                .plus(dividendAdjustment.valueWithCurrencyEffect)
                .minus(feeAdjustment.valueWithCurrencyEffect)
                .div(previousRangeValueWithCurrencyEffect)
            );
        }

        previousRangeValueWithCurrencyEffect = currentValueWithCurrencyEffect;
      }

      netPerformancePercentageWithCurrencyEffectMap[dateRange] =
        cumulativeRangeReturnWithCurrencyEffect.minus(1);
    }

    return {
      ...holdingPerformance,
      grossPerformancePercentage: cumulativeGrossReturn.minus(1),
      grossPerformancePercentageWithCurrencyEffect:
        cumulativeGrossReturnWithCurrencyEffect.minus(1),
      netPerformancePercentage: cumulativeNetReturn.minus(1),
      netPerformancePercentageWithCurrencyEffectMap
    };
  }

  protected getPerformanceCalculationType() {
    return PerformanceCalculationType.TWR;
  }

  private getPortfolioAdjustmentsByDate({
    currentExchangeRateDate
  }: {
    currentExchangeRateDate?: string;
  }) {
    const cashFlowsByDate: {
      [date: string]: {
        value: Big;
        valueWithCurrencyEffect: Big;
      };
    } = {};

    const performanceAdjustmentsByDate: {
      [date: string]: {
        value: Big;
        valueWithCurrencyEffect: Big;
      };
    } = {};

    const dividendAdjustmentsByDate: {
      [date: string]: Big;
    } = {};

    const exchangeRatesByCurrency = this.getExchangeRatesByCurrency();

    for (const activity of this.activities) {
      const exchangeRates =
        exchangeRatesByCurrency[
          `${activity.assetProfile.currency}${this.getBaseCurrency()}`
        ] ?? {};

      const lastExchangeRateDate = Object.keys(exchangeRates).at(-1);
      const currentExchangeRate =
        exchangeRates[currentExchangeRateDate ?? lastExchangeRateDate ?? ''] ??
        1;
      const exchangeRateAtActivityDate = exchangeRates[activity.date] ?? 1;

      const isCashInBaseCurrency =
        activity.assetProfile.assetSubClass === 'CASH' &&
        activity.assetProfile.currency === this.getBaseCurrency() &&
        activity.assetProfile.symbol === this.getBaseCurrency();

      if (!isCashInBaseCurrency && ['BUY', 'SELL'].includes(activity.type)) {
        const factor = activity.type === 'BUY' ? 1 : -1;
        const transactionValue = activity.quantity
          .mul(activity.unitPrice)
          .mul(factor);

        const currentCashFlow = cashFlowsByDate[activity.date] ?? {
          value: new Big(0),
          valueWithCurrencyEffect: new Big(0)
        };

        cashFlowsByDate[activity.date] = {
          value: currentCashFlow.value.plus(
            transactionValue.mul(currentExchangeRate)
          ),
          valueWithCurrencyEffect: currentCashFlow.valueWithCurrencyEffect.plus(
            transactionValue.mul(exchangeRateAtActivityDate)
          )
        };
      }

      let performanceAdjustment = activity.fee.mul(currentExchangeRate).mul(-1);

      let performanceAdjustmentWithCurrencyEffect = activity.fee
        .mul(exchangeRateAtActivityDate)
        .mul(-1);

      if (['DIVIDEND', 'INTEREST'].includes(activity.type)) {
        const income = activity.quantity.mul(activity.unitPrice);

        performanceAdjustment = performanceAdjustment.plus(
          income.mul(currentExchangeRate)
        );

        performanceAdjustmentWithCurrencyEffect =
          performanceAdjustmentWithCurrencyEffect.plus(
            income.mul(exchangeRateAtActivityDate)
          );

        if (activity.type === 'DIVIDEND') {
          dividendAdjustmentsByDate[activity.date] = (
            dividendAdjustmentsByDate[activity.date] ?? new Big(0)
          ).plus(income.mul(exchangeRateAtActivityDate));
        }
      }

      if (
        !performanceAdjustment.eq(0) ||
        !performanceAdjustmentWithCurrencyEffect.eq(0)
      ) {
        const currentPerformanceAdjustment = performanceAdjustmentsByDate[
          activity.date
        ] ?? {
          value: new Big(0),
          valueWithCurrencyEffect: new Big(0)
        };

        performanceAdjustmentsByDate[activity.date] = {
          value: currentPerformanceAdjustment.value.plus(performanceAdjustment),
          valueWithCurrencyEffect:
            currentPerformanceAdjustment.valueWithCurrencyEffect.plus(
              performanceAdjustmentWithCurrencyEffect
            )
        };
      }
    }

    return {
      cashFlowsByDate,
      dividendAdjustmentsByDate,
      performanceAdjustmentsByDate
    };
  }
}
