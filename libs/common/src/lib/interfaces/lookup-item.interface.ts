import { AssetClass, AssetSubClass, DataSource } from '@prisma/client';

import { DataProviderInfo } from './data-provider-info.interface';

export interface LookupItem {
  assetClass: AssetClass;
  assetSubClass: AssetSubClass;
  currency: string;
  dataProviderInfo: DataProviderInfo;
  dataSource: DataSource;
  name: string;
  symbol: string;
}
