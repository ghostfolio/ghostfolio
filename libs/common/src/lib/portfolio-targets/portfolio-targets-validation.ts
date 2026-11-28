import { PortfolioTargetsSettings } from '@ghostfolio/common/interfaces/portfolio-targets.interface';
import { AssetClass } from '@ghostfolio/prisma/enums';

const assetClasses = Object.values(AssetClass);

export function isValidPortfolioTargetsSettings(
  value: unknown
): value is PortfolioTargetsSettings {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const settings = value as Partial<PortfolioTargetsSettings>;

  if (
    settings.version !== 1 ||
    typeof settings.activeProfileId !== 'string' ||
    !Array.isArray(settings.profiles) ||
    // Only one global target is supported in the first release.
    settings.profiles.length !== 1
  ) {
    return false;
  }

  const profile = settings.profiles[0];

  if (
    !profile ||
    typeof profile.id !== 'string' ||
    profile.id.length === 0 ||
    profile.id.length > 100 ||
    profile.id !== settings.activeProfileId ||
    typeof profile.name !== 'string' ||
    profile.name.trim().length === 0 ||
    profile.name.length > 100 ||
    (profile.presetId !== undefined &&
      (typeof profile.presetId !== 'string' ||
        profile.presetId.length > 100)) ||
    typeof profile.tolerance !== 'number' ||
    !Number.isFinite(profile.tolerance) ||
    profile.tolerance < 0 ||
    profile.tolerance > 1 ||
    !profile.allocations ||
    typeof profile.allocations !== 'object' ||
    Array.isArray(profile.allocations)
  ) {
    return false;
  }

  const keys = Object.keys(profile.allocations);
  if (
    keys.length !== assetClasses.length ||
    keys.some((key) => !assetClasses.includes(key as AssetClass))
  ) {
    return false;
  }

  const weights = assetClasses.map(
    (assetClass) => profile.allocations[assetClass]
  );

  return (
    weights.every(
      (weight) =>
        typeof weight === 'number' &&
        Number.isFinite(weight) &&
        weight >= 0 &&
        weight <= 1
    ) && Math.abs(weights.reduce((sum, weight) => sum + weight, 0) - 1) < 1e-8
  );
}
