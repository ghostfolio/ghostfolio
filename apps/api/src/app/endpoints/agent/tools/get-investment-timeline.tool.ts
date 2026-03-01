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
  withRedisCache
} from './helpers';
import type { ToolDependencies } from './interfaces';

const logger = new Logger('Tool:get_investment_timeline');

export function createGetInvestmentTimelineTool(deps: ToolDependencies) {
  return tool(
    'get_investment_timeline',
    'Get investment timeline showing cumulative invested amount over time.',
    {
      dateRange: DATE_RANGE_ENUM.optional()
        .default('max')
        .describe(
          'Date range for investment timeline. 1d=today, wtd=week-to-date, mtd=month-to-date, ytd=year-to-date, 1y=1 year, 5y=5 years, max=all time'
        ),
      groupBy: z
        .enum(['month', 'year'])
        .optional()
        .describe(
          'Group investments by month or year. If omitted, returns individual entries.'
        ),
      savingsRate: z
        .number()
        .min(0)
        .optional()
        .default(0)
        .describe('Monthly savings rate for streak calculation'),
      accounts: z
        .array(z.string().uuid())
        .optional()
        .describe('Filter by account IDs'),
      assetClasses: ASSET_CLASSES_PARAM,
      tags: z.array(z.string().uuid()).optional().describe('Filter by tag IDs')
    },
    async ({
      dateRange,
      groupBy,
      savingsRate,
      accounts,
      assetClasses,
      tags
    }) => {
      try {
        const filters = buildFilters({ accounts, assetClasses, tags });

        const redisCacheKey = buildToolCacheKey(
          deps.user.id,
          'get_investment_timeline',
          { dateRange, groupBy, savingsRate, accounts, assetClasses, tags }
        );

        const { investments, streaks } = await withRedisCache(
          deps.redisCacheService,
          redisCacheKey,
          300_000,
          () =>
            withTimeout(
              deps.portfolioService.getInvestments({
                dateRange: dateRange as any,
                filters,
                groupBy: groupBy as any,
                impersonationId: '',
                savingsRate,
                userId: deps.user.id
              })
            )
        );

        return {
          content: [
            {
              type: 'text' as const,
              text: compactJson({ investments, streaks })
            }
          ]
        };
      } catch (error) {
        const classified = classifyToolError(error);
        logger.error({
          event: 'agent.tool.error',
          tool: 'get_investment_timeline',
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
