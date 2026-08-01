import { MarketData } from '@prisma/client';

import { EnhancedAssetProfile } from '../enhanced-asset-profile.interface';

export interface AssetProfileResponse {
  assetProfile: Partial<EnhancedAssetProfile>;
  marketData: MarketData[];
}
