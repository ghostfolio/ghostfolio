import type { Prisma } from '@ghostfolio/prisma/client';

export interface AssetProfileToCreate {
  assetProfile: Prisma.SymbolProfileCreateInput;
  marketDataObjects: Prisma.MarketDataUpdateInput[];
}
