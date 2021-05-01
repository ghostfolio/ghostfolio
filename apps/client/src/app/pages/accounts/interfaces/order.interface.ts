import { Currency, DataSource } from '@prisma/client';

export interface Order {
  accountId: string;
  currency: Currency;
  dataSource: DataSource;
  date: Date;
  fee: number;
  id: string;
  quantity: number;
  platformId: string;
  symbol: string;
  type: string;
  unitPrice: number;
}
