import { AssetClass, AssetSubClass, DataSource, Tag } from '@prisma/client';

import { Market, MarketAdvanced, MarketState } from '../types';
import { Country } from './country.interface';
import { Sector } from './sector.interface';

export interface PortfolioPosition {
  allocationInPercentage: number;
  assetClass?: AssetClass;
  assetClassLabel?: string;
  assetSubClass?: AssetSubClass | 'CASH';
  assetSubClassLabel?: string;
  countries: Country[];
  currency: string;
  dataSource: DataSource;
  dateOfFirstActivity: Date;
  dividend: number;
  exchange?: string;
  grossPerformance: number;
  grossPerformancePercent: number;
  grossPerformancePercentWithCurrencyEffect: number;
  grossPerformanceWithCurrencyEffect: number;
  investment: number;
  marketChange?: number;
  marketChangePercent?: number;
  marketPrice: number;
  markets?: { [key in Market]: number };
  marketsAdvanced?: { [key in MarketAdvanced]: number };
  marketState: MarketState;
  name: string;
  netPerformance: number;
  netPerformancePercent: number;
  netPerformancePercentWithCurrencyEffect: number;
  netPerformanceWithCurrencyEffect: number;
  quantity: number;
  sectors: Sector[];
  symbol: string;
  tags?: Tag[];
  transactionCount: number;
  type?: string;
  url?: string;
  valueInBaseCurrency?: number;
  valueInPercentage?: number;
}
