import { AssetClass } from '@ghostfolio/prisma/enums';

/**
 * The first release uses a single global profile. The collection supports
 * future account-specific profiles without changing the persisted shape.
 */
export interface PortfolioTargetProfile {
  id: string;
  name: string;
  presetId?: string;
  /** Fractions in [0, 1]; the complete allocation must sum to 1. */
  allocations: Record<AssetClass, number>;
  /** Maximum absolute drift per asset class, as a fraction (0.05 = 5%). */
  tolerance: number;
}

export interface PortfolioTargetsSettings {
  version: 1;
  activeProfileId: string;
  profiles: PortfolioTargetProfile[];
}
