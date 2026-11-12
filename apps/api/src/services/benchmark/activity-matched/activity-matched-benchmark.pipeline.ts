import { Activity } from '@ghostfolio/common/interfaces';

import {
  ActivityFundingResult,
  createActivityFunding
} from './activity-cash-flow.provider';
import {
  BenchmarkPrice,
  evaluateRange,
  FinancialPoint,
  simulateBenchmark
} from './activity-matched-benchmark';
import {
  BenchmarkFxQuote,
  BenchmarkFxResult,
  convertBenchmarkPrices
} from './benchmark-fx.adapter';
import {
  BenchmarkPriceAdapterResult,
  prepareBenchmarkPrices
} from './benchmark-price.adapter';

export interface ActivityMatchedBenchmarkPipelineInput {
  activities: Activity[];
  currency: string;
  benchmarkCurrency: string;
  prices: BenchmarkPrice[];
  fxQuotes: BenchmarkFxQuote[];
  valuationDates: string[];
  start: string;
  end: string;
  method: 'ROI' | 'ROAI';
  maxPriceAgeDays?: number;
  maxFxAgeDays?: number;
}

export interface ActivityMatchedBenchmarkPipelineResult {
  funding: ActivityFundingResult;
  fx: BenchmarkFxResult;
  preparedPrices: BenchmarkPriceAdapterResult;
  points: FinancialPoint[];
  performance: ReturnType<typeof evaluateRange>;
}

export function runActivityMatchedBenchmarkPipeline({
  activities,
  currency,
  benchmarkCurrency,
  prices,
  fxQuotes,
  valuationDates,
  start,
  end,
  method,
  maxPriceAgeDays,
  maxFxAgeDays
}: ActivityMatchedBenchmarkPipelineInput): ActivityMatchedBenchmarkPipelineResult {
  const funding = createActivityFunding({
    activities,
    currency
  });

  if (!funding.canSimulate) {
    throw new Error('Invalid activity funding');
  }

  const preparedPrices = prepareBenchmarkPrices({
    executionDates: funding.flows.map(({ date }) => date),
    prices,
    maxExecutionAgeDays: maxPriceAgeDays
  });

  const fx = convertBenchmarkPrices({
    prices: preparedPrices.prices,
    currencyFrom: benchmarkCurrency,
    currencyTo: currency,
    fxQuotes,
    maxFxAgeDays
  });

  const points = simulateBenchmark({
    flows: funding.flows,
    prices: fx.prices,
    valuationDates,
    maxPriceAgeDays
  });

  const performance = evaluateRange(points, method, start, end);

  return {
    funding,
    fx,
    preparedPrices,
    points,
    performance
  };
}
