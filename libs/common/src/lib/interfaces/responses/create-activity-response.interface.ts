import type { Order, SymbolProfile } from '@ghostfolio/prisma/browser';

import type { EnhancedAssetProfile } from '../enhanced-asset-profile.interface';

export interface CreateActivityResponse extends Order {
  assetProfile: EnhancedAssetProfile;

  /**
   * @deprecated Use `assetProfile` instead
   */
  SymbolProfile: SymbolProfile;
}
