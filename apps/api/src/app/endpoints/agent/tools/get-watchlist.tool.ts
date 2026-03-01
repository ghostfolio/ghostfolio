import { tool } from '@anthropic-ai/claude-agent-sdk';
import { Logger } from '@nestjs/common';

import { classifyToolError, withTimeout } from './error-helpers';
import { buildToolCacheKey, compactJson, withRedisCache } from './helpers';
import type { ToolDependencies } from './interfaces';

const logger = new Logger('Tool:get_watchlist');

export function createGetWatchlistTool(deps: ToolDependencies) {
  return tool(
    'get_watchlist',
    "Get the user's watchlist items with current prices.",
    {},
    async () => {
      try {
        const redisCacheKey = buildToolCacheKey(
          deps.user.id,
          'get_watchlist',
          {}
        );

        const watchlist = await withRedisCache(
          deps.redisCacheService,
          redisCacheKey,
          120_000,
          () =>
            withTimeout(deps.watchlistService.getWatchlistItems(deps.user.id))
        );

        return {
          content: [
            {
              type: 'text' as const,
              text: compactJson({ watchlist })
            }
          ]
        };
      } catch (error) {
        const classified = classifyToolError(error);
        logger.error({
          event: 'agent.tool.error',
          tool: 'get_watchlist',
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
