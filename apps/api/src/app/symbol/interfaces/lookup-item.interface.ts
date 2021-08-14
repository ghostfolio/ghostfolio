import { Currency, DataSource } from '@prisma/client';

export interface LookupItem {
  currency: Currency;
  dataSource: DataSource;
  name: string;
  symbol: string;
}
