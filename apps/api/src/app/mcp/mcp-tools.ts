import { z } from 'zod';

export interface McpToolDefinition {
  description: string;
  /**
   * `GET` for every tool except the single, explicitly allowlisted write (see
   * MCP_ALLOWED_WRITES). For `POST` the arguments that are not path parameters
   * are sent as the JSON body.
   */
  method?: 'GET' | 'POST';
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
    "Date range: 1d, wtd, 1w, mtd, 1m, 3m, 6m, ytd, 1y, 2y, 5y, 10y, max, or a calendar year such as '2024'. Default ytd"
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
      'Resolve a ticker or company name to the dataSource and symbol Ghostfolio uses, e.g. a Canadian ETF XEF is listed as XEF.TO on YAHOO. Use it to get both values right before create_activity.',
    inputSchema: {
      includeIndices: z.boolean().optional(),
      query: z.string().min(1).describe('Ticker or name to search for')
    },
    name: 'lookup_symbol',
    path: '/symbol/lookup'
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
      "Rebalancing analysis: current vs target weight per allocation group and the buy/sell actions once a threshold is breached. Weights and amounts are based on the actual market value (totalValue); capital compares that value with the plan's long-term growth target.",
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
  },
  {
    description:
      'WRITE. Record one transaction in the ledger (it does not place an order). Before calling: show the user the full list of entries you are about to write and get explicit confirmation, and check list_activities for duplicates. Not idempotent: calling twice records it twice. No edit or delete exists.',
    inputSchema: {
      accountId: z.string().describe('Account id from list_accounts'),
      comment: z.string().optional(),
      currency: z
        .string()
        .length(3)
        .describe('Currency of the transaction, e.g. CAD'),
      dataSource: z
        .string()
        .optional()
        .describe(
          'Data source from lookup_symbol, e.g. YAHOO. Optional only for FEE, INTEREST and LIABILITY'
        ),
      date: z
        .string()
        .describe(
          'Date of the trade. A plain date such as 2026-10-14 is recorded at noon UTC, so it shows as that day in every time zone. With a time, give the offset, e.g. 2026-10-14T11:13:58-04:00'
        ),
      fee: z.number().min(0).default(0).describe('Commission, 0 if none'),
      quantity: z.number().min(0),
      symbol: z.string().describe('Symbol from lookup_symbol, e.g. XEF.TO'),
      type: z.enum(['BUY', 'SELL', 'DIVIDEND', 'FEE', 'INTEREST', 'LIABILITY']),
      unitPrice: z.number().min(0).describe('Price per unit, not the total')
    },
    method: 'POST',
    name: 'create_activity',
    path: '/activities'
  }
];
