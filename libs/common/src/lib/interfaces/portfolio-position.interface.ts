import { MarketState } from '@ghostfolio/api/services/interfaces/interfaces';
import { AssetClass, Currency } from '@prisma/client';

import { Country } from './country.interface';
import { Sector } from './sector.interface';

export interface PortfolioPosition {
  accounts: {
    [name: string]: { current: number; original: number };
  };
  allocationCurrent: number;
  allocationInvestment: number;
  assetClass?: AssetClass;
  countries: Country[];
  currency: Currency;
  exchange?: string;
  grossPerformance: number;
  grossPerformancePercent: number;
  investment: number;
  marketChange?: number;
  marketChangePercent?: number;
  marketPrice: number;
  marketState: MarketState;
  name: string;
  quantity: number;
  sectors: Sector[];
  transactionCount: number;
  symbol: string;
  type?: string;
  url?: string;
  value: number;
}
