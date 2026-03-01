import { tool } from '@anthropic-ai/claude-agent-sdk';
import { Logger } from '@nestjs/common';
import { z } from 'zod/v4';

import { classifyToolError, withTimeout } from './error-helpers';
import { buildToolCacheKey, compactJson, withRedisCache } from './helpers';
import type { ToolDependencies } from './interfaces';

const logger = new Logger('Tool:get_balance_history');

export function createGetBalanceHistoryTool(deps: ToolDependencies) {
  return tool(
    'get_balance_history',
    'Get historical balance over time for a specific account.',
    {
      accountId: z
        .string()
        .uuid()
        .optional()
        .describe('Filter to a specific account')
    },
    async ({ accountId }) => {
      try {
        const userCurrency =
          deps.user.settings?.settings?.baseCurrency ?? 'USD';

        const filters = accountId
          ? [{ id: accountId, type: 'ACCOUNT' as const }]
          : [];

        const redisCacheKey = buildToolCacheKey(
          deps.user.id,
          'get_balance_history',
          { accountId }
        );

        const balances = await withRedisCache(
          deps.redisCacheService,
          redisCacheKey,
          120_000,
          () =>
            withTimeout(
              deps.accountBalanceService.getAccountBalances({
                filters,
                userCurrency,
                userId: deps.user.id,
                withExcludedAccounts: false
              })
            )
        );

        return {
          content: [
            {
              type: 'text' as const,
              text: compactJson(balances)
            }
          ]
        };
      } catch (error) {
        const classified = classifyToolError(error);
        logger.error({
          event: 'agent.tool.error',
          tool: 'get_balance_history',
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
