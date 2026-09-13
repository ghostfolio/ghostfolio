import type { AssetClass, AssetSubClass } from '@ghostfolio/prisma/enums';

export interface AssetClassSelectorOption {
  id: AssetClass | AssetSubClass;
  label: string;
}
