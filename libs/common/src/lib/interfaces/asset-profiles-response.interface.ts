import { AssetClass, AssetSubClass, DataSource } from '@prisma/client';

export interface AssetProfilesResponse {
  count: number;
  marketData: AssetProfileItem[];
}

export interface AssetProfileItem {
  activitiesCount: number;
  assetClass?: AssetClass;
  assetSubClass?: AssetSubClass;
  comment?: string | null;
  countriesCount: number;
  currency: string;
  dataSource: DataSource;
  date: Date;
  id: string;
  isin?: string | null;
  isActive: boolean;
  isBenchmark?: boolean;
  isUsedByUsersWithSubscription?: boolean;
  lastMarketPrice: number;
  marketDataItemCount: number;
  name: string;
  sectorsCount: number;
  symbol: string;
  watchedByCount: number;
}
