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
  country?: string;
  industry?: string;
  sector?: string;
  website?: string;
}
