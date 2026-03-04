import { tool } from '@anthropic-ai/claude-agent-sdk';
import { Logger } from '@nestjs/common';

import { classifyToolError, withTimeout } from './error-helpers';
import { buildToolCacheKey, compactJson, withRedisCache } from './helpers';
import type { ToolDependencies } from './interfaces';

const logger = new Logger('Tool:run_portfolio_xray');

export function createRunPortfolioXrayTool(deps: ToolDependencies) {
  return tool(
    'run_portfolio_xray',
    'Run portfolio X-ray: concentration, rules, and risk metrics.',
    {},
    async () => {
      try {
        const redisCacheKey = buildToolCacheKey(
          deps.user.id,
          'run_portfolio_xray',
          {}
        );

        const report = await withRedisCache(
          deps.redisCacheService,
          redisCacheKey,
          300_000,
          () =>
            withTimeout(
              deps.portfolioService.getReport({
                impersonationId: '',
                userId: deps.user.id
              })
            )
        );

        return {
          content: [{ type: 'text' as const, text: compactJson(report) }]
        };
      } catch (error) {
        const classified = classifyToolError(error);
        logger.error({
          event: 'agent.tool.error',
          tool: 'run_portfolio_xray',
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
