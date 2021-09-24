import { DataSource } from '@prisma/client';

export interface LookupItem {
  currency: string;
  dataSource: DataSource;
  name: string;
  symbol: string;
}
