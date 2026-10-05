import type { AssetClass, AssetSubClass } from '@prisma/client';

import type { DataSourceTableContext } from './data-source-table-context.interface';

export interface HoldingsTableContext extends DataSourceTableContext {
  assetClassTranslations: Record<AssetClass, string>;
  assetSubClassTranslations: Record<AssetSubClass, string>;
}
