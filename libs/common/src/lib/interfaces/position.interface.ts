import { MarketState } from '@ghostfolio/api/services/interfaces/interfaces';
import { AssetClass, Currency } from '@prisma/client';

export interface Position {
  assetClass: AssetClass;
  averagePrice: number;
  currency: Currency;
  firstBuyDate: string;
  grossPerformance?: number;
  grossPerformancePercentage?: number;
  investment: number;
  investmentInOriginalCurrency?: number;
  marketPrice?: number;
  marketState?: MarketState;
  name?: string;
  quantity: number;
  symbol: string;
  transactionCount: number;
  url?: string;
}
