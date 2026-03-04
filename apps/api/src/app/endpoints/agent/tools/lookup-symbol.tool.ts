import { tool } from '@anthropic-ai/claude-agent-sdk';
import { Logger } from '@nestjs/common';
import { z } from 'zod/v4';

import { classifyToolError, withTimeout } from './error-helpers';
import { buildToolCacheKey, compactJson, withRedisCache } from './helpers';
import type { ToolDependencies } from './interfaces';

const logger = new Logger('Tool:lookup_symbol');

export function createLookupSymbolTool(deps: ToolDependencies) {
  return tool(
    'lookup_symbol',
    'Look up or search for any financial instrument by name, ticker symbol, or keyword. Use this for ANY "look up", "search", "find symbol", or "what is the ticker for" request.',
    {
      query: z
        .string()
        .min(1)
        .describe(
          'Search query: a stock ticker (e.g., "AAPL"), company name (e.g., "Apple"), ETF name (e.g., "MSCI World"), or cryptocurrency (e.g., "Bitcoin")'
        ),
      includeIndices: z
        .boolean()
        .optional()
        .default(false)
        .describe('If true, include index symbols (e.g., S&P 500) in results')
    },
    async ({ query: searchQuery, includeIndices }) => {
      try {
        const redisCacheKey = buildToolCacheKey(deps.user.id, 'lookup_symbol', {
          query: searchQuery,
          includeIndices
        });
        const result = await withRedisCache(
          deps.redisCacheService,
          redisCacheKey,
          300_000,
          () =>
            withTimeout(
              deps.symbolService.lookup({
                includeIndices,
                query: searchQuery,
                user: deps.user
              })
            )
        );

        return {
          content: [{ type: 'text' as const, text: compactJson(result) }]
        };
      } catch (error) {
        const classified = classifyToolError(error);
        logger.error({
          event: 'agent.tool.error',
          tool: 'lookup_symbol',
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
