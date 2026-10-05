import type { Prisma } from '@prisma/client';

export interface AssetProfileToCreate {
  assetProfile: Prisma.SymbolProfileCreateInput;
  marketDataObjects: Prisma.MarketDataUpdateInput[];
}
