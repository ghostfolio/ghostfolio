import { PortfolioService } from '@ghostfolio/api/app/portfolio/portfolio.service';

import { DataSource } from '@prisma/client';
import { tool } from 'ai';
import { z } from 'zod';

export function createHoldingsLookupTool({
  portfolioService,
  userId
}: {
  portfolioService: PortfolioService;
  userId: string;
}) {
  return tool({
    description:
      'Look up detailed information about a specific holding in the portfolio: performance, dividends, fees, historical data, countries, sectors. Use when the user asks about a specific stock, ETF, or crypto they hold.',
    inputSchema: z.object({
      symbol: z.string().describe('Ticker symbol (e.g. AAPL, MSFT, BTC-USD)'),
      dataSource: z
        .enum([
          'ALPHA_VANTAGE',
          'COINGECKO',
          'EOD_HISTORICAL_DATA',
          'FINANCIAL_MODELING_PREP',
          'GHOSTFOLIO',
          'GOOGLE_SHEETS',
          'MANUAL',
          'RAPID_API',
          'YAHOO'
        ])
        .optional()
        .default('YAHOO')
        .describe('Data source. Defaults to YAHOO.')
    }),
    execute: async ({ symbol, dataSource = 'YAHOO' }) => {
      try {
        const holding = await portfolioService.getHolding({
          dataSource: dataSource as DataSource,
          impersonationId: undefined,
          symbol: symbol.toUpperCase(),
          userId
        });

        if (!holding) {
          return { error: `No holding found for ${symbol}` };
        }

        return {
          symbol: holding.SymbolProfile?.symbol,
          name: holding.SymbolProfile?.name,
          assetClass: holding.SymbolProfile?.assetClass,
          assetSubClass: holding.SymbolProfile?.assetSubClass,
          currency: holding.SymbolProfile?.currency,
          quantity: holding.quantity,
          averagePrice: holding.averagePrice,
          marketPrice: holding.marketPrice,
          marketPriceMin: holding.marketPriceMin,
          marketPriceMax: holding.marketPriceMax,
          value: holding.value,
          netPerformance: holding.netPerformance,
          netPerformancePercent: holding.netPerformancePercent,
          dividendInBaseCurrency: holding.dividendInBaseCurrency,
          dividendYieldPercent: holding.dividendYieldPercent,
          feeInBaseCurrency: holding.feeInBaseCurrency,
          activitiesCount: holding.activitiesCount,
          dateOfFirstActivity: holding.dateOfFirstActivity,
          countries: holding.SymbolProfile?.countries,
          sectors: holding.SymbolProfile?.sectors,
          tags: holding.tags
        };
      } catch (error) {
        return {
          error: `Failed to look up holding ${symbol}: ${error instanceof Error ? error.message : 'unknown error'}`
        };
      }
    }
  });
}
