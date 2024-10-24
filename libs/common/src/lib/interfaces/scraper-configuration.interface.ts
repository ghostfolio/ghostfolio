export interface ScraperConfiguration {
  defaultMarketPrice?: number;
  headers?: Record<string, string>;
  locale?: string;
  mode?: 'instant' | 'lazy';
  selector: string;
  url: string;
}
