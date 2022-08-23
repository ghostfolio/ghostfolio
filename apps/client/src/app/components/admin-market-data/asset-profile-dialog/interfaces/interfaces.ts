import { DataSource } from '@prisma/client';

export interface AssetProfileDialogParams {
  dateOfFirstActivity: string;
  dataSource: DataSource;
  deviceType: string;
  locale: string;
  symbol: string;
}
