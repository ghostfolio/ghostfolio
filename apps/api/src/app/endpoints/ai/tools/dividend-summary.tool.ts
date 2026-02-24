import { OrderService } from '@ghostfolio/api/app/order/order.service';
import { PortfolioService } from '@ghostfolio/api/app/portfolio/portfolio.service';

import { tool } from 'ai';
import { z } from 'zod';

export function getDividendSummaryTool(deps: {
  orderService: OrderService;
  portfolioService: PortfolioService;
  userId: string;
  userCurrency: string;
}) {
  return tool({
    description:
      "Get the user's dividend income breakdown by period",
    parameters: z.object({
      groupBy: z
        .enum(['month', 'year'])
        .optional()
        .default('month')
        .describe('Group dividend data by month or year')
    }),
    execute: async ({ groupBy }) => {
      const { activities } =
        await deps.orderService.getOrdersForPortfolioCalculator({
          userId: deps.userId,
          userCurrency: deps.userCurrency,
          filters: []
        });

      const dividendActivities = activities.filter(
        (a) => a.type === 'DIVIDEND'
      );

      const dividends = deps.portfolioService.getDividends({
        groupBy,
        activities: dividendActivities
      });

      return {
        totalDividendItems: dividends.length,
        dividends: dividends.map((d) => ({
          date: d.date,
          investment: d.investment
        }))
      };
    }
  });
}
