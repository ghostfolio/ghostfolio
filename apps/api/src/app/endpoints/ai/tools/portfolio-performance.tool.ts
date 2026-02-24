import { PortfolioService } from '@ghostfolio/api/app/portfolio/portfolio.service';

import { tool } from 'ai';
import { z } from 'zod';

export function getPortfolioPerformanceTool(deps: {
  portfolioService: PortfolioService;
  userId: string;
  impersonationId?: string;
}) {
  return tool({
    description:
      "Get the user's portfolio performance including total return, net performance percentage, and current net worth over a date range",
    parameters: z.object({
      dateRange: z
        .enum(['1d', 'wtd', 'mtd', 'ytd', '1y', '5y', 'max'])
        .optional()
        .default('ytd')
        .describe('Time period for performance calculation')
    }),
    execute: async ({ dateRange }) => {
      const result = await deps.portfolioService.getPerformance({
        dateRange,
        userId: deps.userId,
        impersonationId: deps.impersonationId,
        filters: []
      });

      return {
        performance: {
          currentNetWorth: result.performance.currentNetWorth,
          totalInvestment: result.performance.totalInvestment,
          netPerformance: result.performance.netPerformance,
          netPerformancePercentage: `${(result.performance.netPerformancePercentage * 100).toFixed(2)}%`
        },
        firstOrderDate: result.firstOrderDate,
        hasErrors: result.hasErrors
      };
    }
  });
}
