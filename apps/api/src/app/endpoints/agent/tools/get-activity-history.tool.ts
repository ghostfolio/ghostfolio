import { getIntervalFromDateRange } from '@ghostfolio/common/calculation-helper';

import { tool } from '@anthropic-ai/claude-agent-sdk';
import { Logger } from '@nestjs/common';
import { Type as ActivityType } from '@prisma/client';
import { z } from 'zod/v4';

import { classifyToolError, withTimeout } from './error-helpers';
import {
  buildFilters,
  buildToolCacheKey,
  compactJson,
  DATE_RANGE_ENUM,
  withRedisCache
} from './helpers';
import type { ToolDependencies } from './interfaces';

const logger = new Logger('Tool:get_activity_history');

const ACTIVITY_TYPE_MAP: Record<string, ActivityType> = {
  BUY: ActivityType.BUY,
  SELL: ActivityType.SELL,
  DIVIDEND: ActivityType.DIVIDEND,
  FEE: ActivityType.FEE,
  INTEREST: ActivityType.INTEREST,
  LIABILITY: ActivityType.LIABILITY
};

export function createGetActivityHistoryTool(deps: ToolDependencies) {
  return tool(
    'get_activity_history',
    'Get activity/transaction history with filters.',
    {
      dateRange: DATE_RANGE_ENUM.optional()
        .default('max')
        .describe(
          'Date range for activity history. 1d=today, wtd=week-to-date, mtd=month-to-date, ytd=year-to-date, 1y=1 year, 5y=5 years, max=all time'
        ),
      types: z
        .array(
          z.enum(['BUY', 'SELL', 'DIVIDEND', 'FEE', 'INTEREST', 'LIABILITY'])
        )
        .optional()
        .describe('Filter by activity type'),
      accounts: z
        .array(z.string().uuid())
        .optional()
        .describe('Filter by account IDs'),
      tags: z.array(z.string().uuid()).optional().describe('Filter by tag IDs'),
      take: z
        .number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .default(50)
        .describe('Maximum number of activities to return')
    },
    async ({ dateRange, types, accounts, tags, take }) => {
      try {
        const filters = buildFilters({ accounts, tags });
        const userCurrency =
          deps.user.settings?.settings?.baseCurrency ?? 'USD';
        const { startDate, endDate } = getIntervalFromDateRange(
          dateRange as any
        );

        const mappedTypes = types
          ? types.map((t) => ACTIVITY_TYPE_MAP[t])
          : undefined;

        const redisCacheKey = buildToolCacheKey(
          deps.user.id,
          'get_activity_history',
          { dateRange, types, accounts, tags, take }
        );

        const { activities } = await withRedisCache(
          deps.redisCacheService,
          redisCacheKey,
          300_000,
          () =>
            withTimeout(
              deps.orderService.getOrders({
                endDate,
                filters,
                startDate,
                take,
                types: mappedTypes,
                userCurrency,
                userId: deps.user.id
              })
            )
        );

        return {
          content: [
            {
              type: 'text' as const,
              text: compactJson({ activities, count: activities.length })
            }
          ]
        };
      } catch (error) {
        const classified = classifyToolError(error);
        logger.error({
          event: 'agent.tool.error',
          tool: 'get_activity_history',
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
