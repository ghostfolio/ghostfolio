import { getIntervalFromDateRange } from '@ghostfolio/common/calculation-helper';

import { tool } from '@anthropic-ai/claude-agent-sdk';
import { Logger } from '@nestjs/common';
import { Type as ActivityType } from '@prisma/client';
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

const logger = new Logger('Tool:get_dividends');

export function createGetDividendsTool(deps: ToolDependencies) {
  return tool(
    'get_dividends',
    'Get dividend history with amounts and dates.',
    {
      dateRange: DATE_RANGE_ENUM.optional()
        .default('max')
        .describe(
          'Date range for dividend history. 1d=today, wtd=week-to-date, mtd=month-to-date, ytd=year-to-date, 1y=1 year, 5y=5 years, max=all time'
        ),
      groupBy: z
        .enum(['month', 'year'])
        .optional()
        .describe(
          'Group dividends by month or year. If omitted, returns individual dividend entries.'
        ),
      accounts: z
        .array(z.string().uuid())
        .optional()
        .describe('Filter by account IDs'),
      assetClasses: ASSET_CLASSES_PARAM,
      tags: z.array(z.string().uuid()).optional().describe('Filter by tag IDs')
    },
    async ({ dateRange, groupBy, accounts, assetClasses, tags }) => {
      try {
        const filters = buildFilters({ accounts, assetClasses, tags });
        const userCurrency =
          deps.user.settings?.settings?.baseCurrency ?? 'USD';
        const { startDate, endDate } = getIntervalFromDateRange(
          dateRange as any
        );

        const redisCacheKey = buildToolCacheKey(deps.user.id, 'get_dividends', {
          dateRange,
          groupBy,
          accounts,
          assetClasses,
          tags
        });

        const dividends = await withRedisCache(
          deps.redisCacheService,
          redisCacheKey,
          120_000,
          async () => {
            const { activities } = await withTimeout(
              deps.orderService.getOrders({
                endDate,
                filters,
                startDate,
                types: [ActivityType.DIVIDEND],
                userCurrency,
                userId: deps.user.id
              })
            );

            return deps.portfolioService.getDividends({
              activities,
              groupBy: groupBy as any
            });
          }
        );

        return {
          content: [
            {
              type: 'text' as const,
              text: compactJson({ dividends })
            }
          ]
        };
      } catch (error) {
        const classified = classifyToolError(error);
        logger.error({
          event: 'agent.tool.error',
          tool: 'get_dividends',
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
