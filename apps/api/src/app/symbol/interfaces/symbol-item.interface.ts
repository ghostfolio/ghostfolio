import { DataSource } from '@prisma/client';

export interface SymbolItem {
  currency: string;
  dataSource: DataSource;
  marketPrice: number;
}
