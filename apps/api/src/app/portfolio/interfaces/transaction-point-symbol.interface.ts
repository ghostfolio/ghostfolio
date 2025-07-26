import { DataSource, Tag } from '@prisma/client';
import { Big } from 'big.js';

export interface TransactionPointSymbol {
  averagePrice: Big;
  currency: string;
  dataSource: DataSource;
  dividend: Big;
  fee: Big;
  firstBuyDate: string;
  includeInHoldings: boolean;
  investment: Big;
  quantity: Big;
  skipErrors: boolean;
  symbol: string;
  tags?: Tag[];
  transactionCount: number;
}
