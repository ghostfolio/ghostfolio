import { tool } from '@anthropic-ai/claude-agent-sdk';
import { Logger } from '@nestjs/common';
import { DataSource } from '@prisma/client';
import { z } from 'zod/v4';

import { classifyToolError, withTimeout } from './error-helpers';
import { buildToolCacheKey, compactJson, withRedisCache } from './helpers';
import type { ToolDependencies } from './interfaces';

const logger = new Logger('Tool:get_historical_price');

export function createGetHistoricalPriceTool(deps: ToolDependencies) {
  return tool(
    'get_historical_price',
    'Get the historical price for a symbol on a specific date.',
    {
      dataSource: z.string().describe('Data source identifier (e.g., "YAHOO")'),
      symbol: z.string().describe('The ticker symbol (e.g., "AAPL")'),
      date: z
        .string()
        .describe('The date to look up in ISO 8601 format (e.g., "2024-01-15")')
    },
    async ({ dataSource, symbol, date }) => {
      try {
        const redisCacheKey = buildToolCacheKey(
          deps.user.id,
          'get_historical_price',
          { dataSource, symbol, date }
        );
        const result = await withRedisCache(
          deps.redisCacheService,
          redisCacheKey,
          300_000,
          () =>
            withTimeout(
              deps.marketDataService.get({
                dataSource: dataSource as DataSource,
                date: new Date(date),
                symbol
              })
            )
        );

        if (!result) {
          return {
            isError: true,
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify({
                  error: true,
                  type: 'not_found',
                  message: `No price data found for ${symbol} on ${date}`
                })
              }
            ]
          };
        }

        return {
          content: [
            {
              type: 'text' as const,
              text: compactJson({
                symbol,
                date: result.date,
                marketPrice: result.marketPrice,
                state: result.state
              })
            }
          ]
        };
      } catch (error) {
        const classified = classifyToolError(error);
        logger.error({
          event: 'agent.tool.error',
          tool: 'get_historical_price',
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
