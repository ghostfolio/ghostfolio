import { AssetClass, AssetSubClass } from '@prisma/client';

export interface HoldingsTableContext {
  assetClassTranslations: Record<AssetClass, string>;
  assetSubClassTranslations: Record<AssetSubClass, string>;
}
