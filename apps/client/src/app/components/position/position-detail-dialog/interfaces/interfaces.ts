import { DataSource } from '@prisma/client';

export interface PositionDetailDialogParams {
  baseCurrency: string;
  dataSource: DataSource;
  deviceType: string;
  locale: string;
  symbol: string;
}
