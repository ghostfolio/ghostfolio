import { PortfolioTargetProfile } from '@ghostfolio/common/interfaces';
import { PORTFOLIO_TARGET_PRESETS } from '@ghostfolio/common/portfolio-targets/portfolio-targets-presets';

/** The user-visible presets share the same source as the default model. */
export const TARGET_PRESETS = PORTFOLIO_TARGET_PRESETS.map(({ id, name }) => ({
  id,
  label: name
}));

export function createTargetFromPreset(presetId: string): PortfolioTargetProfile {
  const preset =
    PORTFOLIO_TARGET_PRESETS.find(({ id }) => id === presetId) ??
    PORTFOLIO_TARGET_PRESETS[2];

  return {
    id: 'global',
    name: preset.name,
    presetId: preset.id,
    tolerance: 0.05,
    allocations: { ...preset.allocations }
  };
}
