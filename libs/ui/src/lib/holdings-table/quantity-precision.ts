import { PortfolioPosition } from '@ghostfolio/common/interfaces';

import { AssetSubClass } from '@prisma/client';

export function getHoldingQuantityPrecision(
  holding: Pick<PortfolioPosition, 'assetProfile' | 'quantity'>
): number {
  if (Number.isInteger(holding.quantity)) {
    return 0;
  }

  if (holding.assetProfile.assetSubClass === AssetSubClass.CRYPTOCURRENCY) {
    return 8;
  }

  return 2;
}
