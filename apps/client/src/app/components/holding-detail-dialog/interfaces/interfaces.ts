import { ColorScheme } from '@ghostfolio/common/types';

import { DataSource } from '@prisma/client';

export interface HoldingDetailDialogParams {
  baseCurrency: string;
  colorScheme: ColorScheme;
  dataSource: DataSource;
  deviceType: string;
  hasImpersonationId: boolean;
  hasPermissionToAccessAdminControl: boolean;
  hasPermissionToCreateOrder: boolean;
  hasPermissionToReportDataGlitch: boolean;
  hasPermissionToUpdateOrder: boolean;
  locale: string;
  symbol: string;
}
