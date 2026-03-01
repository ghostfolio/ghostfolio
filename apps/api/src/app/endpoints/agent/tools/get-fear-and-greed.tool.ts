import {
  ghostfolioFearAndGreedIndexDataSourceCryptocurrencies,
  ghostfolioFearAndGreedIndexDataSourceStocks,
  ghostfolioFearAndGreedIndexSymbolCryptocurrencies,
  ghostfolioFearAndGreedIndexSymbolStocks
} from '@ghostfolio/common/config';

import { tool } from '@anthropic-ai/claude-agent-sdk';
import { Logger } from '@nestjs/common';
import { z } from 'zod/v4';

import { classifyToolError, withTimeout } from './error-helpers';
import { buildToolCacheKey, compactJson, withRedisCache } from './helpers';
import type { ToolDependencies } from './interfaces';

const logger = new Logger('Tool:get_fear_and_greed');

export function createGetFearAndGreedTool(deps: ToolDependencies) {
  return tool(
    'get_fear_and_greed',
    'Get the current Fear & Greed Index value.',
    {
      market: z
        .enum(['stocks', 'crypto', 'both'])
        .optional()
        .default('both')
        .describe('Which market sentiment to retrieve')
    },
    async ({ market }) => {
      try {
        const redisCacheKey = buildToolCacheKey(
          deps.user.id,
          'get_fear_and_greed',
          { market }
        );
        const results = await withRedisCache(
          deps.redisCacheService,
          redisCacheKey,
          300_000,
          async () => {
            const data: Record<string, unknown> = {};

            if (market === 'both') {
              const [stocksData, cryptoData] = await Promise.all([
                withTimeout(
                  deps.symbolService.get({
                    dataGatheringItem: {
                      dataSource: ghostfolioFearAndGreedIndexDataSourceStocks,
                      symbol: ghostfolioFearAndGreedIndexSymbolStocks
                    }
                  })
                ),
                withTimeout(
                  deps.symbolService.get({
                    dataGatheringItem: {
                      dataSource:
                        ghostfolioFearAndGreedIndexDataSourceCryptocurrencies,
                      symbol: ghostfolioFearAndGreedIndexSymbolCryptocurrencies
                    }
                  })
                )
              ]);
              data.stocks = stocksData ?? null;
              data.crypto = cryptoData ?? null;
            } else if (market === 'stocks') {
              const stocksData = await withTimeout(
                deps.symbolService.get({
                  dataGatheringItem: {
                    dataSource: ghostfolioFearAndGreedIndexDataSourceStocks,
                    symbol: ghostfolioFearAndGreedIndexSymbolStocks
                  }
                })
              );
              data.stocks = stocksData ?? null;
            } else {
              const cryptoData = await withTimeout(
                deps.symbolService.get({
                  dataGatheringItem: {
                    dataSource:
                      ghostfolioFearAndGreedIndexDataSourceCryptocurrencies,
                    symbol: ghostfolioFearAndGreedIndexSymbolCryptocurrencies
                  }
                })
              );
              data.crypto = cryptoData ?? null;
            }

            return data;
          }
        );

        return {
          content: [
            {
              type: 'text' as const,
              text: compactJson({ fearAndGreedIndex: results })
            }
          ]
        };
      } catch (error) {
        const classified = classifyToolError(error);
        logger.error({
          event: 'agent.tool.error',
          tool: 'get_fear_and_greed',
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
