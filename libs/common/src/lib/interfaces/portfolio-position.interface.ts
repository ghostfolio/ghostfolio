import { Market, MarketAdvanced } from '@ghostfolio/common/types';

import { AssetClass, AssetSubClass, DataSource, Tag } from '@prisma/client';

import { Country } from './country.interface';
import { Holding } from './holding.interface';
import { Sector } from './sector.interface';

export interface PortfolioPosition {
  allocationInPercentage: number;
  assetClass?: AssetClass;
  assetClassLabel?: string;
  assetSubClass?: AssetSubClass;
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
  holdings: Holding[];
  investment: number;
  marketChange?: number;
  marketChangePercent?: number;
  marketPrice: number;
  markets?: { [key in Market]: number };
  marketsAdvanced?: { [key in MarketAdvanced]: number };
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
