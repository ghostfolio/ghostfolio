export interface ScraperConfiguration {
  defaultMarketPrice?: number;
  headers?: { [key: string]: string };
  locale?: string;
  postprocessor?: string;
  selector: string;
  url: string;
}
