import { User } from '@ghostfolio/common/interfaces';
import { DataSource } from '@prisma/client';

export interface MarketDataDetailDialogParams {
  dataSource: DataSource;
  date: Date;
  marketPrice: number;
  symbol: string;
  user: User;
}
