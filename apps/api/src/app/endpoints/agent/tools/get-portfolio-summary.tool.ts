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

const logger = new Logger('Tool:get_portfolio_summary');

export function createGetPortfolioSummaryTool(deps: ToolDependencies) {
  return tool(
    'get_portfolio_summary',
    'Get portfolio summary: net worth, total investment, P&L, and fees.',
    {
      dateRange: DATE_RANGE_ENUM.optional()
        .default('ytd')
        .describe('Date range for summary calculation. Defaults to ytd'),
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
        const cacheKey = `details:${dateRange}:${JSON.stringify(filters)}:summary`;
        const redisCacheKey = buildToolCacheKey(
          deps.user.id,
          'get_portfolio_summary',
          { dateRange, accounts, assetClasses, tags }
        );

        const details = await withRedisCache(
          deps.redisCacheService,
          redisCacheKey,
          300_000,
          () =>
            withTimeout(
              memoize(deps.requestCache, cacheKey, () =>
                deps.portfolioService.getDetails({
                  dateRange: dateRange as any,
                  filters,
                  impersonationId: '',
                  userId: deps.user.id,
                  withSummary: true
                })
              )
            )
        );

        const result = {
          summary: (details as any).summary,
          accounts: (details as any).accounts,
          hasErrors: details.hasErrors
        };

        return {
          content: [{ type: 'text' as const, text: compactJson(result) }]
        };
      } catch (error) {
        const classified = classifyToolError(error);
        logger.error({
          event: 'agent.tool.error',
          tool: 'get_portfolio_summary',
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
