import { DataSource, Tag } from '@prisma/client';
import Big from 'big.js';

export interface TransactionPointSymbol {
  currency: string;
  dataSource: DataSource;
  fee: Big;
  firstBuyDate: string;
  investment: Big;
  quantity: Big;
  symbol: string;
  tags?: Tag[];
  transactionCount: number;
}
