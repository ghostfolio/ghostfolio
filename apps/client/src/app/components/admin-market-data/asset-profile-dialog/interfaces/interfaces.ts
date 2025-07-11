import { ColorScheme } from '@ghostfolio/common/types';

import { AssetClass, AssetSubClass, DataSource } from '@prisma/client';

export interface AssetClassSelectOption {
  id: AssetClass | AssetSubClass;
  label: string;
}

export interface AssetProfileDialogParams {
  colorScheme: ColorScheme;
  dataSource: DataSource;
  deviceType: string;
  locale: string;
  symbol: string;
}
