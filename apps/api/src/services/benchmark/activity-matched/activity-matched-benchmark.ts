import { Big } from 'big.js';

import {
  DEFAULT_MAX_PRICE_AGE_DAYS,
  validateMaxPriceAgeDays
} from './benchmark-price-policy';

/** Signed investment proxies, never evidence of external deposits/withdrawals. */
export type InvestmentProxyFlow =
  | { date: string; amount: string; kind?: 'amount' }
  | { date: string; kind: 'liquidate'; amount?: never };
export interface BenchmarkPrice {
  date: string;
  price: string;
  sourceDate?: string;
}
export type BenchmarkValuationStatus =
  'CURRENT' | 'CARRIED_FORWARD' | 'STALE' | 'NOT_APPLICABLE';

export interface FinancialPoint {
  date: string;
  valuationStatus?: BenchmarkValuationStatus;
  /** Carry-forward display rows never define financial range boundaries. */
  displayOnly?: boolean;
  units: Big;
  costBasis: Big;
  realizedGain: Big;
  contributions: Big;
  withdrawals: Big;
  value: Big;
  netPerformance: Big;
}

function day(date: string): number {
  const time = Date.parse(`${date}T00:00:00Z`);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    !Number.isFinite(time) ||
    new Date(time).toISOString().slice(0, 10) !== date
  ) {
    throw new Error(`Invalid date: ${date}`);
  }
  return time / 86400000;
}

/** Exact-date execution; latest preceding quote for valuation. Single currency,
 * price-only, zero fees/distributions. Input order breaks same-day flow ties.
 * Returns closing states at every supplied price/event date plus display dates.
 * Display-only carry-forward rows do not participate in financial evaluation.
 */
export interface SimulationInput {
  flows: InvestmentProxyFlow[];
  maxPriceAgeDays?: number;
  prices: BenchmarkPrice[];
  valuationDates: string[];
}

