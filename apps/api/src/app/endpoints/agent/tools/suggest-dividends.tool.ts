import { tool } from '@anthropic-ai/claude-agent-sdk';
import { Logger } from '@nestjs/common';
import { z } from 'zod/v4';

import { classifyToolError, withTimeout } from './error-helpers';
import { buildToolCacheKey, compactJson, withRedisCache } from './helpers';
import type { ToolDependencies } from './interfaces';

const logger = new Logger('Tool:suggest_dividends');

export function createSuggestDividendsTool(deps: ToolDependencies) {
  return tool(
    'suggest_dividends',
    'Suggest missing dividend entries for holdings.',
    {
      dataSource: z.string().describe("Data source (e.g., 'YAHOO')"),
      symbol: z.string().describe("Ticker symbol (e.g., 'AAPL')")
    },
    async ({ dataSource, symbol }) => {
      try {
        const userCurrency =
          deps.user.settings?.settings?.baseCurrency ?? 'USD';

        const redisCacheKey = buildToolCacheKey(
          deps.user.id,
          'suggest_dividends',
          { dataSource, symbol }
        );
        const dividends = await withRedisCache(
          deps.redisCacheService,
          redisCacheKey,
          300_000,
          () =>
            withTimeout(
              deps.importService.getDividends({
                dataSource: dataSource as any,
                symbol,
                userCurrency,
                userId: deps.user.id
              }),
              15_000
            )
        );

        return {
          content: [
            {
              type: 'text' as const,
              text: compactJson({
                symbol,
                dataSource,
                suggestedDividends: dividends,
                count: dividends.length,
                message:
                  dividends.length > 0
                    ? `Found ${dividends.length} potential missing dividend(s) for ${symbol}.`
                    : `No missing dividends found for ${symbol}.`
              })
            }
          ]
        };
      } catch (error) {
        const classified = classifyToolError(error);
        logger.error({
          event: 'agent.tool.error',
          tool: 'suggest_dividends',
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
