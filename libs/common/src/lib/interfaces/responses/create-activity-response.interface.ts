import type { Order, SymbolProfile } from '@ghostfolio/prisma/browser';

import { EnhancedAssetProfile } from '../enhanced-asset-profile.interface';

export interface CreateActivityResponse extends Omit<
  Order,
  'accountBalanceChange'
> {
  assetProfile: EnhancedAssetProfile;

  /**
   * @deprecated Use `assetProfile` instead
   */
  SymbolProfile: SymbolProfile;
}
