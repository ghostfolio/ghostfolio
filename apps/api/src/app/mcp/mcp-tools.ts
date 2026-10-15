import { z } from 'zod';

export interface McpToolDefinition {
  description: string;
  inputSchema: z.ZodRawShape;
  name: string;
  /** Names of arguments that are substituted into the `:param` path segments. */
  pathParams?: string[];
  /** REST path relative to the API root, e.g. `/portfolio/details`. */
  path: string;
  /** REST API version, defaults to 1. */
  version?: number;
}

const range = z
  .string()
  .optional()
  .describe(
    "Date range: 1d, wtd, 1w, mtd, 1m, 3m, 6m, ytd, 1y, 2y, 3y, 5y, 10y, max, or a calendar year such as '2024'. Default ytd"
  );

const accounts = z
  .string()
  .optional()
  .describe('Comma-separated account ids to filter by (see list_accounts)');

const assetClasses = z
  .string()
  .optional()
  .describe(
    'Comma-separated asset classes to filter by, e.g. EQUITY,FIXED_INCOME,LIQUIDITY,COMMODITY,REAL_ESTATE'
  );

const dataSource = z
  .string()
  .optional()
  .describe('Data source of the symbol, use together with symbol');

const symbol = z.string().optional().describe('Filter by a single symbol');

const tags = z.string().optional().describe('Comma-separated tag ids');

const portfolioFilters = { accounts, assetClasses, dataSource, symbol, tags };

/**
 * The curated, read-only tool surface. Every tool maps 1:1 onto an existing
 * REST endpoint, so authentication, permissions and response shaping stay in
 * the API. Mutating endpoints are deliberately not exposed.
 *
 * Keep descriptions short: the tool list is resident context for the whole
 * session of the connected model.
 */
export const MCP_TOOLS: McpToolDefinition[] = [
  {
    description:
      'Current user: base currency, language, settings and subscription. Call first to learn the base currency all values are reported in.',
    inputSchema: {},
    name: 'get_user',
    path: '/user'
  },
  {
    description:
      'List accounts with balance, value, currency, platform and activity count, plus total investment.',
    inputSchema: {},
    name: 'list_accounts',
    path: '/account'
  },
  {
    description:
      'Portfolio overview: per-holding allocation and performance, account breakdown and summary (net worth, total investment, dividend, fees, emergency fund, cash). Can be large; prefer list_holdings for a plain position list.',
    inputSchema: { ...portfolioFilters, range },
    name: 'get_portfolio_details',
    path: '/portfolio/details'
  },
  {
    description:
      'Flat list of current positions with quantity, value, allocation in percentage, net performance and market price.',
    inputSchema: {
      ...portfolioFilters,
      holdingType: z
        .string()
        .optional()
        .describe('ACTIVE or CLOSED, default ACTIVE'),
      query: z.string().optional().describe('Free-text search on name/symbol'),
      range
    },
    name: 'list_holdings',
    path: '/portfolio/holdings'
  },
  {
    description:
      'One position in depth: average buy price, quantity, performance, dividend, fees, first buy date, market data history. Take dataSource and symbol from list_holdings.',
    inputSchema: {
      dataSource: z.string().describe('Data source, e.g. YAHOO'),
      symbol: z.string().describe('Symbol, e.g. AAPL')
    },
    name: 'get_holding',
    path: '/portfolio/holding/:dataSource/:symbol',
    pathParams: ['dataSource', 'symbol']
  },
  {
    description:
      'Portfolio performance over a range: net performance, current net worth, total investment, annualized performance and the value chart.',
    inputSchema: { ...portfolioFilters, range },
    name: 'get_portfolio_performance',
    path: '/portfolio/performance',
    version: 2
  },
  {
    description:
      'Money invested per period (the investment timeline) plus the investment streaks.',
    inputSchema: {
      ...portfolioFilters,
      groupBy: z
        .enum(['month', 'year'])
        .optional()
        .describe('Aggregate per month or year, default per day'),
      range
    },
    name: 'get_portfolio_investments',
    path: '/portfolio/investments'
  },
  {
    description: 'Dividends received over time.',
    inputSchema: {
      ...portfolioFilters,
      groupBy: z.enum(['month', 'year']).optional().describe('Aggregate'),
      range
    },
    name: 'get_portfolio_dividends',
    path: '/portfolio/dividends'
  },
  {
    description:
      'Portfolio X-Ray: risk rules (currency/asset-class/account clusters, fees, emergency fund, ...) with which are fulfilled.',
    inputSchema: {},
    name: 'get_portfolio_report',
    path: '/portfolio/report'
  },
  {
    description:
      'Transaction records (buy, sell, dividend, fee, interest, liability) with date, quantity, unit price, fee, account and symbol. Paginated; newest first by default.',
    inputSchema: {
      accounts,
      activityTypes: z
        .string()
        .optional()
        .describe(
          'Comma-separated types: BUY,SELL,DIVIDEND,FEE,INTEREST,LIABILITY'
        ),
      assetClasses,
      dataSource,
      endDate: z
        .string()
        .optional()
        .describe('ISO date, inclusive upper bound. Ignored if range is set'),
      range,
      skip: z.number().int().min(0).optional().describe('Pagination offset'),
      sortColumn: z
        .string()
        .optional()
        .describe('date (default), symbol, quantity, unitPrice, fee, type'),
      sortDirection: z.enum(['asc', 'desc']).optional(),
      startDate: z
        .string()
        .optional()
        .describe('ISO date, inclusive lower bound. Ignored if range is set'),
      symbol,
      symbols: z.string().optional().describe('Comma-separated symbols'),
      tags,
      take: z
        .number()
        .int()
        .min(1)
        .max(500)
        .optional()
        .describe('Page size, default 100, max 500')
    },
    name: 'list_activities',
    path: '/activities'
  },
  {
    description:
      'Investment plan: capital pool, cash buffer/reserve, long-term growth target, monthly SIP budget, target allocation groups with weights and rebalance thresholds, DCA schedules, price alerts and deployed capital.',
    inputSchema: {},
    name: 'get_investment_plan',
    path: '/investment-plan'
  },
  {
    description:
      'Recent DCA / investment signals generated for the plan, with their status (pending, executed, dismissed).',
    inputSchema: {},
    name: 'get_investment_signals',
    path: '/investment-plan/signals'
  },
  {
    description:
      'Rebalancing analysis: current vs target weight per allocation group and the buy/sell actions needed once a threshold is breached.',
    inputSchema: {},
    name: 'get_rebalancing',
    path: '/investment-plan/rebalancing'
  },
  {
    description:
      'Watchlist: tracked symbols with market price, trend and performance.',
    inputSchema: {},
    name: 'get_watchlist',
    path: '/watchlist'
  }
];
