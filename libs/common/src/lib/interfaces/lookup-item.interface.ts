import {
  AssetClass,
  AssetSubClass,
  DataSource
} from '@ghostfolio/prisma/enums';

import { DataProviderInfo } from './data-provider-info.interface';

export interface LookupItem {
  assetClass?: AssetClass | null;
  assetSubClass?: AssetSubClass | null;
  currency: string;
  dataProviderInfo: DataProviderInfo;
  dataSource: DataSource | null;
  name?: string | null;
  symbol: string;
}
