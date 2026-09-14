import type {
  AssetClass,
  AssetSubClass,
  DataSource
} from '@ghostfolio/prisma/enums';

import { DataProviderInfo } from './data-provider-info.interface';

export interface LookupItem {
  assetClass: AssetClass;
  assetSubClass: AssetSubClass;
  currency: string;
  dataProviderInfo: DataProviderInfo;
  dataSource: DataSource | null;
  name: string;
  symbol: string;
}
