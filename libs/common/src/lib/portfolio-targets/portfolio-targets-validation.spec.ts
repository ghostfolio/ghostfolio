import { AssetClass } from '@ghostfolio/prisma/enums';

import { isValidPortfolioTargetsSettings } from './portfolio-targets-validation';

const allocations = {
  [AssetClass.ALTERNATIVE_INVESTMENT]: 0,
  [AssetClass.COMMODITY]: 0.2,
  [AssetClass.EQUITY]: 0.4,
  [AssetClass.FIXED_INCOME]: 0.4,
  [AssetClass.LIQUIDITY]: 0,
  [AssetClass.REAL_ESTATE]: 0
};

const validSettings = {
  version: 1,
  activeProfileId: 'global',
  profiles: [
    {
      id: 'global',
      name: 'Golden Butterfly (simplified)',
      allocations,
      tolerance: 0.05
    }
  ]
};

describe('Portfolio targets settings validation', () => {
  it('accepts a single complete allocation', () => {
    expect(isValidPortfolioTargetsSettings(validSettings)).toBe(true);
  });

  it('rejects multiple profiles in v1', () => {
    expect(
      isValidPortfolioTargetsSettings({
        ...validSettings,
        profiles: [...validSettings.profiles, ...validSettings.profiles]
      })
    ).toBe(false);
  });

  it('rejects non-100-percent allocations', () => {
    expect(
      isValidPortfolioTargetsSettings({
        ...validSettings,
        profiles: [
          {
            ...validSettings.profiles[0],
            allocations: { ...allocations, [AssetClass.EQUITY]: 0.3 }
          }
        ]
      })
    ).toBe(false);
  });

  it('rejects invalid tolerances', () => {
    expect(
      isValidPortfolioTargetsSettings({
        ...validSettings,
        profiles: [{ ...validSettings.profiles[0], tolerance: -0.1 }]
      })
    ).toBe(false);
  });

  it('rejects a mismatched active profile', () => {
    expect(
      isValidPortfolioTargetsSettings({
        ...validSettings,
        activeProfileId: 'other'
      })
    ).toBe(false);
  });

  it('rejects unknown allocation keys', () => {
    expect(
      isValidPortfolioTargetsSettings({
        ...validSettings,
        profiles: [
          {
            ...validSettings.profiles[0],
            allocations: { ...allocations, UNKNOWN: 0 }
          }
        ]
      })
    ).toBe(false);
  });
});
