import { tool } from '@anthropic-ai/claude-agent-sdk';
import { Logger } from '@nestjs/common';
import { z } from 'zod/v4';

import { classifyToolError } from './error-helpers';
import { buildToolCacheKey, compactJson, withRedisCache } from './helpers';
import type { ToolDependencies } from './interfaces';

const logger = new Logger('Tool:convert_currency');

export function createConvertCurrencyTool(deps: ToolDependencies) {
  return tool(
    'convert_currency',
    'Convert an amount between currencies.',
    {
      amount: z.number().nonnegative().describe('Amount to convert'),
      fromCurrency: z
        .string()
        .length(3)
        .describe('Source currency code (e.g., "EUR")'),
      toCurrency: z
        .string()
        .length(3)
        .describe('Target currency code (e.g., "USD")')
    },
    async ({ amount, fromCurrency, toCurrency }) => {
      try {
        const redisCacheKey = buildToolCacheKey(
          deps.user.id,
          'convert_currency',
          { amount, fromCurrency, toCurrency }
        );
        const { convertedAmount, rate } = await withRedisCache(
          deps.redisCacheService,
          redisCacheKey,
          300_000,
          async () => {
            const converted =
              await deps.exchangeRateDataService.toCurrencyOnDemand(
                amount,
                fromCurrency,
                toCurrency
              );

            if (converted === undefined) {
              throw new Error(
                `No exchange rate available for ${fromCurrency} to ${toCurrency}`
              );
            }

            return {
              convertedAmount: converted,
              rate: amount > 0 ? converted / amount : 0
            };
          }
        );

        return {
          content: [
            {
              type: 'text' as const,
              text: compactJson({
                amount,
                fromCurrency,
                toCurrency,
                convertedAmount,
                rate
              })
            }
          ]
        };
      } catch (error) {
        const classified = classifyToolError(error);
        logger.error({
          event: 'agent.tool.error',
          tool: 'convert_currency',
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
