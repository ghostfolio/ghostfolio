import { createSdkMcpServer } from '@anthropic-ai/claude-agent-sdk';
import type {
  McpSdkServerConfigWithInstance,
  SdkMcpToolDefinition
} from '@anthropic-ai/claude-agent-sdk';

import { createCompareToBenchmarkTool } from './compare-to-benchmark.tool';
import { createConvertCurrencyTool } from './convert-currency.tool';
import { createExportPortfolioTool } from './export-portfolio.tool';
import { createGetAccountDetailsTool } from './get-account-details.tool';
import { createGetActivityDetailTool } from './get-activity-detail.tool';
import { createGetActivityHistoryTool } from './get-activity-history.tool';
import { createGetAssetProfileTool } from './get-asset-profile.tool';
import { createGetBalanceHistoryTool } from './get-balance-history.tool';
import { createGetBenchmarksTool } from './get-benchmarks.tool';
import { createGetCashBalancesTool } from './get-cash-balances.tool';
import { createGetDividendHistoryTool } from './get-dividend-history.tool';
import { createGetDividendsTool } from './get-dividends.tool';
import { createGetFearAndGreedTool } from './get-fear-and-greed.tool';
import { createGetHistoricalPriceTool } from './get-historical-price.tool';
import { createGetHoldingDetailTool } from './get-holding-detail.tool';
import { createGetInvestmentTimelineTool } from './get-investment-timeline.tool';
import { createGetMarketAllocationTool } from './get-market-allocation.tool';
import { createGetPlatformsTool } from './get-platforms.tool';
import { createGetPortfolioAccessTool } from './get-portfolio-access.tool';
import { createGetPortfolioHoldingsTool } from './get-portfolio-holdings.tool';
import { createGetPortfolioPerformanceTool } from './get-portfolio-performance.tool';
import { createGetPortfolioSummaryTool } from './get-portfolio-summary.tool';
import { createGetPriceHistoryTool } from './get-price-history.tool';
import { createGetQuoteTool } from './get-quote.tool';
import { createGetTagsTool } from './get-tags.tool';
import { createGetUserSettingsTool } from './get-user-settings.tool';
import { createGetWatchlistTool } from './get-watchlist.tool';
import type { ToolDependencies } from './interfaces';
import { createLookupSymbolTool } from './lookup-symbol.tool';
import { createRefreshMarketDataTool } from './refresh-market-data.tool';
import { createRunPortfolioXrayTool } from './run-portfolio-xray.tool';
import { createSuggestDividendsTool } from './suggest-dividends.tool';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ToolFactory = (deps: ToolDependencies) => SdkMcpToolDefinition<any>;

const TOOL_FACTORIES: Record<string, ToolFactory> = {
  get_portfolio_holdings: createGetPortfolioHoldingsTool,
  get_portfolio_performance: createGetPortfolioPerformanceTool,
  get_portfolio_summary: createGetPortfolioSummaryTool,
  get_market_allocation: createGetMarketAllocationTool,
  get_account_details: createGetAccountDetailsTool,
  get_dividends: createGetDividendsTool,
  run_portfolio_xray: createRunPortfolioXrayTool,
  get_holding_detail: createGetHoldingDetailTool,
  get_activity_history: createGetActivityHistoryTool,
  get_activity_detail: createGetActivityDetailTool,
  get_investment_timeline: createGetInvestmentTimelineTool,
  get_cash_balances: createGetCashBalancesTool,
  get_balance_history: createGetBalanceHistoryTool,
  lookup_symbol: createLookupSymbolTool,
  get_quote: createGetQuoteTool,
  get_benchmarks: createGetBenchmarksTool,
  compare_to_benchmark: createCompareToBenchmarkTool,
  convert_currency: createConvertCurrencyTool,
  get_platforms: createGetPlatformsTool,
  get_fear_and_greed: createGetFearAndGreedTool,
  get_asset_profile: createGetAssetProfileTool,
  get_historical_price: createGetHistoricalPriceTool,
  get_price_history: createGetPriceHistoryTool,
  get_dividend_history: createGetDividendHistoryTool,
  refresh_market_data: createRefreshMarketDataTool,
  get_watchlist: createGetWatchlistTool,
  get_tags: createGetTagsTool,
  suggest_dividends: createSuggestDividendsTool,
  export_portfolio: createExportPortfolioTool,
  get_user_settings: createGetUserSettingsTool,
  get_portfolio_access: createGetPortfolioAccessTool
};

export function createGhostfolioMcpServer(
  deps: ToolDependencies,
  allowedTools?: string[]
): McpSdkServerConfigWithInstance {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let tools: SdkMcpToolDefinition<any>[];

  if (allowedTools) {
    // Only instantiate tools that are in the allowed list
    const allowedNames = new Set(
      allowedTools.map((t) => t.replace('mcp__ghostfolio__', ''))
    );
    tools = [];
    for (const name of allowedNames) {
      const factory = TOOL_FACTORIES[name];
      if (factory) {
        tools.push(factory(deps));
      }
    }
  } else {
    // No filter — instantiate all tools
    tools = Object.values(TOOL_FACTORIES).map((factory) => factory(deps));
  }

  return createSdkMcpServer({
    name: 'ghostfolio',
    version: '1.0.0',
    tools
  });
}
