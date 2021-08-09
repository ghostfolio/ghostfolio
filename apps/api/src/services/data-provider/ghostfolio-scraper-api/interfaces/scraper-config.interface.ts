import { Currency } from '@prisma/client';

export interface ScraperConfig {
  currency: Currency;
  selector: string;
  symbol: string;
  url: string;
}
