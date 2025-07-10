import { ColorScheme } from '@ghostfolio/common/types';

import { AssetSubClass, DataSource } from '@prisma/client';

export interface AssetProfileDialogParams {
  colorScheme: ColorScheme;
  dataSource: DataSource;
  deviceType: string;
  locale: string;
  symbol: string;
}

export interface SelectOptionValue {
  id: AssetSubClass;
  label: string;
}
