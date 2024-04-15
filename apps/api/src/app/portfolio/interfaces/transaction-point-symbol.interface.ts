import { DataSource, Tag } from '@prisma/client';
import { Big } from 'big.js';

export interface TransactionPointSymbol {
  averagePrice: Big;
  currency: string;
  dataSource: DataSource;
  dividend: Big;
  fee: Big;
  firstBuyDate: string;
  investment: Big;
  quantity: Big;
  symbol: string;
  tags?: Tag[];
  transactionCount: number;
}
