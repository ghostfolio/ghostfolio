import { PortfolioCalculator } from '@ghostfolio/api/app/portfolio/calculator/portfolio-calculator';
import { AccumulatedValues } from '@ghostfolio/api/app/portfolio/interfaces/accumulated-values.interface';
import { HoldingPerformance } from '@ghostfolio/api/app/portfolio/interfaces/holding-performance.interface';
import { PortfolioCalculatorActivity } from '@ghostfolio/api/app/portfolio/interfaces/portfolio-calculator-activity.interface';
import { PortfolioCalculatorHolding } from '@ghostfolio/api/app/portfolio/interfaces/portfolio-calculator-holding.interface';
import { PerformancePercentages } from '@ghostfolio/api/app/portfolio/types/performance-percentages.type';
import {
  getAssetProfileIdentifier,
  parseDate
} from '@ghostfolio/common/helper';
import {
  AssetProfileIdentifier,
  HistoricalDataItem
} from '@ghostfolio/common/interfaces';
import { PortfolioSnapshot } from '@ghostfolio/common/models';
import { PerformanceCalculationType } from '@ghostfolio/common/types/performance-calculation-type.type';

import { AssetSubClass } from '@prisma/client';
import { Big } from 'big.js';
import { differenceInCalendarDays } from 'date-fns';

interface DatedCashFlow {
  date: string;
  value: Big;
}

/**
 * Money-Weighted Rate of Return (MWR): the annualized internal rate of return
 * of the dated investor cash flows and the terminal portfolio value.
 */
export class MwrPortfolioCalculator extends PortfolioCalculator {
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
    const performancePercentagesByDate: {
      [date: string]: PerformancePercentages;
    } = {};

