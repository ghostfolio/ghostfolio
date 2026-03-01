import { tool } from '@anthropic-ai/claude-agent-sdk';
import { Logger } from '@nestjs/common';
import { DataSource } from '@prisma/client';
import { z } from 'zod/v4';

import { classifyToolError, withTimeout } from './error-helpers';
import { buildToolCacheKey, compactJson, withRedisCache } from './helpers';
import type { ToolDependencies } from './interfaces';

const logger = new Logger('Tool:get_price_history');

export function createGetPriceHistoryTool(deps: ToolDependencies) {
  return tool(
    'get_price_history',
    'Get historical price data and all-time highs/lows for a symbol. Use this for price trends, all-time highs, all-time lows, and historical price analysis. Set getAllTimeHigh=true to include the all-time high price.',
    {
      dataSource: z.string().describe('Data source identifier (e.g., "YAHOO")'),
      symbol: z.string().describe('The ticker symbol (e.g., "TSLA")'),
      from: z
        .string()
        .optional()
        .describe(
          'Start date in ISO 8601 format (e.g., "2024-01-01"). Defaults to 1 year ago if omitted.'
        ),
      to: z
        .string()
        .optional()
        .describe(
          'End date in ISO 8601 format (e.g., "2024-12-31"). Defaults to today if omitted.'
        ),
      getAllTimeHigh: z
        .boolean()
        .optional()
        .default(false)
        .describe('Also return the all-time high price and date')
    },
    async ({ dataSource, symbol, from, to, getAllTimeHigh }) => {
      try {
        const now = new Date();
        const oneYearAgo = new Date(now);
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

        const fromDate = from ? new Date(from) : oneYearAgo;
        const toDate = to ? new Date(to) : now;

        if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
          return {
            isError: true,
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify({
                  error: true,
                  type: 'validation',
                  message:
                    'Invalid date format. Use ISO 8601 (e.g., "2024-01-01").'
                })
              }
            ]
          };
        }

        const ds = dataSource as DataSource;

        const redisCacheKey = buildToolCacheKey(
          deps.user.id,
          'get_price_history',
          {
            dataSource,
            symbol,
            from: fromDate.toISOString().split('T')[0],
            to: toDate.toISOString().split('T')[0],
            getAllTimeHigh
          }
        );
        const result = await withRedisCache(
          deps.redisCacheService,
          redisCacheKey,
          300_000,
          async () => {
            const priceData = await withTimeout(
              deps.marketDataService.getRange({
                assetProfileIdentifiers: [{ dataSource: ds, symbol }],
                dateQuery: {
                  gte: fromDate,
                  lt: toDate
                }
              }),
              15_000
            );

            const data: Record<string, unknown> = {
              symbol,
              dataSource,
              from: fromDate.toISOString().split('T')[0],
              to: toDate.toISOString().split('T')[0],
              dataPoints: priceData.length,
              prices: priceData.map((d) => ({
                date: d.date,
                marketPrice: d.marketPrice
              }))
            };

            if (getAllTimeHigh) {
              const max = await withTimeout(
                deps.marketDataService.getMax({ dataSource: ds, symbol })
              );

              if (max) {
                data.allTimeHigh = {
                  date: max.date,
                  marketPrice: max.marketPrice
                };
              }
            }

            return data;
          }
        );

        return {
          content: [
            {
              type: 'text' as const,
              text: compactJson({ priceHistory: result })
            }
          ]
        };
      } catch (error) {
        const classified = classifyToolError(error);
        logger.error({
          event: 'agent.tool.error',
          tool: 'get_price_history',
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
