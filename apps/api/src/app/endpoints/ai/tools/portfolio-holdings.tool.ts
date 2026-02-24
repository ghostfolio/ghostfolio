import { PortfolioService } from '@ghostfolio/api/app/portfolio/portfolio.service';

import { tool } from 'ai';
import { z } from 'zod';

export function getPortfolioHoldingsTool(deps: {
  portfolioService: PortfolioService;
  userId: string;
  impersonationId?: string;
}) {
  return tool({
    description:
      "Get the user's current portfolio holdings with allocation percentages, asset classes, currencies, and performance metrics",
    parameters: z.object({}),
    execute: async () => {
      const { holdings } = await deps.portfolioService.getDetails({
        userId: deps.userId,
        impersonationId: deps.impersonationId,
        filters: []
      });

      return Object.values(holdings).map((h) => ({
        name: h.name,
        symbol: h.symbol,
        currency: h.currency,
        assetClass: h.assetClass,
        assetSubClass: h.assetSubClass,
        allocationPercent: `${(h.allocationInPercentage * 100).toFixed(2)}%`,
        valueInBaseCurrency: h.valueInBaseCurrency,
        quantity: h.quantity,
        marketPrice: h.marketPrice,
        netPerformancePercent: `${(h.netPerformancePercent * 100).toFixed(2)}%`,
        netPerformance: h.netPerformance,
        dividend: h.dividend,
        activitiesCount: h.activitiesCount
      }));
    }
  });
}
