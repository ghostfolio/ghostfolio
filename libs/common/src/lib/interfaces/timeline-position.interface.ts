import {
  MarketState,
  Type
} from '@ghostfolio/api/services/interfaces/interfaces';
import { Currency } from '@prisma/client';
import Big from 'big.js';

export interface TimelinePosition {
  averagePrice: Big;
  currency: Currency;
  firstBuyDate: string;
  marketState: MarketState;
  quantity: Big;
  symbol: string;
  investment: Big;
  grossPerformancePercentage: Big;
  grossPerformance: Big;
  marketPrice: number;
  transactionCount: number;
  name: string;
  url: string;
  type: Type;
}
