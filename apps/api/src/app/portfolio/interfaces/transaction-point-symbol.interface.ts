import { Currency } from '@prisma/client';
import Big from 'big.js';

export interface TransactionPointSymbol {
  currency: Currency;
  fee: Big;
  feeAccumulated: Big;
  firstBuyDate: string;
  investment: Big;
  quantity: Big;
  symbol: string;
  transactionCount: number;
}
