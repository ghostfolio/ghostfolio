import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.service';

import { tool } from 'ai';
import { z } from 'zod';

export function getExchangeRateTool(deps: {
  exchangeRateDataService: ExchangeRateDataService;
}) {
  return tool({
    description:
      'Get the current exchange rate between two currencies. Useful for converting values between currencies.',
    parameters: z.object({
      fromCurrency: z
        .string()
        .describe('Source currency code (e.g., USD, EUR, GBP)'),
      toCurrency: z
        .string()
        .describe('Target currency code (e.g., USD, EUR, GBP)'),
      amount: z
        .number()
        .optional()
        .default(1)
        .describe('Amount to convert (defaults to 1)')
    }),
    execute: async ({ fromCurrency, toCurrency, amount }) => {
      const convertedValue = deps.exchangeRateDataService.toCurrency(
        amount,
        fromCurrency.toUpperCase(),
        toCurrency.toUpperCase()
      );

      return {
        fromCurrency: fromCurrency.toUpperCase(),
        toCurrency: toCurrency.toUpperCase(),
        amount,
        convertedValue,
        rate: amount !== 0 ? convertedValue / amount : 0
      };
    }
  });
}
