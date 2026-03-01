import { tool } from '@anthropic-ai/claude-agent-sdk';
import { Logger } from '@nestjs/common';
import { DataSource } from '@prisma/client';
import { z } from 'zod/v4';

import { classifyToolError, withTimeout } from './error-helpers';
import { buildToolCacheKey, compactJson, withRedisCache } from './helpers';
import type { ToolDependencies } from './interfaces';

const logger = new Logger('Tool:get_quote');

export function createGetQuoteTool(deps: ToolDependencies) {
  return tool(
    'get_quote',
    'Get the current market price/quote for a specific stock, ETF, or asset. Use this when the user asks "what is the price of X" or "current price of X". Requires dataSource (usually "YAHOO") and symbol.',
    {
      dataSource: z.string().describe('Data source identifier (e.g., "YAHOO")'),
      symbol: z.string().describe('The ticker symbol (e.g., "AAPL", "MSFT")'),
      includeHistoricalData: z
        .boolean()
        .optional()
        .default(false)
        .describe('Include historical price data in response')
    },
    async ({ dataSource, symbol, includeHistoricalData }) => {
      try {
        const redisCacheKey = buildToolCacheKey(deps.user.id, 'get_quote', {
          dataSource,
          symbol,
          includeHistoricalData
        });
        const result = await withRedisCache(
          deps.redisCacheService,
          redisCacheKey,
          300_000,
          () =>
            withTimeout(
              deps.symbolService.get({
                dataGatheringItem: {
                  dataSource: dataSource as DataSource,
                  symbol
                },
                includeHistoricalData: includeHistoricalData ? 365 : undefined
              })
            )
        );

        return {
          content: [
            {
              type: 'text' as const,
              text: compactJson({ quote: result })
            }
          ]
        };
      } catch (error) {
        const classified = classifyToolError(error);
        logger.error({
          event: 'agent.tool.error',
          tool: 'get_quote',
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
