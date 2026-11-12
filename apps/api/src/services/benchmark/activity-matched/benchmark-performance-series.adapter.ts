import { LineChartItem } from '@ghostfolio/common/interfaces';

import { Big } from 'big.js';

import {
  FinancialPoint,
  IncrementalFinancialEvaluator
} from './activity-matched-benchmark';
import { BenchmarkDisplayValuation } from './benchmark-display-valuation.adapter';

export interface BenchmarkPerformanceSeriesInput {
  points: FinancialPoint[];
  financialCurrency: string;
  displayValuations: BenchmarkDisplayValuation[];
  valuationDates: string[];
  start: string;
  end: string;
  method: 'ROI' | 'ROAI';
}

function calendarDay(date: string): number {
  const time = Date.parse(`${date}T00:00:00Z`);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    !Number.isFinite(time) ||
    new Date(time).toISOString().slice(0, 10) !== date
  ) {
    throw new Error(`Invalid benchmark date: ${date}`);
  }
  return time / 86400000;
}

export function composeBenchmarkPerformanceSeries({
  points,
  financialCurrency,
  displayValuations,
  valuationDates,
  start,
  end,
  method
}: BenchmarkPerformanceSeriesInput): LineChartItem[] {
  if (method !== 'ROI' && method !== 'ROAI') {
    throw new Error('Unsupported benchmark method');
  }
  if (calendarDay(start) > calendarDay(end)) {
    throw new Error('Reversed benchmark range');
  }
  if (!financialCurrency) {
    throw new Error('Missing financial currency');
  }

  const dates = [...new Set(valuationDates)]
    .filter((date) => {
      calendarDay(date);
      return date >= start && date <= end;
    })
    .sort();
  if (dates.length === 0) return [];

  const displayByDate = new Map<string, BenchmarkDisplayValuation>();
  for (const display of displayValuations) {
    if (displayByDate.has(display.date)) {
      throw new Error(`Duplicate display valuation: ${display.date}`);
    }
    displayByDate.set(display.date, display);
  }

  const result: LineChartItem[] = [];
  let requestedIndex = 0;
  let previousFinancial: FinancialPoint | undefined;
  let evaluator: IncrementalFinancialEvaluator | undefined;

  // Consume every financial point, including events not requested by the chart.
  // Display observations never advance financial state or its time anchor.
  for (let i = 0; i < points.length; i++) {
    const point = points[i];
    const currentDay = calendarDay(point.date);
    if (i && point.date <= points[i - 1].date) {
      throw new Error('Points must be strictly ordered');
    }
    const requested = dates[requestedIndex];
    if (requested && requested < point.date) {
      throw new Error(`Missing benchmark point: ${requested}`);
    }
    const isRequested = point.date === requested;
    let observation:
      | ReturnType<IncrementalFinancialEvaluator['addFinancialPoint']>
      | undefined;

    if (!point.displayOnly) {
      if (point.date >= dates[0] && point.date <= dates[dates.length - 1]) {
        evaluator ??= new IncrementalFinancialEvaluator(method);
        observation = evaluator.addFinancialPoint(point, currentDay);
      }
      previousFinancial = point;
    } else if (isRequested) {
      const display = displayByDate.get(point.date);
      if (!display) {
        throw new Error(`Missing display valuation: ${point.date}`);
      }
      if (display.currency !== financialCurrency) {
        throw new Error(`Display currency mismatch: ${point.date}`);
      }
      if (display.valuationStatus === 'STALE') {
        throw new Error(`Stale display valuation: ${point.date}`);
      }
      let value: Big;
      try {
        value = new Big(display.value);
      } catch {
        throw new Error(`Invalid display value: ${point.date}`);
      }
      if (value.lt(0)) throw new Error(`Invalid display value: ${point.date}`);
      if (!previousFinancial && point.units.gt(0)) {
        throw new Error(`Missing financial baseline: ${point.date}`);
      }
      // A display-only baseline starts range accounting, never a BUY/SELL.
      evaluator ??= new IncrementalFinancialEvaluator(method, {
        point: previousFinancial ?? point,
        value,
        currentDay
      });
      observation = evaluator.projectDisplayPoint(
        point.date,
        value,
        currentDay
      );
    }

    if (isRequested && observation) {
      const value = observation.returnFraction.mul(100).toNumber();
      if (!Number.isFinite(value)) {
        throw new Error(`Invalid benchmark return: ${point.date}`);
      }
      result.push({ date: point.date, value });
      requestedIndex++;
    }
  }
  if (requestedIndex < dates.length) {
    throw new Error(`Missing benchmark point: ${dates[requestedIndex]}`);
  }
  return result;
}
