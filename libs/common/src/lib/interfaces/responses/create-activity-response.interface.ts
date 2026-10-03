import type { Order, SymbolProfile } from '@ghostfolio/prisma/browser';

import { EnhancedAssetProfile } from '../enhanced-asset-profile.interface';

export interface CreateActivityResponse extends Order {
  assetProfile: EnhancedAssetProfile;

  /* @deprecated */
  SymbolProfile: SymbolProfile;
}
