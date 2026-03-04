import { tool } from '@anthropic-ai/claude-agent-sdk';
import { Logger } from '@nestjs/common';

import { classifyToolError, withTimeout } from './error-helpers';
import { buildToolCacheKey, compactJson, withRedisCache } from './helpers';
import type { ToolDependencies } from './interfaces';

const logger = new Logger('Tool:get_tags');

export function createGetTagsTool(deps: ToolDependencies) {
  return tool(
    'get_tags',
    'Get all user-defined tags.',
    {},
    async () => {
      try {
        const redisCacheKey = buildToolCacheKey(deps.user.id, 'get_tags', {});

        const tags = await withRedisCache(
          deps.redisCacheService,
          redisCacheKey,
          120_000,
          () => withTimeout(deps.tagService.getTagsForUser(deps.user.id))
        );

        return {
          content: [
            {
              type: 'text' as const,
              text: compactJson({ tags })
            }
          ]
        };
      } catch (error) {
        const classified = classifyToolError(error);
        logger.error({
          event: 'agent.tool.error',
          tool: 'get_tags',
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
