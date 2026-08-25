import { AssetClass, AssetSubClass, DataSource } from '@prisma/client';

import { DataProviderInfo } from './data-provider-info.interface';

export interface AssetProfileItem {
  activitiesCount: number;
  assetClass?: AssetClass;
  assetSubClass?: AssetSubClass;
  comment?: string;
  countriesCount: number;
  currency: string;
  dataProviderInfo?: DataProviderInfo;
  dataSource: DataSource;
  date: Date;
  id: string;
  isActive: boolean;
  isBenchmark?: boolean;
  isin?: string;
  isUsedByUsersWithSubscription?: boolean;
  lastMarketPrice: number;
  marketDataItemCount: number;
  name: string;
  sectorsCount: number;
  symbol: string;
  watchedByCount: number;
}
