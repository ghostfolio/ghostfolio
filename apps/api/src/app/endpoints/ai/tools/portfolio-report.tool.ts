import { PortfolioService } from '@ghostfolio/api/app/portfolio/portfolio.service';

import { tool } from 'ai';
import { z } from 'zod';

export function getPortfolioReportTool(deps: {
  portfolioService: PortfolioService;
  userId: string;
  impersonationId?: string;
}) {
  return tool({
    description:
      "Get the portfolio X-ray report showing diversification analysis, concentration risks, fee analysis, and other portfolio health checks",
    parameters: z.object({}),
    execute: async () => {
      const report = await deps.portfolioService.getReport({
        userId: deps.userId,
        impersonationId: deps.impersonationId
      });

      return {
        statistics: report.xRay.statistics,
        categories: report.xRay.categories.map((category) => ({
          key: category.key,
          name: category.name,
          rules: category.rules?.map((rule) => ({
            key: rule.key,
            name: rule.name,
            isActive: rule.isActive,
            value: rule.value
          }))
        }))
      };
    }
  });
}
