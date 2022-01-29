import { MarketState } from '@ghostfolio/api/services/interfaces/interfaces';
import { AssetClass, AssetSubClass, DataSource } from '@prisma/client';

import { Country } from './country.interface';
import { Sector } from './sector.interface';

export interface PortfolioPosition {
  allocationCurrent: number;
  allocationInvestment: number;
  assetClass?: AssetClass;
  assetSubClass?: AssetSubClass | 'CASH';
  countries: Country[];
  currency: string;
  dataSource: DataSource;
  exchange?: string;
  grossPerformance: number;
  grossPerformancePercent: number;
  investment: number;
  marketChange?: number;
  marketChangePercent?: number;
  marketPrice: number;
  marketState: MarketState;
  name: string;
  netPerformance: number;
  netPerformancePercent: number;
  quantity: number;
  sectors: Sector[];
  transactionCount: number;
  symbol: string;
  type?: string;
  url?: string;
  value: number;
}
