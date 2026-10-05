import type { AssetSubClass, DataSource, Tag } from '@prisma/client';
import type { Big } from 'big.js';

export interface HoldingBalance {
  activitiesCount: number;
  assetSubClass: AssetSubClass;
  averagePrice: Big;
  currency: string;
  dataSource: DataSource;
  dateOfFirstActivity: string;
  fee: Big;
  feeInBaseCurrency: Big;
  includeInHoldings: boolean;
  investment: Big;
  quantity: Big;
  skipErrors: boolean;
  symbol: string;
  tags?: Tag[];
}
