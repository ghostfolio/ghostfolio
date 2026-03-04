import { tool } from '@anthropic-ai/claude-agent-sdk';
import { Logger } from '@nestjs/common';
import { DataSource } from '@prisma/client';
import { z } from 'zod/v4';

import { classifyToolError, withTimeout } from './error-helpers';
import { buildToolCacheKey, compactJson, withRedisCache } from './helpers';
import type { ToolDependencies } from './interfaces';

const logger = new Logger('Tool:get_dividend_history');

export function createGetDividendHistoryTool(deps: ToolDependencies) {
  return tool(
    'get_dividend_history',
    'Get dividend payment history for a symbol.',
    {
      dataSource: z.string().describe('Data source identifier (e.g., "YAHOO")'),
      symbol: z.string().describe('The ticker symbol (e.g., "JNJ", "AAPL")'),
      from: z
        .string()
        .describe('Start date in ISO 8601 format (e.g., "2023-01-01")'),
      to: z
        .string()
        .optional()
        .describe('End date in ISO 8601 format. Defaults to today if omitted.'),
      granularity: z
        .enum(['day', 'month'])
        .optional()
        .default('month')
        .describe('Group dividends by day or month')
    },
    async ({ dataSource, symbol, from, to, granularity }) => {
      try {
        const toDate = to ? new Date(to) : new Date();
        const fromDate = new Date(from);

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
                    'Invalid date format. Use ISO 8601 (e.g., "2023-01-01").'
                })
              }
            ]
          };
        }

        const redisCacheKey = buildToolCacheKey(
          deps.user.id,
          'get_dividend_history',
          {
            dataSource,
            symbol,
            from,
            to: toDate.toISOString().split('T')[0],
            granularity
          }
        );
        const dividends = await withRedisCache(
          deps.redisCacheService,
          redisCacheKey,
          60_000,
          () =>
            withTimeout(
              deps.dataProviderService.getDividends({
                dataSource: dataSource as DataSource,
                from: new Date(from),
                granularity: granularity as 'day' | 'month',
                symbol,
                to: toDate
              }),
              20_000
            )
        );

        const entries = Object.entries(dividends).map(([date, amount]) => ({
          date,
          amount
        }));

        return {
          content: [
            {
              type: 'text' as const,
              text: compactJson({
                symbol,
                dataSource,
                from,
                to: toDate.toISOString().split('T')[0],
                granularity,
                totalPayments: entries.length,
                dividends: entries
              })
            }
          ]
        };
      } catch (error) {
        const classified = classifyToolError(error);
        logger.error({
          event: 'agent.tool.error',
          tool: 'get_dividend_history',
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