export function normalizeBenchmarkInput({
  flows,
  maxPriceAgeDays = DEFAULT_MAX_PRICE_AGE_DAYS,
  prices,
  valuationDates
}: SimulationInput) {
  validateMaxPriceAgeDays(maxPriceAgeDays);

  const events = flows
    .map((flow, sequence) => {
      day(flow.date);
      if (
        flow.kind !== undefined &&
        flow.kind !== 'amount' &&
        flow.kind !== 'liquidate'
      ) {
        throw new Error('Unsupported flow kind');
      }
      if (flow.kind === 'liquidate' && flow.amount !== undefined) {
        throw new Error('Liquidation must not specify an amount');
      }
      return {
        date: flow.date,
        sequence,
        kind: flow.kind,
        amount: flow.kind === 'liquidate' ? new Big(0) : new Big(flow.amount)
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date) || a.sequence - b.sequence);
  const quotes = prices
    .map((quote) => {
      day(quote.date);
      const price = new Big(quote.price);
      if (!price.gt(0)) {
        throw new Error('Price must be positive');
      }
      if (quote.sourceDate !== undefined) {
        day(quote.sourceDate);

        if (quote.sourceDate > quote.date) {
          throw new Error('Price source date cannot be in the future');
        }
      }

      return {
        date: quote.date,
        price,
        sourceDate: quote.sourceDate ?? quote.date,
        sourceDay: day(quote.sourceDate ?? quote.date)
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date));
  for (let i = 1; i < quotes.length; i++) {
    if (quotes[i].date === quotes[i - 1].date) {
      throw new Error('Duplicate price date');
    }
  }
  valuationDates.forEach(day);
  const financialDates = new Set([
    ...quotes.map(({ date }) => date),
    ...events.map(({ date }) => date)
  ]);
  const dates = [...new Set([...valuationDates, ...financialDates])].sort();
  const dateDays = dates.map(day);

  return {
    events,
    quotes,
    dates,
    dateDays,
    financialDates,
    maxPriceAgeDays
  };
}

export type NormalizedBenchmarkInput = ReturnType<
  typeof normalizeBenchmarkInput
>;

/** Normalized input is reusable, read-only by convention; this stage never mutates it. */
export function simulateNormalizedBenchmark({
  events,
  quotes,
  dates,
  dateDays,
  financialDates,
  maxPriceAgeDays
}: NormalizedBenchmarkInput): FinancialPoint[] {
  let units = new Big(0);
  let costBasis = new Big(0);
  let realizedGain = new Big(0);
  let contributions = new Big(0);
  let withdrawals = new Big(0);
  let eventIndex = 0;
  let quoteIndex = 0;
  let quote:
    | { date: string; price: Big; sourceDate: string; sourceDay: number }
    | undefined;
  const points: FinancialPoint[] = [];
  for (let dateIndex = 0; dateIndex < dates.length; dateIndex++) {
    const date = dates[dateIndex];
    const currentDay = dateDays[dateIndex];

    while (quoteIndex < quotes.length && quotes[quoteIndex].date <= date) {
      quote = quotes[quoteIndex++];
    }
    while (eventIndex < events.length && events[eventIndex].date === date) {
      const { amount, kind } = events[eventIndex++];
      if (amount.eq(0) && kind !== 'liquidate') {
        continue;
      }
      if (quote?.date !== date) {
        throw new Error(`Missing execution price: ${date}`);
      }

      if (currentDay - quote.sourceDay > maxPriceAgeDays) {
        throw new Error(`Stale execution price: ${date}`);
      }

      if (kind === 'liquidate') {
        const proceeds = units.mul(quote.price);
        realizedGain = realizedGain.plus(proceeds.minus(costBasis));
        withdrawals = withdrawals.plus(proceeds);
        units = new Big(0);
        costBasis = new Big(0);
      } else if (amount.gt(0)) {
        const purchasedUnits = amount.div(quote.price);
        if (!purchasedUnits.gt(0)) {
          throw new Error('Insufficient division precision');
        }
        units = units.plus(purchasedUnits);
        costBasis = costBasis.plus(amount);
        contributions = contributions.plus(amount);
      } else {
        const proceeds = amount.neg();
        const value = units.mul(quote.price);
        if (proceeds.gt(value)) {
          throw new Error(`Insufficient capital: ${date}`);
        }
        const soldUnits = proceeds.eq(value)
          ? units
          : proceeds.div(quote.price);
        if (proceeds.lt(value) && (!soldUnits.gt(0) || soldUnits.gte(units))) {
          throw new Error('Insufficient division precision');
        }
        const removedBasis = soldUnits.eq(units)
          ? costBasis
          : costBasis.mul(soldUnits).div(units);
        if (
          soldUnits.lt(units) &&
          (removedBasis.lte(0) || removedBasis.gte(costBasis))
        ) {
          throw new Error('Insufficient division precision');
        }
        units = units.minus(soldUnits);
        costBasis = costBasis.minus(removedBasis);
        realizedGain = realizedGain.plus(proceeds.minus(removedBasis));
        withdrawals = withdrawals.plus(proceeds);
      }
    }
    if (!quote && units.gt(0)) {
      throw new Error(`Missing valuation price: ${date}`);
    }

    const hasPosition = units.gt(0);
    const isFinancialDate = financialDates.has(date);
    const priceAgeDays =
      hasPosition && quote ? currentDay - quote.sourceDay : 0;

    if (hasPosition && isFinancialDate && priceAgeDays > maxPriceAgeDays) {
      throw new Error(`Stale valuation price: ${date}`);
    }

    const valuationStatus: BenchmarkValuationStatus = !hasPosition
      ? 'NOT_APPLICABLE'
      : priceAgeDays === 0
        ? 'CURRENT'
        : priceAgeDays <= maxPriceAgeDays
          ? 'CARRIED_FORWARD'
          : 'STALE';

    const value = units.mul(quote?.price ?? 0);
    points.push({
      valuationStatus,
      date,
      ...(financialDates.size && !financialDates.has(date)
        ? { displayOnly: true }
        : {}),
      units,
      costBasis,
      realizedGain,
      contributions,
      withdrawals,
      value,
      netPerformance: value.minus(costBasis).plus(realizedGain)
    });
  }
  return points;
}

export function simulateBenchmark(input: SimulationInput): FinancialPoint[] {
  return simulateNormalizedBenchmark(normalizeBenchmarkInput(input));
}

interface FinancialRangeObservation {
  date: string;
  capital: Big;
  netPerformance: Big;
  returnFraction: Big;
}

/** Financial state advances only for eligible financial observations.
 * Range selection and input validation remain the caller's responsibility.
 */
export class IncrementalFinancialEvaluator {
  private first: FinancialPoint | undefined;
  private previous: FinancialPoint | undefined;
  private previousDay = 0;
  private openingGain = new Big(0);
  private roiCapital = new Big(0);
  private weighted = new Big(0);
  private days = 0;

  public constructor(
    private readonly method: 'ROI' | 'ROAI',
    baseline?: { point: FinancialPoint; value: Big; currentDay: number }
  ) {
    // Composition can open a range on a display date. This establishes only
    // range normalization; the preceding canonical financial point is retained.
    if (baseline) {
      const { point, value, currentDay } = baseline;
      this.first = {
        ...point,
        value,
        netPerformance: value.minus(point.costBasis).plus(point.realizedGain)
      };
      this.openingGain = value.minus(point.costBasis);
      this.roiCapital = value;
      this.previous = point;
      this.previousDay = currentDay;
    }
  }

  private observation(
    date: string,
    costBasis: Big,
    netPerformance: Big,
    weighted: Big,
    days: number
  ): FinancialRangeObservation {
    const capital =
      this.method === 'ROI'
        ? this.roiCapital
        : costBasis.gt(0)
          ? weighted.plus(costBasis.plus(this.openingGain)).div(days + 1)
          : days > 0
            ? weighted.div(days)
            : new Big(0);
    return {
      date,
      capital,
      netPerformance,
      returnFraction: capital.gt(0) ? netPerformance.div(capital) : new Big(0)
    };
  }

  private weightedThrough(currentDay: number): { weighted: Big; days: number } {
    let weighted = this.weighted;
    let days = this.days;
    if (this.method === 'ROAI' && this.previous.costBasis.gt(0)) {
      const duration = currentDay - this.previousDay;
      weighted = weighted.plus(
        this.previous.costBasis.plus(this.openingGain).mul(duration)
      );
      days += duration;
    }
    return { weighted, days };
  }

  public projectDisplayPoint(
    date: string,
    value: Big,
    currentDay: number
  ): FinancialRangeObservation {
    if (!this.first || !this.previous) {
      throw new Error(`Missing financial baseline: ${date}`);
    }
    const { weighted, days } = this.weightedThrough(currentDay);
    const netPerformance = value
      .minus(this.previous.costBasis)
      .plus(this.previous.realizedGain)
      .minus(this.first.netPerformance);
    return this.observation(
      date,
      this.previous.costBasis,
      netPerformance,
      weighted,
      days
    );
  }

  public addFinancialPoint(
    point: FinancialPoint,
    currentDay: number
  ): FinancialRangeObservation {
    if (!this.first) {
      this.first = point;
      this.openingGain = this.first.value.minus(this.first.costBasis);
      this.roiCapital = this.first.value;
    }
    if (this.previous) {
      if (this.method === 'ROI') {
        const change = point.costBasis.minus(this.previous.costBasis);
        if (change.gt(0)) {
          this.roiCapital = this.roiCapital.plus(change);
        }
      } else {
        const { weighted, days } = this.weightedThrough(currentDay);
        this.weighted = weighted;
        this.days = days;
      }
    }
    const netPerformance = point.netPerformance.minus(
      this.first.netPerformance
    );
    const result = this.observation(
      point.date,
      point.costBasis,
      netPerformance,
      this.weighted,
      this.days
    );
    this.previous = point;
    this.previousDay = currentDay;
    return result;
  }
}

/** Mirrors upstream getPerformance range normalization and historical ROI/ROAI
 * denominators, NOT holding-level ROAI or overall snapshot aggregation.
 * costBasis is upstream totalInvestment: sales remove average COST, not proceeds.
 */
export function evaluateRange(
  points: FinancialPoint[],
  method: 'ROI' | 'ROAI',
  start: string,
  end: string
) {
  if (day(start) > day(end)) {
    throw new Error('Reversed range');
  }
  if (method !== 'ROI' && method !== 'ROAI') {
    throw new Error('Unsupported method');
  }
  const result: FinancialRangeObservation[] = [];
  const evaluator = new IncrementalFinancialEvaluator(method);
  // Validate, select and evaluate in one pass. No filtered history allocation
  // or financial state changes for display-only/out-of-range observations.
  for (let i = 0; i < points.length; i++) {
    const point = points[i];
    const currentDay = day(point.date);
    if (i && point.date <= points[i - 1].date) {
      throw new Error('Points must be strictly ordered');
    }
    if (point.displayOnly || point.date < start || point.date > end) {
      continue;
    }
    result.push(evaluator.addFinancialPoint(point, currentDay));
  }
  return result;
}
