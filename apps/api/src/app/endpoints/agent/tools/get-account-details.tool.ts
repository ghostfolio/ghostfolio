import { tool } from '@anthropic-ai/claude-agent-sdk';
import { Logger } from '@nestjs/common';
import { z } from 'zod/v4';

import { classifyToolError, withTimeout } from './error-helpers';
import { buildToolCacheKey, compactJson, withRedisCache } from './helpers';
import type { ToolDependencies } from './interfaces';

const logger = new Logger('Tool:get_account_details');

export function createGetAccountDetailsTool(deps: ToolDependencies) {
  return tool(
    'get_account_details',
    'Get account details: balances, platforms, and totals.',
    {
      filters: z
        .array(
          z.object({
            id: z.string().describe('Filter value ID'),
            type: z
              .enum(['ACCOUNT', 'ASSET_CLASS', 'TAG'])
              .describe('Filter type')
          })
        )
        .optional()
        .describe('Optional filters to narrow account results')
    },
    async ({ filters }) => {
      try {
        const redisCacheKey = buildToolCacheKey(
          deps.user.id,
          'get_account_details',
          { filters }
        );

        const accounts = await withRedisCache(
          deps.redisCacheService,
          redisCacheKey,
          300_000,
          () =>
            withTimeout(
              deps.portfolioService.getAccountsWithAggregations({
                filters: filters ?? [],
                userId: deps.user.id,
                withExcludedAccounts: true
              })
            )
        );

        return {
          content: [{ type: 'text' as const, text: compactJson(accounts) }]
        };
      } catch (error) {
        const classified = classifyToolError(error);
        logger.error({
          event: 'agent.tool.error',
          tool: 'get_account_details',
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
