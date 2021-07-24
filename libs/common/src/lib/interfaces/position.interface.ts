import {
  MarketState,
  Type
} from '@ghostfolio/api/services/interfaces/interfaces';
import { Currency } from '@prisma/client';

export interface Position {
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
  type?: Type;
  url?: string;
}
