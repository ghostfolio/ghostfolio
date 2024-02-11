import { DataProviderInfo } from '@ghostfolio/common/interfaces';

import { AssetClass, AssetSubClass, DataSource } from '@prisma/client';

export interface LookupItem {
  assetClass: AssetClass;
  assetSubClass: AssetSubClass;
  currency: string;
  dataProviderInfo: DataProviderInfo;
  dataSource: DataSource;
  name: string;
  symbol: string;
}
