import { AssetSubClass, DataSource, Tag } from '@prisma/client';
import { Big } from 'big.js';

export interface TransactionPointSymbol {
  activitiesCount: number;
  assetSubClass: AssetSubClass;
  averagePrice: Big;
  currency: string;
  dataSource: DataSource;
  dateOfFirstActivity: string;
  dividend: Big;
  fee: Big;
  feeInBaseCurrency: Big;
  includeInHoldings: boolean;
  investment: Big;
  quantity: Big;
  skipErrors: boolean;
  symbol: string;
  tags?: Tag[];

  /** @deprecated use activitiesCount instead */
  transactionCount: number;
}
