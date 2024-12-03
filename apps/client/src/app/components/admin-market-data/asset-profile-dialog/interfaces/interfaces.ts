import { ColorScheme } from '@ghostfolio/common/types';

import { DataSource } from '@prisma/client';

export interface AssetProfileDialogParams {
  colorScheme: ColorScheme;
  dataSource: DataSource;
  deviceType: string;
  locale: string;
  symbol: string;
}
