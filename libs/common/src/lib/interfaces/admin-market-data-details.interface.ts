import { MarketData } from '@prisma/client';

import { EnhancedSymbolProfile } from './enhanced-symbol-profile.interface';

export interface AdminMarketDataDetails {
  assetProfile: Partial<EnhancedSymbolProfile>;
  marketData: MarketData[];
}
