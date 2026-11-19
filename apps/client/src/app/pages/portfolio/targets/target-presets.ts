import { PortfolioTargetProfile } from '@ghostfolio/common/interfaces';
import { PORTFOLIO_TARGET_PRESETS } from '@ghostfolio/common/portfolio-targets/portfolio-targets-presets';

/** The user-visible presets share the same source as the default model. */
export const TARGET_PRESETS = PORTFOLIO_TARGET_PRESETS.map(({ id }) => ({
  id,
  label:
    id === 'cautious-20-80'
      ? $localize`Cautious (20/80)`
      : id === 'conservative-40-60'
        ? $localize`Conservative (40/60)`
        : id === 'moderate-60-40'
          ? $localize`Moderate (60/40)`
          : id === 'aggressive-80-20'
            ? $localize`Aggressive (80/20)`
            : $localize`Golden Butterfly (simplified)`
}));

export function createTargetFromPreset(
  presetId: string
): PortfolioTargetProfile {
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

/** Preset and generated labels follow the UI language; personal names stay intact. */
export function getTargetProfileName(profile: PortfolioTargetProfile): string {
  const preset = TARGET_PRESETS.find(({ id }) => id === profile.presetId);
  if (preset) {
    return preset.label;
  }

  return !profile.presetId && profile.name === 'Custom'
    ? $localize`Custom`
    : profile.name;
}
