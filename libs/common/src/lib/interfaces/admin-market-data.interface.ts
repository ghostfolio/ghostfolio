import { DataSource } from '@prisma/client';

export interface AdminMarketData {
  marketData: AdminMarketDataItem[];
}

export interface AdminMarketDataItem {
  dataSource: DataSource;
  date?: Date;
  marketDataItemCount?: number;
  symbol: string;
}
