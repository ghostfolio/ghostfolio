import { PortfolioTargetProfile } from '@ghostfolio/common/interfaces';
import { AssetClass } from '@ghostfolio/prisma/enums';

export const TARGET_PRESETS = [
  { id: 'cautious', label: $localize`Cautious (20/80)`, equity: 20, bonds: 80, commodities: 0 },
  { id: 'conservative', label: $localize`Conservative (40/60)`, equity: 40, bonds: 60, commodities: 0 },
  { id: 'moderate', label: $localize`Moderate (60/40)`, equity: 60, bonds: 40, commodities: 0 },
  { id: 'aggressive', label: $localize`Aggressive (80/20)`, equity: 80, bonds: 20, commodities: 0 },
  { id: 'golden-butterfly', label: $localize`Golden Butterfly (simplified)`, equity: 40, bonds: 40, commodities: 20 }
] as const;

export function createTargetFromPreset(presetId: string): PortfolioTargetProfile {
  const preset = TARGET_PRESETS.find(({ id }) => id === presetId) ?? TARGET_PRESETS[2];

  return {
    id: 'global',
    name: preset.label,
    presetId: preset.id,
    tolerance: 0.05,
    allocations: {
      [AssetClass.ALTERNATIVE_INVESTMENT]: 0,
      [AssetClass.COMMODITY]: preset.commodities / 100,
      [AssetClass.EQUITY]: preset.equity / 100,
      [AssetClass.FIXED_INCOME]: preset.bonds / 100,
      [AssetClass.LIQUIDITY]: 0,
      [AssetClass.REAL_ESTATE]: 0
    }
  };
}
