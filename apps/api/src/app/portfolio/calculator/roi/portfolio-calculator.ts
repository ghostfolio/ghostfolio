import { PortfolioCalculator } from '@ghostfolio/api/app/portfolio/calculator/portfolio-calculator';
import { LogPerformance } from '@ghostfolio/api/interceptors/performance-logging/performance-logging.interceptor';
import {
  AssetProfileIdentifier,
  SymbolMetrics
} from '@ghostfolio/common/interfaces';
import { PortfolioSnapshot, TimelinePosition } from '@ghostfolio/common/models';
import { PerformanceCalculationType } from '@ghostfolio/common/types/performance-calculation-type.type';

import { Logger } from '@nestjs/common';
import { Big } from 'big.js';
import { cloneDeep } from 'lodash';

import { PortfolioOrderItem } from '../../interfaces/portfolio-order-item.interface';
import { RoiPortfolioCalculatorSymbolMetricsHelper } from './portfolio-calculator-symbolmetrics-helper';

export class RoiPortfolioCalculator extends PortfolioCalculator {
  private chartDates: string[];

  @LogPerformance
  protected calculateOverallPerformance(
    positions: TimelinePosition[]
  ): PortfolioSnapshot {
    let currentValueInBaseCurrency = new Big(0);
    let grossPerformance = new Big(0);
    let grossPerformanceWithCurrencyEffect = new Big(0);
    let hasErrors = false;
    let netPerformance = new Big(0);
    let totalFeesWithCurrencyEffect = new Big(0);
    const totalInterestWithCurrencyEffect = new Big(0);
    let totalInvestment = new Big(0);
    let totalInvestmentWithCurrencyEffect = new Big(0);
    let totalTimeWeightedInvestment = new Big(0);
    let totalTimeWeightedInvestmentWithCurrencyEffect = new Big(0);

    for (const currentPosition of positions) {
      ({
        totalFeesWithCurrencyEffect,
        currentValueInBaseCurrency,
        hasErrors,
        totalInvestment,
        totalInvestmentWithCurrencyEffect,
        grossPerformance,
        grossPerformanceWithCurrencyEffect,
        netPerformance,
        totalTimeWeightedInvestment,
        totalTimeWeightedInvestmentWithCurrencyEffect
      } = this.calculatePositionMetrics(
        currentPosition,
        totalFeesWithCurrencyEffect,
        currentValueInBaseCurrency,
        hasErrors,
        totalInvestment,
        totalInvestmentWithCurrencyEffect,
        grossPerformance,
        grossPerformanceWithCurrencyEffect,
        netPerformance,
        totalTimeWeightedInvestment,
        totalTimeWeightedInvestmentWithCurrencyEffect
      ));
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
        return ['BUY', 'SELL', 'STAKE'].includes(type);
      }).length,
      createdAt: new Date(),
      errors: [],
      historicalData: [],
      totalLiabilitiesWithCurrencyEffect: new Big(0),
      totalValuablesWithCurrencyEffect: new Big(0)
    };
  }

  protected getSymbolMetrics({
    chartDateMap,
    dataSource,
    end,
    exchangeRates,
    marketSymbolMap,
    start,
    symbol
  }: {
    chartDateMap?: { [date: string]: boolean };
    end: Date;
    exchangeRates: { [dateString: string]: number };
    marketSymbolMap: {
      [date: string]: { [symbol: string]: Big };
    };
    start: Date;
  } & AssetProfileIdentifier): SymbolMetrics {
    if (!this.chartDates) {
      this.chartDates = Object.keys(chartDateMap).sort();
    }
    const symbolMetricsHelperClass =
      new RoiPortfolioCalculatorSymbolMetricsHelper(
        PortfolioCalculator.ENABLE_LOGGING,
        marketSymbolMap,
        this.chartDates
      );
    const symbolMetricsHelper =
      symbolMetricsHelperClass.getSymbolMetricHelperObject(
        exchangeRates,
        start,
        end,
        marketSymbolMap,
        symbol
      );

    let orders: PortfolioOrderItem[] = cloneDeep(
      this.activities.filter(({ SymbolProfile }) => {
        return SymbolProfile.symbol === symbol;
      })
    );

    if (!orders.length) {
      return symbolMetricsHelper.symbolMetrics;
    }

    if (
      symbolMetricsHelperClass.hasNoUnitPriceAtEndOrStartDate(
        symbolMetricsHelper.unitPriceAtEndDate,
        symbolMetricsHelper.unitPriceAtStartDate,
        orders,
        start
      )
    ) {
      symbolMetricsHelper.symbolMetrics.hasErrors = true;
      return symbolMetricsHelper.symbolMetrics;
    }

    symbolMetricsHelperClass.addSyntheticStartAndEndOrder(
      orders,
      symbolMetricsHelper,
      dataSource,
      symbol
    );

    orders = symbolMetricsHelperClass.fillOrdersAndSortByTime(
      orders,
      symbolMetricsHelper,
      chartDateMap,
      marketSymbolMap,
      symbol,
      dataSource
    );

    symbolMetricsHelper.indexOfStartOrder = orders.findIndex(({ itemType }) => {
      return itemType === 'start';
    });
    symbolMetricsHelper.indexOfEndOrder = orders.findIndex(({ itemType }) => {
      return itemType === 'end';
    });

    for (let i = 0; i < orders.length; i++) {
      symbolMetricsHelperClass.processOrderMetrics(
        orders,
        i,
        exchangeRates,
        symbolMetricsHelper
      );
      if (i === symbolMetricsHelper.indexOfEndOrder) {
        break;
      }
    }

    symbolMetricsHelperClass.handleOverallPerformanceCalculation(
      symbolMetricsHelper
    );
    symbolMetricsHelperClass.calculateNetPerformanceByDateRange(
      start,
      symbolMetricsHelper
    );

    return symbolMetricsHelper.symbolMetrics;
  }

  protected getPerformanceCalculationType() {
    return PerformanceCalculationType.ROI;
  }

  private calculatePositionMetrics(
    currentPosition: TimelinePosition,
    totalFeesWithCurrencyEffect: Big,
    currentValueInBaseCurrency: Big,
    hasErrors: boolean,
    totalInvestment: Big,
    totalInvestmentWithCurrencyEffect: Big,
    grossPerformance: Big,
    grossPerformanceWithCurrencyEffect: Big,
    netPerformance: Big,
    totalTimeWeightedInvestment: Big,
    totalTimeWeightedInvestmentWithCurrencyEffect: Big
  ) {
    if (currentPosition.feeInBaseCurrency) {
      totalFeesWithCurrencyEffect = totalFeesWithCurrencyEffect.plus(
        currentPosition.feeInBaseCurrency
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
    return {
      totalFeesWithCurrencyEffect,
      currentValueInBaseCurrency,
      hasErrors,
      totalInvestment,
      totalInvestmentWithCurrencyEffect,
      grossPerformance,
      grossPerformanceWithCurrencyEffect,
      netPerformance,
      totalTimeWeightedInvestment,
      totalTimeWeightedInvestmentWithCurrencyEffect
    };
  }
}
