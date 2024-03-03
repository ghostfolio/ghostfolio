import { MarketState } from '@ghostfolio/common/types';

import { AssetClass, AssetSubClass, DataSource } from '@prisma/client';

export interface Position {
  assetClass: AssetClass;
  assetSubClass: AssetSubClass;
  averagePrice: number;
  currency: string;
  dataSource: DataSource;
  firstBuyDate: string;
  grossPerformance?: number;
  grossPerformancePercentage?: number;
  investment: number;
  investmentInOriginalCurrency?: number;
  marketPrice?: number;
  marketState?: MarketState;
  name?: string;
  netPerformance?: number;
  netPerformancePercentage?: number;
  netPerformancePercentageWithCurrencyEffect?: number;
  netPerformanceWithCurrencyEffect?: number;
  quantity: number;
  symbol: string;
  transactionCount: number;
  url?: string;
}
