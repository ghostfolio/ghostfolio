import { MarketData } from '@prisma/client';

import { EnhancedAssetProfile } from './enhanced-asset-profile.interface';

export interface AdminMarketDataDetails {
  assetProfile: Partial<EnhancedAssetProfile>;
  marketData: MarketData[];
}
