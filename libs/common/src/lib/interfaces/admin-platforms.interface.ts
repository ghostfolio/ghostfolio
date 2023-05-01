import { AssetClass, AssetSubClass, DataSource } from '@prisma/client';

export interface AdminPlatforms {
  platforms: AdminPlatformsItem[];
}

export interface AdminPlatformsItem {
  assetClass?: AssetClass;
  assetSubClass?: AssetSubClass;
  countriesCount: number;
  dataSource: DataSource;
  date?: Date;
  marketDataItemCount: number;
  sectorsCount: number;
  symbol: string;
}
