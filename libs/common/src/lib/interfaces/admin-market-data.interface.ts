import { AssetClass, AssetSubClass, DataSource, Tag } from '@prisma/client';

export interface AdminMarketData {
  count: number;
  marketData: AdminMarketDataItem[];
}

export interface AdminMarketDataItem {
  assetClass?: AssetClass;
  assetSubClass?: AssetSubClass;
  countriesCount: number;
  currency: string;
  dataSource: DataSource;
  date?: Date;
  marketDataItemCount: number;
  name: string;
  sectorsCount: number;
  symbol: string;
  tags: Tag[];
}
