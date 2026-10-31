export interface PortfolioIntradayItem {
  /** Start of the interval (ISO 8601) */
  date: string;

  /** Change since the start of the date range, `null` for the future */
  value: number | null;
}

export interface PortfolioIntradayResponse {
  benchmarks: {
    id: string;
    items: PortfolioIntradayItem[];
  }[];

  /** Change of the portfolio since the start of the date range */
  chart: PortfolioIntradayItem[];

  interval: '5m' | '15m' | '60m';

  /** Whether a market (including the pre-market and the post-market) of a holding is open */
  isMarketOpen: boolean;
}
