import { Currency, DataSource } from '@prisma/client';

export interface SymbolItem {
  currency: Currency;
  dataSource: DataSource;
  marketPrice: number;
}
