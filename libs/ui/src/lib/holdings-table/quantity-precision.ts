import { AssetSubClass } from '@ghostfolio/prisma/enums';

import { HoldingsTableItem } from './interfaces/interfaces';

export function getHoldingQuantityPrecision({
  assetProfile,
  quantity
}: Pick<HoldingsTableItem, 'assetProfile' | 'quantity'>): number {
  if (quantity === undefined || Number.isInteger(quantity)) {
    return 0;
  }

  if (assetProfile.assetSubClass === AssetSubClass.CRYPTOCURRENCY) {
    return 8;
  }

  return 2;
}
