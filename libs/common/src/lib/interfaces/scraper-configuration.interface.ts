export interface ScraperConfiguration {
  defaultMarketPrice?: number;
  headers?: { [key: string]: string };
  locale?: string;
  mode?: 'instant' | 'lazy';
  selector: string;
  url: string;
}
