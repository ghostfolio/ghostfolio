import { Currency } from '.prisma/client';

export interface ScraperConfig {
  currency: Currency;
  name: string;
  selector: string;
  symbol: string;
  url: string;
}
