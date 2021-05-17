import { DataSource } from '@prisma/client';

export interface LookupItem {
  dataSource: DataSource;
  name: string;
  symbol: string;
}
