import { tool } from '@anthropic-ai/claude-agent-sdk';
import { Logger } from '@nestjs/common';
import { z } from 'zod/v4';

import { classifyToolError, withTimeout } from './error-helpers';
import {
  DATE_RANGE_ENUM,
  buildToolCacheKey,
  compactJson,
  memoize,
  withRedisCache
} from './helpers';
import type { ToolDependencies } from './interfaces';

const logger = new Logger('Tool:compare_to_benchmark');

export function createCompareToBenchmarkTool(deps: ToolDependencies) {
  return tool(
    'compare_to_benchmark',
    'Compare portfolio performance against a benchmark. Requires dataSource and symbol of the benchmark (e.g., dataSource "YAHOO", symbol "SPY" for S&P 500). If unknown, call get_benchmarks first to list available benchmarks, then use the dataSource and symbol from the result.',
    {
      dataSource: z.string().describe('Benchmark data source (e.g., "YAHOO")'),
      symbol: z
        .string()
        .describe('Benchmark ticker symbol (e.g., "SPY" for S&P 500)'),
      dateRange: DATE_RANGE_ENUM.optional()
        .default('ytd')
        .describe('Date range for comparison. Defaults to ytd')
    },
    async ({ dataSource, symbol, dateRange }) => {
      try {
        const redisCacheKey = buildToolCacheKey(
          deps.user.id,
          'compare_to_benchmark',
          { dataSource, symbol, dateRange }
        );
        const comparisonResult = await withRedisCache(
          deps.redisCacheService,
          redisCacheKey,
          60_000,
          async () => {
            const cacheKey = `performance:${dateRange}:[]`;
            const [portfolioPerformance, benchmarks] = await Promise.all([
              withTimeout(
                memoize(deps.requestCache, cacheKey, () =>
                  deps.portfolioService.getPerformance({
                    dateRange: dateRange as any,
                    filters: [],
                    impersonationId: '',
                    userId: deps.user.id
                  })
                )
              ),
              withTimeout(
                deps.benchmarkService.getBenchmarks({ useCache: true })
              )
            ]);

            if (!benchmarks || benchmarks.length === 0) {
              return {
                error: true,
                message:
                  'No benchmarks are configured. An admin must add benchmarks in the Ghostfolio admin settings before benchmark comparisons are available.'
              };
            }

            const matchedBenchmark = benchmarks.find(
              (b) => b.symbol === symbol && b.dataSource === dataSource
            );

            if (!matchedBenchmark) {
              const available = benchmarks
                .map(
                  (b) => `${b.name ?? b.symbol} (${b.dataSource}:${b.symbol})`
                )
                .join(', ');
              return {
                error: true,
                message: `Benchmark "${dataSource}:${symbol}" is not configured. Available benchmarks: ${available}`
              };
            }

            return {
              dateRange,
              portfolio: {
                performance: (portfolioPerformance as any).performance,
                firstOrderDate: (portfolioPerformance as any).firstOrderDate,
                hasErrors: (portfolioPerformance as any).hasErrors
              },
              benchmark: {
                symbol,
                dataSource,
                ...matchedBenchmark
              }
            };
          }
        );

        return {
          content: [
            {
              type: 'text' as const,
              text: compactJson(comparisonResult)
            }
          ]
        };
      } catch (error) {
        const classified = classifyToolError(error);
        logger.error({
          event: 'agent.tool.error',
          tool: 'compare_to_benchmark',
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
