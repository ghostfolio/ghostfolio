import { AssetClass, AssetSubClass } from '@prisma/client';

export interface AssetClassSelectorOption {
  id: AssetClass | AssetSubClass;
  label: string;
}
