import { tool } from '@anthropic-ai/claude-agent-sdk';
import { Logger } from '@nestjs/common';

import { classifyToolError, withTimeout } from './error-helpers';
import { buildToolCacheKey, compactJson, withRedisCache } from './helpers';
import type { ToolDependencies } from './interfaces';

const logger = new Logger('Tool:get_benchmarks');

export function createGetBenchmarksTool(deps: ToolDependencies) {
  return tool(
    'get_benchmarks',
    'List all available benchmark indices (e.g., S&P 500) with their performance data. Use this when the user asks "what benchmarks are available" or wants to see benchmark options.',
    {},
    async () => {
      try {
        const redisCacheKey = buildToolCacheKey(
          deps.user.id,
          'get_benchmarks',
          {}
        );
        const benchmarks = await withRedisCache(
          deps.redisCacheService,
          redisCacheKey,
          60_000,
          () =>
            withTimeout(deps.benchmarkService.getBenchmarks({ useCache: true }))
        );

        if (!benchmarks || benchmarks.length === 0) {
          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify({
                  benchmarks: [],
                  message:
                    'No benchmarks are configured. An admin must add benchmarks in the Ghostfolio admin settings.'
                })
              }
            ]
          };
        }

        return {
          content: [
            {
              type: 'text' as const,
              text: compactJson({ benchmarks })
            }
          ]
        };
      } catch (error) {
        const classified = classifyToolError(error);
        logger.error({
          event: 'agent.tool.error',
          tool: 'get_benchmarks',
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
