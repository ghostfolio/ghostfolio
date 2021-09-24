import { DataSource } from '@prisma/client';
import Big from 'big.js';

export interface TransactionPointSymbol {
  currency: string;
  dataSource: DataSource;
  fee: Big;
  firstBuyDate: string;
  investment: Big;
  quantity: Big;
  symbol: string;
  transactionCount: number;
}
