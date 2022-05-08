import { HistoricalDataItem } from '@ghostfolio/common/interfaces';
import { DataSource } from '@prisma/client';

export interface SymbolItem {
  currency: string;
  dataSource: DataSource;
  historicalData: HistoricalDataItem[];
  marketPrice: number;
}
