import { tool } from '@anthropic-ai/claude-agent-sdk';
import { Logger } from '@nestjs/common';
import { z } from 'zod/v4';

import { classifyToolError, withTimeout } from './error-helpers';
import {
  buildFilters,
  buildToolCacheKey,
  compactJson,
  withRedisCache
} from './helpers';
import type { ToolDependencies } from './interfaces';

const logger = new Logger('Tool:get_cash_balances');

export function createGetCashBalancesTool(deps: ToolDependencies) {
  return tool(
    'get_cash_balances',
    'Get cash balances across all accounts.',
    {
      accounts: z
        .array(z.string().uuid())
        .optional()
        .describe('Filter by account IDs'),
      tags: z.array(z.string().uuid()).optional().describe('Filter by tag IDs')
    },
    async ({ accounts, tags }) => {
      try {
        const filters = buildFilters({ accounts, tags });
        const baseCurrency =
          deps.user.settings?.settings?.baseCurrency ?? 'USD';

        const redisCacheKey = buildToolCacheKey(
          deps.user.id,
          'get_cash_balances',
          { accounts, tags }
        );

        const cashDetails = await withRedisCache(
          deps.redisCacheService,
          redisCacheKey,
          120_000,
          () =>
            withTimeout(
              deps.accountService.getCashDetails({
                currency: baseCurrency,
                filters,
                userId: deps.user.id,
                withExcludedAccounts: false
              })
            )
        );

        return {
          content: [
            {
              type: 'text' as const,
              text: compactJson({ baseCurrency, ...cashDetails })
            }
          ]
        };
      } catch (error) {
        const classified = classifyToolError(error);
        logger.error({
          event: 'agent.tool.error',
          tool: 'get_cash_balances',
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
