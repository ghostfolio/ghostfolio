import { PortfolioTargetProfile } from '@ghostfolio/common/interfaces';
import { AssetClass } from '@ghostfolio/prisma/enums';

export interface PortfolioTargetPreset {
  id: string;
  name: string;
  allocations: Record<AssetClass, number>;
}

function makePreset(
  id: string,
  name: string,
  equity: number,
  fixedIncome: number,
  commodity = 0
): PortfolioTargetPreset {
  return {
    id,
    name,
    allocations: {
      [AssetClass.ALTERNATIVE_INVESTMENT]: 0,
      [AssetClass.COMMODITY]: commodity,
      [AssetClass.EQUITY]: equity,
      [AssetClass.FIXED_INCOME]: fixedIncome,
      [AssetClass.LIQUIDITY]: 0,
      [AssetClass.REAL_ESTATE]: 0
    }
  };
}

/** Editable starting points, not investment recommendations. */
export const PORTFOLIO_TARGET_PRESETS: PortfolioTargetPreset[] = [
  makePreset('conservative-20-80', $localize`Conservative (20/80)`, 0.2, 0.8),
  makePreset('cautious-40-60', $localize`Cautious (40/60)`, 0.4, 0.6),
  makePreset('moderate-60-40', $localize`Moderate (60/40)`, 0.6, 0.4),
  makePreset('aggressive-80-20', $localize`Aggressive (80/20)`, 0.8, 0.2),
  makePreset('golden-butterfly', 'Golden Butterfly', 0.4, 0.4, 0.2)
];

export function createDefaultPortfolioTarget(): PortfolioTargetProfile {
  const preset = PORTFOLIO_TARGET_PRESETS[2];

  return {
    id: 'global',
    name: preset.name,
    presetId: preset.id,
    allocations: { ...preset.allocations },
    tolerance: 0.05
  };
}
