import type { AssetClass, AssetSubClass } from '@ghostfolio/prisma/enums';

import { DataSourceTableContext } from './data-source-table-context.interface';

export interface HoldingsTableContext extends DataSourceTableContext {
  assetClassTranslations: Record<AssetClass, string>;
  assetSubClassTranslations: Record<AssetSubClass, string>;
}
