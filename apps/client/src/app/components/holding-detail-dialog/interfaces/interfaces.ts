import { ColorScheme } from '@ghostfolio/common/types';

import { DataSource } from '@prisma/client';

export interface HoldingDetailDialogParams {
  baseCurrency: string;
  colorScheme: ColorScheme;
  dataSource: DataSource;
  deviceType: string;
  hasPermissionToAccessAdminControl: boolean;
  hasPermissionToCreateActivity: boolean;
  hasPermissionToReportDataGlitch: boolean;
  hasPermissionToUpdateActivity: boolean;
  impersonationId: string | null;
  locale: string;
  symbol: string;
}

export interface HoldingDetailDialogResult {
  isNavigating?: boolean;
}
