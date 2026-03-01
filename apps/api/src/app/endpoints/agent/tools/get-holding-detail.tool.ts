import { tool } from '@anthropic-ai/claude-agent-sdk';
import { Logger } from '@nestjs/common';
import { DataSource } from '@prisma/client';
import { z } from 'zod/v4';

import { classifyToolError, withTimeout } from './error-helpers';
import { buildToolCacheKey, compactJson, withRedisCache } from './helpers';
import type { ToolDependencies } from './interfaces';

const logger = new Logger('Tool:get_holding_detail');

export function createGetHoldingDetailTool(deps: ToolDependencies) {
  return tool(
    'get_holding_detail',
    'Get detailed performance data for a single holding including cost basis, P&L, and allocation. Use this for deep-dive analysis of one position. Requires dataSource (typically "YAHOO") and symbol. Do not use get_portfolio_holdings for single-position detail.',
    {
      dataSource: z.string().describe('Data source identifier (e.g., "YAHOO")'),
      symbol: z.string().describe('The ticker symbol (e.g., "AAPL")')
    },
    async ({ dataSource, symbol }) => {
      try {
        const redisCacheKey = buildToolCacheKey(
          deps.user.id,
          'get_holding_detail',
          { dataSource, symbol }
        );

        const holding = await withRedisCache(
          deps.redisCacheService,
          redisCacheKey,
          120_000,
          () =>
            withTimeout(
              deps.portfolioService.getHolding({
                dataSource: dataSource as DataSource,
                impersonationId: '',
                symbol,
                userId: deps.user.id
              })
            )
        );

        return {
          content: [
            {
              type: 'text' as const,
              text: compactJson({ holding })
            }
          ]
        };
      } catch (error) {
        const classified = classifyToolError(error);
        logger.error({
          event: 'agent.tool.error',
          tool: 'get_holding_detail',
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
