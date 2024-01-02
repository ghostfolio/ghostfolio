export interface ScraperConfiguration {
  defaultMarketPrice?: number;
  headers?: { [key: string]: string };
  selector: string;
  url: string;
}