    for (const [date, accumulatedValues] of Object.entries(
      accumulatedValuesByDate
    )) {
      const netPerformanceInPercentageWithCurrencyEffect =
        this.getMoneyWeightedReturn({
          date,
          terminalValue: accumulatedValues.totalCurrentValueWithCurrencyEffect,
          withCurrencyEffect: true
        });

      const netPerformanceInPercentageWithoutDividendsWithCurrencyEffect =
        this.getMoneyWeightedReturn({
          date,
          includeDividends: false,
          terminalValue: accumulatedValues.totalCurrentValueWithCurrencyEffect,
          withCurrencyEffect: true
        });

      performancePercentagesByDate[date] = {
        dividendInPercentageWithCurrencyEffect:
          netPerformanceInPercentageWithCurrencyEffect -
          netPerformanceInPercentageWithoutDividendsWithCurrencyEffect,
        netPerformanceInPercentage: this.getMoneyWeightedReturn({
          date,
          terminalValue: accumulatedValues.totalCurrentValue,
          withCurrencyEffect: false
        }),
        netPerformanceInPercentageWithCurrencyEffect
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

    const firstHistoricalDataItem = historicalDataItems[0];

    if (!firstHistoricalDataItem) {
      return performancePercentagesByDate;
    }

    const openingDate = firstHistoricalDataItem.date;
    const openingValue = new Big(firstHistoricalDataItem.value ?? 0);
    const openingValueWithCurrencyEffect = new Big(
      firstHistoricalDataItem.valueWithCurrencyEffect ?? 0
    );

    for (const historicalDataItem of historicalDataItems) {
      const cashFlows = [
        {
          date: openingDate,
          value: openingValue.mul(-1)
        },
        ...this.getActivityCashFlows({
          endDate: historicalDataItem.date,
          startDate: openingDate,
          withCurrencyEffect: false
        }),
        {
          date: historicalDataItem.date,
          value: new Big(historicalDataItem.value ?? 0)
        }
      ];

      const cashFlowsWithCurrencyEffect = [
        {
          date: openingDate,
          value: openingValueWithCurrencyEffect.mul(-1)
        },
        ...this.getActivityCashFlows({
          endDate: historicalDataItem.date,
          startDate: openingDate,
          withCurrencyEffect: true
        }),
        {
          date: historicalDataItem.date,
          value: new Big(historicalDataItem.valueWithCurrencyEffect ?? 0)
        }
      ];

      const cashFlowsWithoutDividendsWithCurrencyEffect = [
        {
          date: openingDate,
          value: openingValueWithCurrencyEffect.mul(-1)
        },
        ...this.getActivityCashFlows({
          endDate: historicalDataItem.date,
          includeDividends: false,
          startDate: openingDate,
          withCurrencyEffect: true
        }),
        {
          date: historicalDataItem.date,
          value: new Big(historicalDataItem.valueWithCurrencyEffect ?? 0)
        }
      ];

      const netPerformanceInPercentageWithCurrencyEffect = this.calculateXirr(
        cashFlowsWithCurrencyEffect
      );

      const netPerformanceInPercentageWithoutDividendsWithCurrencyEffect =
        this.calculateXirr(cashFlowsWithoutDividendsWithCurrencyEffect);

      performancePercentagesByDate[historicalDataItem.date] = {
        dividendInPercentageWithCurrencyEffect:
          netPerformanceInPercentageWithCurrencyEffect -
          netPerformanceInPercentageWithoutDividendsWithCurrencyEffect,
        netPerformanceInPercentage: this.calculateXirr(cashFlows),
        netPerformanceInPercentageWithCurrencyEffect
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

    const assetProfileIdentifier = getAssetProfileIdentifier({
      dataSource,
      symbol
    });

    const activities =
      this.activitiesByAssetProfileIdentifier[assetProfileIdentifier] ?? [];

    const endDate = chartDates.at(-1);

    if (!endDate) {
      return holdingPerformance;
    }

    const terminalValue = valuation.currentValues[endDate] ?? new Big(0);
    const terminalValueWithCurrencyEffect =
      valuation.currentValuesWithCurrencyEffect[endDate] ?? new Big(0);

    const grossPerformancePercentage = this.calculateXirr([
      ...this.getActivityCashFlows({
        activities,
        endDate,
        includeFees: false,
        withCurrencyEffect: false
      }),
      {
        date: endDate,
        value: terminalValue
      }
    ]);

    const grossPerformancePercentageWithCurrencyEffect = this.calculateXirr([
      ...this.getActivityCashFlows({
        activities,
        endDate,
        includeFees: false,
        withCurrencyEffect: true
      }),
      {
        date: endDate,
        value: terminalValueWithCurrencyEffect
      }
    ]);

    const netPerformancePercentage = this.calculateXirr([
      ...this.getActivityCashFlows({
        activities,
        endDate,
        includeFees: true,
        withCurrencyEffect: false
      }),
      {
        date: endDate,
        value: terminalValue
      }
    ]);

    const netPerformancePercentageWithCurrencyEffect = this.calculateXirr([
      ...this.getActivityCashFlows({
        activities,
        endDate,
        includeFees: true,
        withCurrencyEffect: true
      }),
      {
        date: endDate,
        value: terminalValueWithCurrencyEffect
      }
    ]);

    const netPerformancePercentageWithCurrencyEffectMap: HoldingPerformance['netPerformancePercentageWithCurrencyEffectMap'] =
      {
        ...holdingPerformance.netPerformancePercentageWithCurrencyEffectMap,
        max: new Big(netPerformancePercentageWithCurrencyEffect)
      };

    for (const {
      dateRange,
      endDateString: rangeEndDateString,
      startDateString: rangeStartDateString
    } of valuation.dateRanges) {
      if (dateRange === 'max') {
        continue;
      }

      const openingValueWithCurrencyEffect =
        valuation.currentValuesWithCurrencyEffect[rangeStartDateString] ??
        new Big(0);

      const terminalValueOfRangeWithCurrencyEffect =
        valuation.currentValuesWithCurrencyEffect[rangeEndDateString] ??
        new Big(0);

      const rangeReturnWithCurrencyEffect = this.calculateXirr([
        {
          date: rangeStartDateString,
          value: openingValueWithCurrencyEffect.mul(-1)
        },
        ...this.getActivityCashFlows({
          activities,
          endDate: rangeEndDateString,
          includeFees: true,
          startDate: rangeStartDateString,
          withCurrencyEffect: true
        }),
        {
          date: rangeEndDateString,
          value: terminalValueOfRangeWithCurrencyEffect
        }
      ]);

      netPerformancePercentageWithCurrencyEffectMap[dateRange] = new Big(
        rangeReturnWithCurrencyEffect
      );
    }

    return {
      ...holdingPerformance,
      grossPerformancePercentage: new Big(grossPerformancePercentage),
      grossPerformancePercentageWithCurrencyEffect: new Big(
        grossPerformancePercentageWithCurrencyEffect
      ),
      netPerformancePercentage: new Big(netPerformancePercentage),
      netPerformancePercentageWithCurrencyEffectMap
    };
  }

  protected getPerformanceCalculationType() {
    return PerformanceCalculationType.MWR;
  }

  private calculateXirr(cashFlows: DatedCashFlow[]): number {
    const cashFlowsByDate = new Map<string, Big>();

    for (const { date, value } of cashFlows) {
      cashFlowsByDate.set(
        date,
        (cashFlowsByDate.get(date) ?? new Big(0)).plus(value)
      );
    }

    const aggregatedCashFlows = Array.from(cashFlowsByDate.entries())
      .map(([date, value]) => ({ date, value }))
      .filter(({ value }) => !value.eq(0))
      .sort((a, b) => a.date.localeCompare(b.date));

    if (aggregatedCashFlows.length < 2) {
      return 0;
    }

    if (
      !aggregatedCashFlows.some(({ value }) => value.lt(0)) ||
      !aggregatedCashFlows.some(({ value }) => value.gt(0))
    ) {
      return 0;
    }

    const firstDate = parseDate(aggregatedCashFlows[0].date);
    const lastDate = parseDate(aggregatedCashFlows.at(-1).date);

    if (differenceInCalendarDays(lastDate, firstDate) === 0) {
      return 0;
    }

    const scale = aggregatedCashFlows.reduce((maximum, { value }) => {
      return value.abs().gt(maximum) ? value.abs() : maximum;
    }, new Big(0));

    if (scale.eq(0)) {
      return 0;
    }

    const normalizedCashFlows = aggregatedCashFlows.map(({ date, value }) => ({
      exponent: differenceInCalendarDays(parseDate(date), firstDate) / 365,
      value: value.div(scale).toNumber()
    }));

    const calculateXnpv = (rate: number) => {
      if (rate <= -1) {
        return Number.POSITIVE_INFINITY;
      }

      return normalizedCashFlows.reduce((xnpv, cashFlow) => {
        return xnpv + cashFlow.value / Math.pow(1 + rate, cashFlow.exponent);
      }, 0);
    };

    // Start Newton's method at zero. In common multiple-IRR cases this
    // deterministically favors the root reached from that initial estimate.
    let newtonRate = 0;

    for (let iteration = 0; iteration < 50; iteration += 1) {
      const xnpv = calculateXnpv(newtonRate);

      if (Math.abs(xnpv) < 1e-14) {
        return newtonRate;
      }

      const derivative = normalizedCashFlows.reduce((value, cashFlow) => {
        const exponent = cashFlow.exponent;

        if (exponent === 0) {
          return value;
        }

        return (
          value -
          (exponent * cashFlow.value) / Math.pow(1 + newtonRate, exponent + 1)
        );
      }, 0);

      if (!Number.isFinite(derivative) || Math.abs(derivative) < 1e-14) {
        break;
      }

      const nextRate = newtonRate - xnpv / derivative;

      if (!Number.isFinite(nextRate) || nextRate <= -1) {
        break;
      }

      if (Math.abs(nextRate - newtonRate) < 1e-14) {
        return nextRate;
      }

      newtonRate = nextRate;
    }

    let lowerRate = -0.999999999;
    let upperRate = 1;

    let lowerValue = calculateXnpv(lowerRate);
    let upperValue = calculateXnpv(upperRate);

    if (Math.abs(lowerValue) < 1e-14) {
      return lowerRate;
    }

    if (Math.abs(upperValue) < 1e-14) {
      return upperRate;
    }

    while (
      Math.sign(lowerValue) === Math.sign(upperValue) &&
      upperRate < 1_000_000
    ) {
      upperRate = upperRate * 2 + 1;
      upperValue = calculateXnpv(upperRate);
    }

    if (
      !Number.isFinite(lowerValue) ||
      !Number.isFinite(upperValue) ||
      Math.sign(lowerValue) === Math.sign(upperValue)
    ) {
      return 0;
    }

    for (let iteration = 0; iteration < 200; iteration += 1) {
      const middleRate = (lowerRate + upperRate) / 2;
      const middleValue = calculateXnpv(middleRate);

      if (Math.abs(middleValue) < 1e-14) {
        return middleRate;
      }

      if (Math.sign(lowerValue) === Math.sign(middleValue)) {
        lowerRate = middleRate;
        lowerValue = middleValue;
      } else {
        upperRate = middleRate;
        upperValue = middleValue;
      }

      if (Math.abs(upperRate - lowerRate) < 1e-14) {
        return (lowerRate + upperRate) / 2;
      }
    }

    return (lowerRate + upperRate) / 2;
  }

  private getActivityCashFlows({
    activities = this.activities,
    endDate,
    includeDividends = true,
    includeFees = true,
    startDate,
    withCurrencyEffect
  }: {
    activities?: PortfolioCalculatorActivity[];
    endDate: string;
    includeDividends?: boolean;
    includeFees?: boolean;
    startDate?: string;
    withCurrencyEffect: boolean;
  }): DatedCashFlow[] {
    const cashFlows: DatedCashFlow[] = [];
    const exchangeRatesByCurrency = this.getExchangeRatesByCurrency();

    for (const activity of activities) {
      const isCashInBaseCurrency =
        activity.assetProfile.assetSubClass === AssetSubClass.CASH &&
        activity.assetProfile.currency === this.getBaseCurrency() &&
        activity.assetProfile.symbol === this.getBaseCurrency();

      if (
        isCashInBaseCurrency ||
        activity.date > endDate ||
        (startDate !== undefined && activity.date <= startDate)
      ) {
        continue;
      }

      const currencyPair =
        activity.assetProfile.currency + this.getBaseCurrency();

      const exchangeRates = exchangeRatesByCurrency[currencyPair];

      const exchangeRate = withCurrencyEffect
        ? (exchangeRates?.[activity.date] ?? 1)
        : (exchangeRates?.[endDate] ?? 1);

      if (includeFees && !activity.fee.eq(0)) {
        cashFlows.push({
          date: activity.date,
          value: activity.fee.mul(exchangeRate).mul(-1)
        });
      }

      if (['BUY', 'SELL'].includes(activity.type)) {
        const transactionValue = activity.quantity
          .mul(activity.unitPrice)
          .mul(exchangeRate);

        cashFlows.push({
          date: activity.date,
          value:
            activity.type === 'BUY'
              ? transactionValue.mul(-1)
              : transactionValue
        });

        continue;
      }

      if (
        activity.type === 'INTEREST' ||
        (includeDividends && activity.type === 'DIVIDEND')
      ) {
        cashFlows.push({
          date: activity.date,
          value: activity.quantity.mul(activity.unitPrice).mul(exchangeRate)
        });
      }
    }

    return cashFlows;
  }

  private getMoneyWeightedReturn({
    date,
    includeDividends = true,
    terminalValue,
    withCurrencyEffect
  }: {
    date: string;
    includeDividends?: boolean;
    terminalValue: Big;
    withCurrencyEffect: boolean;
  }): number {
    return this.calculateXirr([
      ...this.getActivityCashFlows({
        endDate: date,
        includeDividends,
        withCurrencyEffect
      }),
      {
        date,
        value: terminalValue
      }
    ]);
  }
}
