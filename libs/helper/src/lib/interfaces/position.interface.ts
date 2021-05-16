import { Currency } from '@prisma/client';

export interface Position {
  averagePrice: number;
  currency: Currency;
  firstBuyDate: string;
  investment: number;
  investmentInOriginalCurrency?: number;
  marketPrice?: number;
  quantity: number;
  transactionCount: number;
}
