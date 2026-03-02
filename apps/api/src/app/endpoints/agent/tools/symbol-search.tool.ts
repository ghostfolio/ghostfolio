import { UserService } from '@ghostfolio/api/app/user/user.service';
import { DataProviderService } from '@ghostfolio/api/services/data-provider/data-provider.service';

import { tool } from 'ai';
import { z } from 'zod';

export function createSymbolSearchTool({
  dataProviderService,
  userService,
  userId
}: {
  dataProviderService: DataProviderService;
  userService: UserService;
  userId: string;
}) {
  return tool({
    description:
      'Search for a stock, ETF, or cryptocurrency by name or ticker. Use when unsure of the exact CoinGecko slug or Yahoo symbol. Returns matching assets with their correct symbol and dataSource for use with market_data.',
    inputSchema: z.object({
      query: z
        .string()
        .min(2)
        .describe(
          'Search query — a coin name, ticker, or company name (e.g. "stacks", "STX", "apple")'
        )
    }),
    execute: async ({ query }) => {
      try {
        const user = await userService.user({ id: userId });

        const { items } = await dataProviderService.search({
          query,
          user
        });

        return items
          .slice(0, 10)
          .map(
            ({
              assetClass,
              assetSubClass,
              currency,
              dataSource,
              name,
              symbol
            }) => ({
              symbol,
              name,
              dataSource,
              assetClass,
              assetSubClass,
              currency
            })
          );
      } catch (error) {
        return {
          error: `Failed to search symbols: ${error instanceof Error ? error.message : 'unknown error'}`
        };
      }
    }
  });
}
