import type { Order } from '@ghostfolio/prisma/browser';

import type { EnhancedAssetProfile } from '../enhanced-asset-profile.interface';

export interface CreateActivityResponse extends Order {
  assetProfile: EnhancedAssetProfile;
}
