import { PortfolioService } from '@ghostfolio/api/app/portfolio/portfolio.service';

import { tool } from 'ai';
import { z } from 'zod';

export function getAccountSummaryTool(deps: {
  portfolioService: PortfolioService;
  userId: string;
}) {
  return tool({
    description:
      "Get a summary of the user's accounts including account names, platforms, balances, and currencies",
    parameters: z.object({}),
    execute: async () => {
      const accounts = await deps.portfolioService.getAccounts({
        userId: deps.userId,
        filters: []
      });

      return accounts.map((a) => ({
        name: a.name,
        currency: a.currency,
        balance: a.balance,
        balanceInBaseCurrency: a.balanceInBaseCurrency,
        valueInBaseCurrency: a.valueInBaseCurrency,
        platform: a.platform?.name ?? 'N/A',
        activitiesCount: a.activitiesCount,
        allocationPercent: `${((a.allocationInPercentage ?? 0) * 100).toFixed(2)}%`
      }));
    }
  });
}
