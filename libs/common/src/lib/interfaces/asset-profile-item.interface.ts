import { AssetClass, AssetSubClass, DataSource } from '@prisma/client';

export interface AssetProfileItem {
  activitiesCount: number;
  assetClass?: AssetClass;
  assetSubClass?: AssetSubClass;
  comment?: string;
  countriesCount: number;
  currency: string;
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
