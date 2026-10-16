import type { AssetProfileSplit, MarketData } from '@ghostfolio/prisma/browser';

import { EnhancedAssetProfile } from '../enhanced-asset-profile.interface';

export interface AssetProfileResponse {
  assetProfile: Partial<EnhancedAssetProfile>;
  marketData: MarketData[];
  splits: AssetProfileSplit[];
}
