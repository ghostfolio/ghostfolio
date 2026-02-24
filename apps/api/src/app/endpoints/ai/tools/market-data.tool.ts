import { DataProviderService } from '@ghostfolio/api/services/data-provider/data-provider.service';
import { PrismaService } from '@ghostfolio/api/services/prisma/prisma.service';

import { tool } from 'ai';
import { z } from 'zod';

export function getLookupMarketDataTool(deps: {
  dataProviderService: DataProviderService;
  prismaService: PrismaService;
}) {
  return tool({
    description:
      'Look up current market data (price, currency) for a given stock symbol. Use this when the user asks about a specific asset price or market data.',
    parameters: z.object({
      symbol: z
        .string()
        .describe('The stock/asset ticker symbol (e.g., AAPL, MSFT, BTC)')
    }),
    execute: async ({ symbol }) => {
      const profile = await deps.prismaService.symbolProfile.findFirst({
        where: { symbol: { equals: symbol, mode: 'insensitive' } }
      });

      if (!profile) {
        return {
          error: `Symbol '${symbol}' not found in the database. The symbol may not be tracked in this Ghostfolio instance.`
        };
      }

      const quotes = await deps.dataProviderService.getQuotes({
        items: [{ dataSource: profile.dataSource, symbol: profile.symbol }]
      });

      const quote = quotes[profile.symbol];

      return {
        symbol: profile.symbol,
        name: profile.name,
        currency: profile.currency,
        dataSource: profile.dataSource,
        assetClass: profile.assetClass,
        assetSubClass: profile.assetSubClass,
        marketPrice: quote?.marketPrice ?? null,
        marketState: quote?.marketState ?? 'unknown'
      };
    }
  });
}
