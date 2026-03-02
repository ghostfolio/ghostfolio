import { WatchlistService } from '@ghostfolio/api/app/endpoints/watchlist/watchlist.service';

import { DataSource } from '@prisma/client';
import { tool } from 'ai';
import { z } from 'zod';

export function createWatchlistManageTool({
  watchlistService,
  userId
}: {
  watchlistService: WatchlistService;
  userId: string;
}) {
  return tool({
    description:
      "Manage the user's watchlist of tracked securities. Add symbols to watch their price trends and market conditions, remove symbols no longer of interest, or list the current watchlist with performance data.",
    needsApproval:
      process.env.SKIP_APPROVAL === 'true'
        ? false
        : (input) => input.action !== 'list',
    inputSchema: z.object({
      action: z
        .enum(['add', 'remove', 'list'])
        .describe(
          "Action to perform. 'add': add a symbol to watch. 'remove': stop watching a symbol. 'list': show all watched symbols with trends."
        ),
      symbol: z
        .string()
        .optional()
        .describe(
          "Ticker symbol. Required for 'add' and 'remove'. Stocks/ETFs: uppercase (AAPL, MSFT). Crypto: CoinGecko slug (bitcoin, ethereum)."
        ),
      dataSource: z
        .enum(['YAHOO', 'COINGECKO'])
        .optional()
        .default('YAHOO')
        .describe(
          "Data source for the symbol. YAHOO for stocks/ETFs. COINGECKO for crypto. Required for 'add' and 'remove'."
        )
    }),
    execute: async (input) => {
      try {
        switch (input.action) {
          case 'add': {
            await watchlistService.createWatchlistItem({
              dataSource: input.dataSource as DataSource,
              symbol: input.symbol,
              userId
            });

            return {
              added: true,
              symbol: input.symbol,
              dataSource: input.dataSource
            };
          }

          case 'remove': {
            await watchlistService.deleteWatchlistItem({
              dataSource: input.dataSource as DataSource,
              symbol: input.symbol,
              userId
            });

            return { removed: true, symbol: input.symbol };
          }

          case 'list': {
            const items = await watchlistService.getWatchlistItems(userId);

            return items.map((item) => ({
              symbol: item.symbol,
              name: item.name,
              dataSource: item.dataSource,
              marketCondition: item.marketCondition,
              trend50d: item.trend50d,
              trend200d: item.trend200d,
              allTimeHighPerformance:
                item.performances?.allTimeHigh?.performancePercent
            }));
          }
        }
      } catch (error) {
        return {
          error: `Failed to ${input.action} watchlist item: ${error instanceof Error ? error.message : 'unknown error'}`
        };
      }
    }
  });
}
