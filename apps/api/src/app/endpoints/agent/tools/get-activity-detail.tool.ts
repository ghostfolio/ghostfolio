import { tool } from '@anthropic-ai/claude-agent-sdk';
import { Logger } from '@nestjs/common';
import { z } from 'zod/v4';

import { classifyToolError, withTimeout } from './error-helpers';
import { buildToolCacheKey, compactJson, withRedisCache } from './helpers';
import type { ToolDependencies } from './interfaces';

const logger = new Logger('Tool:get_activity_detail');

export function createGetActivityDetailTool(deps: ToolDependencies) {
  return tool(
    'get_activity_detail',
    'Get details of a specific activity by ID.',
    {
      activityId: z.string().uuid().describe('ID of the activity')
    },
    async ({ activityId }) => {
      try {
        const redisCacheKey = buildToolCacheKey(
          deps.user.id,
          'get_activity_detail',
          { activityId }
        );

        const activity = await withRedisCache(
          deps.redisCacheService,
          redisCacheKey,
          120_000,
          () => withTimeout(deps.orderService.order({ id: activityId }))
        );

        if (!activity || activity.userId !== deps.user.id) {
          return {
            isError: true,
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify({
                  error: true,
                  type: 'not_found',
                  message: `Activity with ID ${activityId} not found or does not belong to you.`
                })
              }
            ]
          };
        }

        return {
          content: [
            {
              type: 'text' as const,
              text: compactJson({ activity })
            }
          ]
        };
      } catch (error) {
        const classified = classifyToolError(error);
        logger.error({
          event: 'agent.tool.error',
          tool: 'get_activity_detail',
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
