import { AssetClass } from '@ghostfolio/prisma/enums';

import { isValidPortfolioTarget } from './portfolio-targets-calculator';
import {
  createDefaultPortfolioTarget,
  PORTFOLIO_TARGET_PRESETS
} from './portfolio-targets-presets';

describe('Portfolio target presets', () => {
  it('provides five valid, editable starting points', () => {
    expect(PORTFOLIO_TARGET_PRESETS).toHaveLength(5);
    for (const { allocations } of PORTFOLIO_TARGET_PRESETS) {
      expect(isValidPortfolioTarget(allocations, 0.05)).toBe(true);
    }
  });

  it('keeps the original global default independent from the presets', () => {
    const target = createDefaultPortfolioTarget();
    target.allocations[AssetClass.EQUITY] = 0.1;

    expect(PORTFOLIO_TARGET_PRESETS[2].allocations[AssetClass.EQUITY]).toBe(
      0.6
    );
    expect(target.tolerance).toBe(0.05);
    expect(target.id).toBe('global');
  });

  it('represents Golden Butterfly at macro-class level', () => {
    const butterfly = PORTFOLIO_TARGET_PRESETS.find(
      ({ id }) => id === 'golden-butterfly'
    );

    expect(butterfly?.allocations[AssetClass.EQUITY]).toBe(0.4);
    expect(butterfly?.allocations[AssetClass.FIXED_INCOME]).toBe(0.4);
    expect(butterfly?.allocations[AssetClass.COMMODITY]).toBe(0.2);
  });
});
