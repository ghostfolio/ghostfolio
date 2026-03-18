import { PrismaService } from '@ghostfolio/api/services/prisma/prisma.service';

import { Injectable, Logger } from '@nestjs/common';
import Big from 'big.js';

interface BenchmarkConfig {
  id: string;
  name: string;
  symbol: string;
}

const DEFAULT_BENCHMARKS: BenchmarkConfig[] = [
  { id: 'SP500', name: 'S&P 500', symbol: 'SPY' },
  { id: 'US_AGG_BOND', name: 'US Agg Bond', symbol: 'AGG' },
  { id: 'REAL_ESTATE', name: 'Real Estate', symbol: 'VNQ' },
  { id: 'CPI_PROXY', name: 'CPI Proxy (TIPS)', symbol: 'TIP' }
];

export interface BenchmarkComparison {
  excessReturn?: number;
  id: string;
  name: string;
  periodReturn: number;
  ytdReturn?: number;
}

@Injectable()
export class FamilyOfficeBenchmarkService {
  private readonly logger = new Logger(FamilyOfficeBenchmarkService.name);

  public constructor(private readonly prismaService: PrismaService) {}

  public getAvailableBenchmarks(): BenchmarkConfig[] {
    return DEFAULT_BENCHMARKS;
  }

  /**
   * Compute benchmark-matched returns for given benchmark IDs and date range.
   * Uses market data from the MarketData table if available.
   */
  public async computeBenchmarkComparisons({
    benchmarkIds,
    endDate,
    partnershipReturn,
    startDate
  }: {
    benchmarkIds: string[];
    endDate: Date;
    partnershipReturn: number;
    startDate: Date;
  }): Promise<BenchmarkComparison[]> {
    const comparisons: BenchmarkComparison[] = [];

    for (const benchmarkId of benchmarkIds) {
      const config = DEFAULT_BENCHMARKS.find((b) => b.id === benchmarkId);

      if (!config) {
        continue;
      }

      try {
        // Try to get market data for this symbol
        const marketData = await this.prismaService.marketData.findMany({
          orderBy: { date: 'asc' },
          where: {
            date: {
              gte: startDate,
              lte: endDate
            },
            symbol: config.symbol
          }
        });

        if (marketData.length >= 2) {
          const startValue = Number(marketData[0].marketPrice);
          const endValue = Number(
            marketData[marketData.length - 1].marketPrice
          );

          const periodReturn = new Big(endValue)
            .div(startValue)
            .minus(1)
            .round(6)
            .toNumber();

          const excessReturn = new Big(partnershipReturn)
            .minus(periodReturn)
            .round(6)
            .toNumber();

          comparisons.push({
            excessReturn,
            id: config.id,
            name: config.name,
            periodReturn
          });
        } else {
          // No market data available — return placeholder
          comparisons.push({
            id: config.id,
            name: config.name,
            periodReturn: 0
          });
        }
      } catch (error) {
        this.logger.warn(
          `Failed to compute benchmark ${config.id}: ${error.message}`
        );

        comparisons.push({
          id: config.id,
          name: config.name,
          periodReturn: 0
        });
      }
    }

    return comparisons;
  }
}
