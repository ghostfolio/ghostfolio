import { ColorScheme } from '@ghostfolio/common/types';

import { DataSource } from '@prisma/client';

export interface HoldingDetailDialogParams {
  baseCurrency: string;
  colorScheme: ColorScheme;
  dataSource: DataSource;
  deviceType: string;
  hasImpersonationId: boolean;
  hasPermissionToReportDataGlitch: boolean;
  locale: string;
  symbol: string;
}
