import { ActivitiesService } from '@ghostfolio/api/services/activities/activities.service';
import { SymbolService } from '@ghostfolio/api/services/symbol/symbol.service';
import { isCurrency } from '@ghostfolio/common/helper';
import {
  AssetProfileIdentifier,
  BenchmarkMarketDataDetailsResponse,
  Filter
} from '@ghostfolio/common/interfaces';

import { Injectable } from '@nestjs/common';
import { DataSource } from '@prisma/client';

import { createActivityFunding } from './activity-matched/activity-cash-flow.provider';
import { runActivityMatchedBenchmarkPipeline } from './activity-matched/activity-matched-benchmark.pipeline';
import { createBenchmarkDisplayValuations } from './activity-matched/benchmark-display-valuation.adapter';
import { BenchmarkFxMarketDataProvider } from './activity-matched/benchmark-fx-market-data.provider';
import { BenchmarkMarketDataProvider } from './activity-matched/benchmark-market-data.provider';
import { composeBenchmarkPerformanceSeries } from './activity-matched/benchmark-performance-series.adapter';

export interface ActivityMatchedBenchmarkInput extends AssetProfileIdentifier {
  userId: string;
  filters?: Filter[];
  currency: string;
  valuationDates: string[];
  start: string;
  end: string;
  method: 'ROI' | 'ROAI';
}

function calendarDate(date: string): Date {
  const result = new Date(`${date}T00:00:00Z`);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    !Number.isFinite(result.getTime()) ||
    result.toISOString().slice(0, 10) !== date
  ) {
    throw new Error(`Invalid benchmark date: ${date}`);
  }
  return result;
}

@Injectable()
export class ActivityMatchedBenchmarkService {
  public constructor(
    private readonly activitiesService: ActivitiesService,
    private readonly symbolService: SymbolService,
    private readonly benchmarkMarketDataProvider: BenchmarkMarketDataProvider,
    private readonly benchmarkFxMarketDataProvider: BenchmarkFxMarketDataProvider
  ) {}

  public async getMarketDataForUser({
    userId,
    filters,
    dataSource,
    symbol,
    currency,
    valuationDates,
    start,
    end,
    method
  }: ActivityMatchedBenchmarkInput): Promise<BenchmarkMarketDataDetailsResponse> {
    calendarDate(start);
    const endDate = calendarDate(end);
    if (start > end) throw new Error('Reversed benchmark range');
    if (method !== 'ROI' && method !== 'ROAI') {
      throw new Error('Unsupported benchmark method');
    }
    if (!userId?.trim()) throw new Error('Missing benchmark user');
    if (!symbol?.trim() || !Object.values(DataSource).includes(dataSource)) {
      throw new Error('Invalid benchmark identifier');
    }
    if (!isCurrency(currency)) throw new Error('Invalid portfolio currency');

    const dates = [...new Set(valuationDates)]
      .filter((date) => {
        calendarDate(date);
        return date >= start && date <= end;
      })
      .sort();
    if (dates.length === 0) return { marketData: [] };

    const benchmark = await this.symbolService.get({
      dataGatheringItem: { dataSource, symbol }
    });
    if (!benchmark) throw new Error(`Missing benchmark symbol: ${symbol}`);
    if (!isCurrency(benchmark.currency)) {
      throw new Error(`Invalid benchmark currency: ${symbol}`);
    }

    const result =
      await this.activitiesService.getActivitiesForPortfolioCalculator({
        userId,
        filters,
        userCurrency: currency,
        withCash: false
      });
    // Reconstruct all prior holdings, excluding only events after the interval.
    // Keep invalid dates so funding validation can reject them rather than hide them.
    const activities = result.activities.filter(
      ({ date }) =>
        !(date instanceof Date) ||
        !Number.isFinite(date.getTime()) ||
        date.toISOString().slice(0, 10) <= end
    );
    const funding = createActivityFunding({ activities, currency });
    if (!funding.canSimulate) throw new Error('Invalid activity funding');
    if (funding.flows.length === 0) return { marketData: [] };

    let historicalStart = dates[0];
    for (const flow of funding.flows) {
      if (flow.date < historicalStart) historicalStart = flow.date;
    }
    const { prices } =
      await this.benchmarkMarketDataProvider.getHistoricalPrices({
        dataSource,
        symbol,
        startDate: calendarDate(historicalStart),
        endDate
      });
    // The provider also returns a preceding original quote. The pipeline converts
    // every supplied quote, so historical FX must cover that original date too.
    let fxStart = historicalStart;
    for (const price of prices) {
      calendarDate(price.date);
      if (price.date < fxStart) fxStart = price.date;
    }
    const fxQuotes =
      await this.benchmarkFxMarketDataProvider.getHistoricalFxQuotes({
        currencyFrom: benchmark.currency,
        currencyTo: currency,
        startDate: calendarDate(fxStart),
        endDate
      });
    const pipeline = runActivityMatchedBenchmarkPipeline({
      activities,
      currency,
      benchmarkCurrency: benchmark.currency,
      prices,
      fxQuotes,
      valuationDates: dates,
      start,
      end,
      method
    });
    const displayValuations = createBenchmarkDisplayValuations({
      points: pipeline.points,
      prices,
      fxQuotes,
      currencyFrom: benchmark.currency,
      currencyTo: currency
    });
    return {
      marketData: composeBenchmarkPerformanceSeries({
        points: pipeline.points,
        financialCurrency: currency,
        displayValuations,
        valuationDates: dates,
        start,
        end,
        method
      })
    };
  }
}
