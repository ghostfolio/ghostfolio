import { PortfolioDetails } from '@ghostfolio/common/interfaces';
import { AssetClass } from '@ghostfolio/prisma/enums';

import {
  calculatePortfolioTargets,
  isValidPortfolioTarget
} from './portfolio-targets-calculator';

const allocations = {
  [AssetClass.ALTERNATIVE_INVESTMENT]: 0,
  [AssetClass.COMMODITY]: 0,
  [AssetClass.EQUITY]: 0.6,
  [AssetClass.FIXED_INCOME]: 0.4,
  [AssetClass.LIQUIDITY]: 0,
  [AssetClass.REAL_ESTATE]: 0
};

function makeDetails({
  cash = 0,
  equity = 0,
  bonds = 0
}: {
  cash?: number;
  equity?: number;
  bonds?: number;
}): Pick<PortfolioDetails, 'accounts' | 'holdings'> {
  const holdings = [
    ...(equity > 0
      ? [{ assetProfile: { assetClass: AssetClass.EQUITY }, valueInBaseCurrency: equity }]
      : []),
    ...(bonds > 0
      ? [{ assetProfile: { assetClass: AssetClass.FIXED_INCOME }, valueInBaseCurrency: bonds }]
      : [])
  ] as PortfolioDetails['holdings'];

  return {
    accounts: {
      example: {
        balance: cash,
        currency: 'EUR',
        name: 'Example',
        valueInBaseCurrency: cash + equity + bonds
      }
    },
    holdings
  };
}

describe('Portfolio targets calculator', () => {
  it('validates a complete 100% target and the tolerance', () => {
    expect(isValidPortfolioTarget(allocations, 0.05)).toBe(true);
    expect(isValidPortfolioTarget({ ...allocations, [AssetClass.EQUITY]: 0.5 }, 0.05)).toBe(false);
    expect(isValidPortfolioTarget(allocations, -0.01)).toBe(false);
  });

  it('reconciles account cash exactly once', () => {
    const result = calculatePortfolioTargets({
      details: makeDetails({ equity: 600, bonds: 300, cash: 100 }),
      targets: allocations,
      tolerance: 0.05
    });

    expect(result.status).toBe('ready');
    expect(result.totalValue).toBe(1000);
    expect(result.accountCashValue).toBe(100);
    expect(result.rows.find(({ assetClass }) => assetClass === AssetClass.LIQUIDITY)?.actual).toBeCloseTo(0.1);
    expect(result.rows.find(({ assetClass }) => assetClass === AssetClass.EQUITY)?.actual).toBeCloseTo(0.6);
    expect(result.outOfToleranceCount).toBe(2);
    expect(result.totalDrift).toBeCloseTo(0.1);
  });

  it('handles a cash-only account', () => {
    const result = calculatePortfolioTargets({
      details: makeDetails({ cash: 100 }),
      targets: allocations,
      tolerance: 0.05
    });
    expect(result.status).toBe('ready');
    expect(result.rows.find(({ assetClass }) => assetClass === AssetClass.LIQUIDITY)?.actual).toBe(1);
  });

  it('does not fabricate allocations if values are redacted', () => {
    const details = makeDetails({ equity: 100 });
    details.holdings[0].valueInBaseCurrency = undefined;
    expect(calculatePortfolioTargets({ details, targets: allocations, tolerance: 0.05 }).status)
      .toBe('unavailable');
  });

  it('rejects negative account-to-holdings residuals', () => {
    const details = makeDetails({ equity: 100 });
    details.accounts.example.valueInBaseCurrency = 50;
    expect(calculatePortfolioTargets({ details, targets: allocations, tolerance: 0.05 }).status)
      .toBe('inconsistent');
  });

  it('handles an empty portfolio', () => {
    expect(calculatePortfolioTargets({
      details: makeDetails({}),
      targets: allocations,
      tolerance: 0.05
    }).status).toBe('empty');
  });
});
