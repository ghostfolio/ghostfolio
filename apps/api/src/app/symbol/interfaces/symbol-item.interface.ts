import { HistoricalDataItem } from '@ghostfolio/api/app/portfolio/interfaces/portfolio-position-detail.interface';
import { DataSource } from '@prisma/client';

export interface SymbolItem {
  currency: string;
  dataSource: DataSource;
  historicalData: HistoricalDataItem[];
  marketPrice: number;
}
