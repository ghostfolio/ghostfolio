import { Currency } from '@prisma/client';
import Big from 'big.js';

export interface TransactionPointSymbol {
  currency: Currency;
  firstBuyDate: string;
  investment: Big;
  quantity: Big;
  symbol: string;
  transactionCount: number;
}
