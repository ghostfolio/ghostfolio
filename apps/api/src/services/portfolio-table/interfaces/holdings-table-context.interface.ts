import { AssetClass, AssetSubClass } from '@prisma/client';

import { DataSourceTableContext } from './data-source-table-context.interface';

export interface HoldingsTableContext extends DataSourceTableContext {
  assetClassTranslations: Record<AssetClass, string>;
  assetSubClassTranslations: Record<AssetSubClass, string>;
}
