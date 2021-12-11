import { DataSource } from '@prisma/client';

export interface MarketDataDetailDialogParams {
  dataSource: DataSource;
  date: Date;
  marketPrice: number;
  symbol: string;
}
