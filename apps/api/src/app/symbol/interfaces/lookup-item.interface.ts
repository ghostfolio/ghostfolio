import { AssetClass, AssetSubClass, DataSource } from '@prisma/client';

export interface LookupItem {
  assetClass: AssetClass;
  assetSubClass: AssetSubClass;
  currency: string;
  dataSource: DataSource;
  name: string;
  symbol: string;
}
