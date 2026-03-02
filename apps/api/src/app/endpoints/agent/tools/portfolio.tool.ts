import { PortfolioService } from '@ghostfolio/api/app/portfolio/portfolio.service';
import type { DateRange } from '@ghostfolio/common/types';

import { tool } from 'ai';
import { z } from 'zod';

export function createPortfolioAnalysisTool({
  portfolioService,
  userId
}: {
  portfolioService: PortfolioService;
  userId: string;
}) {
  return tool({
    description:
      'Get portfolio details including holdings, allocations, account breakdown, and summary metrics (total value, cash, currency). Use this when the user asks about their portfolio composition, what they own, or wants an overview.',
    inputSchema: z.object({
      dateRange: z
        .enum(['1d', '1y', '5y', 'max', 'mtd', 'wtd', 'ytd'])
        .optional()
        .describe(
          'Time range for the analysis. Defaults to max (all time). ' +
            'If the user asks for a range that doesn\'t exactly match (e.g. "last 3 months", "since October"), ' +
            'pick the closest range that fully covers their request and filter/summarize the relevant portion in your response. ' +
            "Never refuse a request just because the exact range isn't available."
        )
    }),
    execute: async ({ dateRange = 'max' }) => {
      try {
        const details = await portfolioService.getDetails({
          dateRange: dateRange as DateRange,
          filters: undefined,
          impersonationId: undefined,
          userId,
          withSummary: true
        });

        const holdings = Object.values(details.holdings).map((h) => ({
          name: h.name,
          symbol: h.symbol,
          currency: h.currency,
          assetClass: h.assetClass,
          assetSubClass: h.assetSubClass,
          allocationInPercentage: h.allocationInPercentage,
          valueInBaseCurrency: h.valueInBaseCurrency,
          netPerformancePercent: h.netPerformancePercent,
          quantity: h.quantity,
          marketPrice: h.marketPrice
        }));

        return {
          holdings,
          summary: details.summary,
          accounts: details.accounts
        };
      } catch (error) {
        return {
          error: `Failed to fetch portfolio: ${error instanceof Error ? error.message : 'unknown error'}`
        };
      }
    }
  });
}
