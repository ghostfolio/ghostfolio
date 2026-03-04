import { tool } from '@anthropic-ai/claude-agent-sdk';
import { Logger } from '@nestjs/common';
import { z } from 'zod/v4';

import { classifyToolError, withTimeout } from './error-helpers';
import {
  ASSET_CLASSES_PARAM,
  DATE_RANGE_ENUM,
  buildFilters,
  buildToolCacheKey,
  compactJson,
  memoize,
  withRedisCache
} from './helpers';
import type { ToolDependencies } from './interfaces';

const logger = new Logger('Tool:get_portfolio_performance');

export function createGetPortfolioPerformanceTool(deps: ToolDependencies) {
  return tool(
    'get_portfolio_performance',
    'Get portfolio performance with returns, time-weighted rate, and drawdown.',
    {
      dateRange: DATE_RANGE_ENUM.optional()
        .default('ytd')
        .describe(
          'Date range for performance data. Defaults to ytd. 1d=today, wtd=week-to-date, mtd=month-to-date, ytd=year-to-date, 1y=1 year, 5y=5 years, max=all time'
        ),
      accounts: z
        .array(z.string().uuid())
        .optional()
        .describe('Filter by account IDs'),
      assetClasses: ASSET_CLASSES_PARAM,
      tags: z.array(z.string().uuid()).optional().describe('Filter by tag IDs')
    },
    async ({ dateRange, accounts, assetClasses, tags }) => {
      try {
        const filters = buildFilters({ accounts, assetClasses, tags });
        const cacheKey = `performance:${dateRange}:${JSON.stringify(filters)}`;
        const redisCacheKey = buildToolCacheKey(
          deps.user.id,
          'get_portfolio_performance',
          { dateRange, accounts, assetClasses, tags }
        );

        const performanceData = await withRedisCache(
          deps.redisCacheService,
          redisCacheKey,
          300_000,
          () =>
            withTimeout(
              memoize(deps.requestCache, cacheKey, () =>
                deps.portfolioService.getPerformance({
                  dateRange: dateRange as any,
                  filters,
                  impersonationId: '',
                  userId: deps.user.id
                })
              )
            )
        );

        return {
          content: [
            {
              type: 'text' as const,
              text: compactJson({
                performance: performanceData.performance,
                firstOrderDate: performanceData.firstOrderDate
              })
            }
          ]
        };
      } catch (error) {
        const classified = classifyToolError(error);
        logger.error({
          event: 'agent.tool.error',
          tool: 'get_portfolio_performance',
          ...classified
        });
        return {
          isError: true,
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                error: true,
                type: classified.type,
                message: classified.userMessage
              })
            }
          ]
        };
      }
    },
    { annotations: { readOnlyHint: true } }
  );
}
