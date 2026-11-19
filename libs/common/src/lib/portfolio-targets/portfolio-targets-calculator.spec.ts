import { PortfolioDetails } from '@ghostfolio/common/interfaces';
import { AssetClass, AssetSubClass } from '@ghostfolio/prisma/enums';

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
}): Pick<PortfolioDetails, 'accounts' | 'holdings' | 'summary'> {
  const holdings = [
    ...(equity !== 0
      ? [
          {
            assetProfile: { assetClass: AssetClass.EQUITY },
            valueInBaseCurrency: equity
          }
        ]
      : []),
    ...(bonds !== 0
      ? [
          {
            assetProfile: { assetClass: AssetClass.FIXED_INCOME },
            valueInBaseCurrency: bonds
          }
        ]
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
    holdings,
    summary: {
      accountCashInBaseCurrency: cash,
      cash,
      emergencyFund: { cash: 0 },
      filteredValueInBaseCurrency: equity + bonds,
      liabilitiesInBaseCurrency: 0
    } as PortfolioDetails['summary']
  };
}

describe('Portfolio targets calculator', () => {
  it('validates a complete 100% target and the tolerance', () => {
    expect(isValidPortfolioTarget(allocations, 0.05)).toBe(true);
    expect(
      isValidPortfolioTarget({ ...allocations, [AssetClass.EQUITY]: 0.5 }, 0.05)
    ).toBe(false);
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
    expect(
      result.rows.find(({ assetClass }) => assetClass === AssetClass.LIQUIDITY)
        ?.actual
    ).toBeCloseTo(0.1);
    expect(
      result.rows.find(({ assetClass }) => assetClass === AssetClass.EQUITY)
        ?.actual
    ).toBeCloseTo(0.6);
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
    expect(
      result.rows.find(({ assetClass }) => assetClass === AssetClass.LIQUIDITY)
        ?.actual
    ).toBe(1);
  });

  it('does not fabricate allocations if values are redacted', () => {
    const details = makeDetails({ equity: 100 });
    details.holdings[0].valueInBaseCurrency = undefined;
    expect(
      calculatePortfolioTargets({
        details,
        targets: allocations,
        tolerance: 0.05
      }).status
    ).toBe('unavailable');
  });

  it('rejects negative account-to-holdings residuals', () => {
    const details = makeDetails({ equity: 100 });
    details.accounts.example.valueInBaseCurrency = 50;
    expect(
      calculatePortfolioTargets({
        details,
        targets: allocations,
        tolerance: 0.05
      }).status
    ).toBe('inconsistent');
  });

  it('handles an empty portfolio', () => {
    expect(
      calculatePortfolioTargets({
        details: makeDetails({}),
        targets: allocations,
        tolerance: 0.05
      }).status
    ).toBe('empty');
  });
  it('does not misclassify an omitted snapshot position as cash', () => {
    const details = makeDetails({ equity: 100, cash: 25 });
    details.holdings = [];
    const result = calculatePortfolioTargets({
      details,
      targets: allocations,
      tolerance: 0.05
    });
    expect(result.status).toBe('inconsistent');
    expect(result.rows).toEqual([]);
  });

  it('requires independently verifiable cash and a snapshot total', () => {
    const details = makeDetails({ equity: 100 });
    delete details.summary;
    expect(
      calculatePortfolioTargets({
        details,
        targets: allocations,
        tolerance: 0.05
      }).status
    ).toBe('unavailable');
  });

  it.each([-100, -0.0000000001])(
    'reports negative cash %s as unsupported, not inconsistent',
    (cash) => {
      const result = calculatePortfolioTargets({
        details: makeDetails({ equity: 200, cash }),
        targets: allocations,
        tolerance: 0.05
      });
      expect(result.status).toBe('unsupported');
      expect(result.rows).toEqual([]);
    }
  );

  it('does not hide a negative account balance with another account balance', () => {
    const details = makeDetails({ equity: 200, cash: 100 });
    details.accounts.example.balance = -10;
    details.accounts.other = {
      balance: 110,
      currency: 'EUR',
      name: 'Other',
      valueInBaseCurrency: 110
    };
    details.accounts.example.valueInBaseCurrency = 190;
    expect(
      calculatePortfolioTargets({
        details,
        targets: allocations,
        tolerance: 0.05
      }).status
    ).toBe('unsupported');
  });

  it('reports short holdings and liabilities as unsupported', () => {
    const details = makeDetails({ equity: -100, cash: 200 });
    expect(
      calculatePortfolioTargets({
        details,
        targets: allocations,
        tolerance: 0.05
      }).status
    ).toBe('unsupported');
    const liabilityDetails = makeDetails({ equity: 100 });
    liabilityDetails.summary.liabilitiesInBaseCurrency = 10;
    expect(
      calculatePortfolioTargets({
        details: liabilityDetails,
        targets: allocations,
        tolerance: 0.05
      }).status
    ).toBe('unsupported');
  });

  it('reconciles securities-only portfolios including positions without an account', () => {
    const details = makeDetails({ equity: 600, bonds: 400 });
    details.accounts = {
      UNKNOWN: { ...details.accounts.example, currency: undefined }
    };
    const result = calculatePortfolioTargets({
      details,
      targets: allocations,
      tolerance: 0.05
    });
    expect(result.status).toBe('ready');
    expect(result.accountCashValue).toBe(0);
    expect(result.unclassifiedValue).toBe(0);
    expect(result.totalDrift).toBe(0);
  });

  it('uses converted base-currency amounts rather than summing native balances', () => {
    const details = makeDetails({ equity: 600, bonds: 300, cash: 100 });
    details.accounts = {
      euro: {
        balance: 20,
        currency: 'EUR',
        name: 'Euro',
        valueInBaseCurrency: 620
      },
      dollar: {
        balance: 100,
        currency: 'USD',
        name: 'Dollar',
        valueInBaseCurrency: 380
      }
    };
    const result = calculatePortfolioTargets({
      details,
      targets: allocations,
      tolerance: 0.05
    });
    expect(result.status).toBe('ready');
    expect(result.accountCashValue).toBe(100);
    expect(result.totalValue).toBe(1000);
  });

  it('preserves cash reserved for an emergency fund', () => {
    const details = makeDetails({ cash: 100 });
    details.summary.cash = 40;
    details.summary.emergencyFund.cash = 60;
    expect(
      calculatePortfolioTargets({
        details,
        targets: allocations,
        tolerance: 0.05
      }).accountCashValue
    ).toBe(100);
  });

  it('shows unclassified holdings separately and applies the same tolerance', () => {
    const details = makeDetails({ equity: 95, cash: 5 });
    details.holdings[0].assetProfile.assetClass = undefined;
    const result = calculatePortfolioTargets({
      details,
      targets: allocations,
      tolerance: 1
    });
    expect(result.status).toBe('ready');
    expect(result.unclassifiedValue).toBe(95);
    expect(
      result.rows.find(({ assetClass }) => assetClass === 'UNKNOWN')?.actual
    ).toBe(0.95);
    expect(result.outOfToleranceCount).toBe(0);
    expect(
      result.rows.reduce((sum, { actual }) => sum + actual, 0)
    ).toBeCloseTo(1);
    expect(result.totalDrift).toBeCloseTo(1);
  });

  it('permits only floating-point summation noise without normalizing values', () => {
    const details = makeDetails({ equity: 0.1, bonds: 0.2 });
    details.accounts.example.valueInBaseCurrency = 0.3;
    const result = calculatePortfolioTargets({
      details,
      targets: allocations,
      tolerance: 0.05
    });
    expect(result.status).toBe('ready');
    expect(result.accountCashValue).toBe(0);
    details.accounts.example.valueInBaseCurrency -= 1e-10;
    expect(
      calculatePortfolioTargets({
        details,
        targets: allocations,
        tolerance: 0.05
      }).status
    ).toBe('inconsistent');
  });

  it('does not treat a small but nonzero portfolio as empty', () => {
    expect(
      calculatePortfolioTargets({
        details: makeDetails({ cash: 1e-12 }),
        targets: allocations,
        tolerance: 0.05
      }).status
    ).toBe('ready');
  });

  it('treats the tolerance boundary inclusively', () => {
    const result = calculatePortfolioTargets({
      details: makeDetails({ equity: 650, bonds: 350 }),
      targets: allocations,
      tolerance: 0.05
    });
    expect(result.outOfToleranceCount).toBe(0);
  });

  it('treats redacted account values as unavailable', () => {
    const details = makeDetails({ cash: 100 });
    details.accounts.example.valueInBaseCurrency = undefined;
    expect(
      calculatePortfolioTargets({
        details,
        targets: allocations,
        tolerance: 0.05
      }).status
    ).toBe('unavailable');
  });
  function includeAccountCash(
    details: ReturnType<typeof makeDetails>,
    cash: number,
    currency = 'USD'
  ) {
    details.holdings.push({
      assetProfile: {
        assetClass: AssetClass.LIQUIDITY,
        assetSubClass: AssetSubClass.CASH,
        currency,
        symbol: currency
      },
      quantity: cash,
      valueInBaseCurrency: cash
    } as PortfolioDetails['holdings'][number]);
    details.summary.filteredValueInBaseCurrency += cash;
    return details;
  }

  it.each([false, true])(
    'accepts summary cancellation for a 0.01 balance and 10000 fund (cash holding: %s)',
    (withCashHolding) => {
      const details = makeDetails({ cash: 0.01 });
      // Actual getSummary output: Big(0.01).minus(10000).toNumber().
      // The two serialized fields cannot reconstruct 0.01 exactly in binary.
      details.summary.cash = -9999.99;
      details.summary.emergencyFund.cash = 10000;
      if (withCashHolding) {
        includeAccountCash(details, 0.01);
      }

      const result = calculatePortfolioTargets({
        details,
        targets: allocations,
        tolerance: 0.05
      });

      expect(result.status).toBe('ready');
      expect(result.accountCashValue).toBe(0.01);
      expect(result.totalValue).toBe(0.01);
      expect(
        result.rows.find(
          ({ assetClass }) => assetClass === AssetClass.LIQUIDITY
        )?.actual
      ).toBe(1);
    }
  );

  it('rejects a one-dollar cash discrepancy beside 1e15 in securities', () => {
    const details = includeAccountCash(
      makeDetails({ equity: 1e15, cash: 100 }),
      99
    );
    const result = calculatePortfolioTargets({
      details,
      targets: allocations,
      tolerance: 0.05
    });

    expect(result.status).toBe('inconsistent');
    expect(result.rows).toEqual([]);
  });

  it.each(
    [1e4, 1e15, 3e15, 1e16].flatMap((fund) =>
      [99, 100].map((cash) => ({ fund, cash }))
    )
  )(
    'reconciles two accounts with fund $fund and synthetic cash $cash',
    ({ fund, cash }) => {
      const details = includeAccountCash(
        makeDetails({ equity: 1e15, cash: 100 }),
        cash
      );
      details.accounts = {
        securities: {
          balance: 0,
          currency: 'USD',
          name: 'Securities',
          valueInBaseCurrency: 1e15
        },
        cash: {
          balance: 100,
          currency: 'USD',
          name: 'Cash',
          valueInBaseCurrency: 100
        }
      };
      details.summary.cash = 100 - fund;
      details.summary.emergencyFund.cash = fund;
      const result = calculatePortfolioTargets({
        details,
        targets: allocations,
        tolerance: 0.05
      });
      expect(result.status).toBe(cash === 100 ? 'ready' : 'inconsistent');
      if (cash === 99) expect(result.rows).toEqual([]);
    }
  );

  it.each([undefined, null, NaN, Infinity, -Infinity])(
    'requires finite independent cash (%s), without a legacy fallback',
    (cash) => {
      const details = makeDetails({ cash: 100 });
      details.summary.accountCashInBaseCurrency = cash;
      expect(
        calculatePortfolioTargets({
          details,
          targets: allocations,
          tolerance: 0.05
        }).status
      ).toBe('unavailable');
    }
  );

  it('treats a legacy response without independent cash as unavailable', () => {
    const details = makeDetails({ cash: 100 });
    delete details.summary.accountCashInBaseCurrency;
    expect(
      calculatePortfolioTargets({
        details,
        targets: allocations,
        tolerance: 0.05
      }).status
    ).toBe('unavailable');
  });

  it('does not depend on the adjusted summary fields', () => {
    const details = makeDetails({ cash: 100 });
    delete details.summary.cash;
    delete details.summary.emergencyFund;
    expect(
      calculatePortfolioTargets({
        details,
        targets: allocations,
        tolerance: 0.05
      }).status
    ).toBe('ready');
  });

  it('keeps negative independent cash unsupported', () => {
    const details = makeDetails({ equity: 100 });
    details.summary.accountCashInBaseCurrency = -1;
    expect(
      calculatePortfolioTargets({
        details,
        targets: allocations,
        tolerance: 0.05
      }).status
    ).toBe('unsupported');
  });

  it.each([0, 1])(
    'checks independently converted multi-currency cash with FX difference %s',
    (difference) => {
      const details = makeDetails({ equity: 600, cash: 100 });
      details.accounts = {
        euro: {
          balance: 20,
          currency: 'EUR',
          name: 'Euro',
          valueInBaseCurrency: 640
        },
        dollar: {
          balance: 60,
          currency: 'USD',
          name: 'Dollar',
          valueInBaseCurrency: 60
        }
      };
      includeAccountCash(details, 40 + difference, 'EUR');
      includeAccountCash(details, 60, 'USD');
      expect(
        calculatePortfolioTargets({
          details,
          targets: allocations,
          tolerance: 0.05
        }).status
      ).toBe(difference ? 'inconsistent' : 'ready');
    }
  );

  it.each(['security', 'cash'])('rejects a duplicated %s holding', (kind) => {
    const details = includeAccountCash(
      makeDetails({ equity: 100, cash: 50 }),
      50
    );
    details.holdings.push({ ...details.holdings[kind === 'security' ? 0 : 1] });
    expect(
      calculatePortfolioTargets({
        details,
        targets: allocations,
        tolerance: 0.05
      }).status
    ).toBe('inconsistent');
  });

  it('distinguishes a separately valued CASH instrument from synthetic account cash', () => {
    const details = includeAccountCash(
      makeDetails({ equity: 20, cash: 10 }),
      10
    );
    details.holdings[0].assetProfile = {
      assetClass: AssetClass.LIQUIDITY,
      assetSubClass: AssetSubClass.CASH,
      currency: 'USD',
      symbol: 'separate-cash-instrument'
    } as PortfolioDetails['holdings'][number]['assetProfile'];
    const result = calculatePortfolioTargets({
      details,
      targets: allocations,
      tolerance: 0.05
    });
    expect(result.status).toBe('ready');
    expect(result.accountCashValue).toBe(10);
    expect(result.totalValue).toBe(30);
  });

  it('accepts coherent cash beside 1e15 in securities', () => {
    const details = includeAccountCash(
      makeDetails({ equity: 1e15, cash: 100 }),
      100
    );
    expect(
      calculatePortfolioTargets({
        details,
        targets: allocations,
        tolerance: 0.05
      }).status
    ).toBe('ready');
  });

  it('does not apply a large emergency fund budget to missing securities', () => {
    const details = includeAccountCash(
      makeDetails({ equity: 1, cash: 0.01 }),
      0.01
    );
    details.summary.cash = -999999999999.99;
    details.summary.emergencyFund.cash = 1e12;
    // Emergency-fund adjustments must not affect any reconciliation budget.
    details.holdings[0].valueInBaseCurrency -= 0.0001;

    expect(
      calculatePortfolioTargets({
        details,
        targets: allocations,
        tolerance: 0.05
      }).status
    ).toBe('inconsistent');
  });

  it('reconciles the real queue snapshot without double-counting account cash', () => {
    const details = includeAccountCash(
      makeDetails({ equity: 600, bonds: 300, cash: 100 }),
      100
    );
    const result = calculatePortfolioTargets({
      details,
      targets: allocations,
      tolerance: 0.05
    });
    expect(result.status).toBe('ready');
    expect(result.totalValue).toBe(1000);
    expect(result.accountCashValue).toBe(100);
    expect(
      result.rows.find(({ assetClass }) => assetClass === AssetClass.LIQUIDITY)
        ?.actual
    ).toBeCloseTo(0.1);
    expect(result.totalDrift).toBeCloseTo(0.1);
    expect(result.outOfToleranceCount).toBe(2);
  });

  it('accepts a cash-only queue snapshot', () => {
    const details = includeAccountCash(makeDetails({ cash: 250 }), 250);
    const result = calculatePortfolioTargets({
      details,
      targets: allocations,
      tolerance: 0.05
    });
    expect(result.status).toBe('ready');
    expect(result.totalValue).toBe(250);
    expect(
      result.rows.find(({ assetClass }) => assetClass === AssetClass.LIQUIDITY)
        ?.actual
    ).toBe(1);
  });

  it('reconciles multiple synthetic currency holdings by their base-currency values', () => {
    const details = makeDetails({ equity: 600, cash: 100 });
    includeAccountCash(details, 40, 'EUR');
    includeAccountCash(details, 60, 'USD');
    const result = calculatePortfolioTargets({
      details,
      targets: allocations,
      tolerance: 0.05
    });
    expect(result.status).toBe('ready');
    expect(result.totalValue).toBe(700);
    expect(result.accountCashValue).toBe(100);
  });

  it('rejects incomplete cash positions even if an unrelated holding hides the difference', () => {
    const details = includeAccountCash(
      makeDetails({ equity: 600, cash: 100 }),
      50
    );
    details.holdings[0].valueInBaseCurrency = 650;
    details.summary.filteredValueInBaseCurrency += 50;
    const result = calculatePortfolioTargets({
      details,
      targets: allocations,
      tolerance: 0.05
    });
    expect(result.status).toBe('inconsistent');
    expect(result.rows).toEqual([]);
  });

  it('does not confuse a separately held cash instrument with an account balance', () => {
    const details = makeDetails({ equity: 100, cash: 50 });
    details.holdings[0].assetProfile = {
      assetClass: AssetClass.LIQUIDITY,
      assetSubClass: AssetSubClass.CASH,
      currency: 'USD',
      symbol: 'synthetic-cash-instrument'
    } as PortfolioDetails['holdings'][number]['assetProfile'];
    const result = calculatePortfolioTargets({
      details,
      targets: allocations,
      tolerance: 0.05
    });
    expect(result.status).toBe('ready');
    expect(result.totalValue).toBe(150);
    expect(
      result.rows.find(({ assetClass }) => assetClass === AssetClass.LIQUIDITY)
        ?.actual
    ).toBe(1);
  });

  it('still rejects omitted securities in a snapshot which already contains cash', () => {
    const details = includeAccountCash(
      makeDetails({ equity: 600, cash: 100 }),
      100
    );
    details.holdings.shift();
    expect(
      calculatePortfolioTargets({
        details,
        targets: allocations,
        tolerance: 0.05
      }).status
    ).toBe('inconsistent');
  });
});
