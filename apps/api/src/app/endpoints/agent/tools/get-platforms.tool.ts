import { tool } from '@anthropic-ai/claude-agent-sdk';
import { Logger } from '@nestjs/common';

import { classifyToolError, withTimeout } from './error-helpers';
import { buildToolCacheKey, compactJson, withRedisCache } from './helpers';
import type { ToolDependencies } from './interfaces';

const logger = new Logger('Tool:get_platforms');

export function createGetPlatformsTool(deps: ToolDependencies) {
  return tool(
    'get_platforms',
    'List all available broker platforms and brokerage definitions. Use this when the user asks "what platforms are available" or "what brokers are there".',
    {},
    async () => {
      try {
        const redisCacheKey = buildToolCacheKey(
          deps.user.id,
          'get_platforms',
          {}
        );
        const platforms = await withRedisCache(
          deps.redisCacheService,
          redisCacheKey,
          300_000,
          () =>
            withTimeout(
              deps.platformService.getPlatforms({
                orderBy: { name: 'asc' }
              })
            )
        );

        return {
          content: [
            {
              type: 'text' as const,
              text: compactJson({ platforms })
            }
          ]
        };
      } catch (error) {
        const classified = classifyToolError(error);
        logger.error({
          event: 'agent.tool.error',
          tool: 'get_platforms',
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
