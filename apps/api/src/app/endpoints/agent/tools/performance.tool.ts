import { PortfolioService } from '@ghostfolio/api/app/portfolio/portfolio.service';
import type { DateRange } from '@ghostfolio/common/types';

import { tool } from 'ai';
import { z } from 'zod';

export function createPortfolioPerformanceTool({
  portfolioService,
  userId
}: {
  portfolioService: PortfolioService;
  userId: string;
}) {
  return tool({
    description:
      'Get portfolio performance metrics over a time range: returns, net performance, chart data, and annualized performance. Use when the user asks about returns, how their portfolio is doing, or wants performance over a specific period.',
    inputSchema: z.object({
      dateRange: z
        .enum(['1d', '1y', '5y', 'max', 'mtd', 'wtd', 'ytd'])
        .optional()
        .describe(
          'Time range for performance data. Defaults to max (all time). ' +
            'If the user asks for a range that doesn\'t exactly match (e.g. "last 3 months", "since October"), ' +
            'pick the closest range that fully covers their request and filter/summarize the relevant portion in your response. ' +
            "Never refuse a request just because the exact range isn't available."
        )
    }),
    execute: async ({ dateRange = 'max' }) => {
      try {
        const result = await portfolioService.getPerformance({
          dateRange: dateRange as DateRange,
          filters: undefined,
          impersonationId: undefined,
          userId
        });

        // Downsample chart to ~20 points for LLM context efficiency
        const chart = result.chart ?? [];
        const sampled: { date: string; netWorth: number }[] = [];

        if (chart.length > 0) {
          const step = Math.max(1, Math.floor(chart.length / 20));

          for (let i = 0; i < chart.length; i += step) {
            sampled.push({
              date: chart[i].date,
              netWorth: chart[i].netWorth ?? 0
            });
          }

          // Always include the last point
          const last = chart[chart.length - 1];

          if (sampled[sampled.length - 1]?.date !== last.date) {
            sampled.push({ date: last.date, netWorth: last.netWorth ?? 0 });
          }
        }

        return {
          firstOrderDate: result.firstOrderDate,
          hasErrors: result.hasErrors,
          performance: result.performance,
          chart: sampled.length ? sampled : null
        };
      } catch (error) {
        return {
          error: `Failed to fetch performance: ${error instanceof Error ? error.message : 'unknown error'}`
        };
      }
    }
  });
}
