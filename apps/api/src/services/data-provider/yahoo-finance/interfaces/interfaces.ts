export interface IYahooFinanceHistoricalResponse {
  adjClose: number;
  close: number;
  date: Date;
  high: number;
  low: number;
  open: number;
  symbol: string;
  volume: number;
}

export interface IYahooFinanceQuoteResponse {
  price: IYahooFinancePrice;
  summaryProfile: IYahooFinanceSummaryProfile;
}

export interface IYahooFinancePrice {
  currency: string;
  exchangeName: string;
  longName: string;
  marketState: string;
  quoteType: string;
  regularMarketPrice: number;
  shortName: string;
}

export interface IYahooFinanceSummaryProfile {
  industry?: string;
  sector?: string;
  website?: string;
}
