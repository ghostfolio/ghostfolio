import { AssetClass, AssetSubClass, DataSource } from '@prisma/client';

export interface AdminMarketData {
  count: number;
  marketData: AdminMarketDataItem[];
}

export interface AdminMarketDataItem {
  activitiesCount?: number;
  assetClass?: AssetClass;
  assetSubClass?: AssetSubClass;
  countriesCount: number;
  currency: string;
  dataSource: DataSource;
  date?: Date;
  id: string;
  isBenchmark?: boolean;
  marketDataItemCount: number;
  name: string;
  sectorsCount: number;
  symbol: string;
}
