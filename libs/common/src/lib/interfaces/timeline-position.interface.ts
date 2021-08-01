import { Currency } from '@prisma/client';
import Big from 'big.js';

export interface TimelinePosition {
  averagePrice: Big;
  currency: Currency;
  firstBuyDate: string;
  grossPerformance: Big;
  grossPerformancePercentage: Big;
  investment: Big;
  marketPrice: number;
  quantity: Big;
  symbol: string;
  transactionCount: number;
}
