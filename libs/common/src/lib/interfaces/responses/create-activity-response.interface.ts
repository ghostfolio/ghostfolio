import type { Order } from '@ghostfolio/prisma/browser';

import { EnhancedAssetProfile } from '../enhanced-asset-profile.interface';

export interface CreateActivityResponse extends Omit<
  Order,
  'accountBalanceChange'
> {
  assetProfile: EnhancedAssetProfile;
}
