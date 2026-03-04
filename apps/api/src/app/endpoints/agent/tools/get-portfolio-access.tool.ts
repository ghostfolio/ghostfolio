import { tool } from '@anthropic-ai/claude-agent-sdk';
import { Logger } from '@nestjs/common';

import { classifyToolError, withTimeout } from './error-helpers';
import { buildToolCacheKey, compactJson, withRedisCache } from './helpers';
import type { ToolDependencies } from './interfaces';

const logger = new Logger('Tool:get_portfolio_access');

export function createGetPortfolioAccessTool(deps: ToolDependencies) {
  return tool(
    'get_portfolio_access',
    'List who has access to your portfolio — shows all access grants and sharing settings. Use this when the user asks "who has access", "show my sharing settings", or "who can see my portfolio". Cannot view other users\' portfolios.',
    {},
    async () => {
      try {
        const redisCacheKey = buildToolCacheKey(
          deps.user.id,
          'get_portfolio_access',
          {}
        );

        const accesses = await withRedisCache(
          deps.redisCacheService,
          redisCacheKey,
          10_000,
          () =>
            withTimeout(
              deps.accessService.accesses({
                where: { userId: deps.user.id }
              })
            )
        );

        const result = accesses.map((access) => ({
          id: access.id,
          alias: access.alias,
          grantee: access.granteeUser ? { id: access.granteeUser.id } : null,
          createdAt: access.createdAt,
          updatedAt: access.updatedAt
        }));

        return {
          content: [
            {
              type: 'text' as const,
              text: compactJson({
                totalAccesses: result.length,
                accesses: result
              })
            }
          ]
        };
      } catch (error) {
        const classified = classifyToolError(error);
        logger.error({
          event: 'agent.tool.error',
          tool: 'get_portfolio_access',
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
