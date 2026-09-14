import { ColorScheme } from '@ghostfolio/common/types';
import type { DataSource } from '@ghostfolio/prisma/enums';

export interface AssetProfileDialogParams {
  colorScheme: ColorScheme;
  dataSource: DataSource;
  deviceType: string;
  locale: string;
  symbol: string;
}
