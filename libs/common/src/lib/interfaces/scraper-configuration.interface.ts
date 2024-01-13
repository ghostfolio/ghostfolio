export interface ScraperConfiguration {
  defaultMarketPrice?: number;
  headers?: { [key: string]: string };
  locale?: string;
  selector: string;
  url: string;
}
