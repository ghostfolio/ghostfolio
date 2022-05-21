import { DataSource } from '@prisma/client';

export interface PositionDetailDialogParams {
  baseCurrency: string;
  dataSource: DataSource;
  deviceType: string;
  hasImpersonationId: boolean;
  hasPermissionToReportDataGlitch: boolean;
  locale: string;
  symbol: string;
}
