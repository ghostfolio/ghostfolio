import { NewsService } from '@ghostfolio/api/app/endpoints/news/news.service';

import { tool } from 'ai';
import { z } from 'zod';

export function getPortfolioNewsTool(deps: { newsService: NewsService }) {
  return tool({
    description:
      'Get recent financial news for a specific stock symbol. Provide a ticker symbol like AAPL, MSFT, or VTI to see recent news articles.',
    parameters: z.object({
      symbol: z
        .string()
        .describe(
          'The stock ticker symbol to get news for (e.g. AAPL, MSFT, VTI)'
        )
    }),
    execute: async ({ symbol }) => {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Try to fetch fresh news from Finnhub
      await deps.newsService.fetchAndStoreNews({
        symbol,
        from: thirtyDaysAgo,
        to: now
      });

      // Return stored articles
      const articles = await deps.newsService.getStoredNews({
        symbol,
        limit: 5
      });

      if (articles.length === 0) {
        return {
          symbol,
          articles: [],
          message: `No recent news found for ${symbol}. This may be because the FINNHUB_API_KEY is not configured or the symbol has no recent coverage.`
        };
      }

      return {
        symbol,
        articles: articles.map((a) => ({
          headline: a.headline,
          summary: a.summary,
          source: a.source,
          publishedAt: a.publishedAt.toISOString(),
          url: a.url
        }))
      };
    }
  });
}
