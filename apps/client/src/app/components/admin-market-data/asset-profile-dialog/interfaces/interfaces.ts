import { DataSource } from '@prisma/client';

export interface AssetProfileDialogParams {
  dataSource: DataSource;
  deviceType: string;
  locale: string;
  symbol: string;
}
