import { AssetClass, AssetSubClass, DataSource } from '@prisma/client';

export interface AdminMarketData {
  count: number;
  marketData: AdminMarketDataItem[];
}

export interface AdminMarketDataItem {
  assetClass?: AssetClass;
  assetSubClass?: AssetSubClass;
  countriesCount: number;
  dataSource: DataSource;
  date?: Date;
  marketDataItemCount: number;
  name: string;
  sectorsCount: number;
  symbol: string;
}
