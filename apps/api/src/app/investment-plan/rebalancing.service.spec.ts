import {
  RebalancingService,
  toHoldingValuesBySymbol
} from './rebalancing.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a minimal InvestmentPlanAllocation-shaped object; one group per symbol by default */
function alloc(
  symbol: string,
  targetWeight: number,
  rebalanceThreshold = 5,
  groupId = symbol,
  name = ''
) {
  return {
    createdAt: new Date(),
    groupId,
    id: symbol + '-alloc',
    name,
    planId: 'plan-1',
    rebalanceThreshold,
    symbol,
    targetWeight,
    updatedAt: new Date()
  } as any;
}

/** Build a holdings map: each entry is just { valueInBaseCurrency } */
function holdings(map: Record<string, number>) {
  return Object.fromEntries(
    Object.entries(map).map(([sym, val]) => [sym, { valueInBaseCurrency: val }])
  );
}

// RebalancingService only uses prisma for generateRebalancingSignals.
// calculateRebalancing is pure, pass a stub.
const svc = new RebalancingService(null as any);

const byGroup = (
  r: Awaited<ReturnType<typeof svc.calculateRebalancing>>,
  groupId: string
) => r.actions.find((a) => a.groupId === groupId)!;

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('RebalancingService.calculateRebalancing', () => {
  it('returns no actions when there are no allocations', async () => {
    const r = await svc.calculateRebalancing([], holdings({ 'XIC.TO': 5000 }));

    expect(r.actions).toEqual([]);
    expect(r.hasTriggered).toBe(false);
    expect(r.totalValue).toBe(0);
  });

  it('returns no actions when nothing is held', async () => {
    const r = await svc.calculateRebalancing([alloc('XIC.TO', 40)], {});

    expect(r.actions).toEqual([]);
    expect(r.hasTriggered).toBe(false);
    expect(r.totalValue).toBe(0);
  });

  it('is all OK for a perfectly balanced portfolio', async () => {
    const r = await svc.calculateRebalancing(
      [alloc('XIC.TO', 40), alloc('XEF.TO', 30), alloc('VCN.TO', 30)],
      holdings({ 'XIC.TO': 4000, 'XEF.TO': 3000, 'VCN.TO': 3000 })
    );

    expect(r.totalValue).toBe(10000);
    expect(r.hasTriggered).toBe(false);
    expect(r.actions.every((a) => a.type === 'OK')).toBe(true);
  });

  it('sells the overweight and buys the underweight group', async () => {
    // XIC 48% (+8), XEF 28% (-2), VCN 24% (-6), threshold 5
    const r = await svc.calculateRebalancing(
      [alloc('XIC.TO', 40), alloc('XEF.TO', 30), alloc('VCN.TO', 30)],
      holdings({ 'XIC.TO': 4800, 'XEF.TO': 2800, 'VCN.TO': 2400 })
    );

    expect(r.hasTriggered).toBe(true);
    expect(byGroup(r, 'XIC.TO')).toMatchObject({ type: 'SELL' });
    expect(byGroup(r, 'XIC.TO').amount).toBeCloseTo(800, 4);
    expect(byGroup(r, 'XEF.TO').type).toBe('OK');
    expect(byGroup(r, 'VCN.TO')).toMatchObject({ type: 'BUY' });
    expect(byGroup(r, 'VCN.TO').amount).toBeCloseTo(600, 4);
  });

  it('treats a target symbol that is not held as 0', async () => {
    const r = await svc.calculateRebalancing(
      [alloc('XIC.TO', 60), alloc('VCN.TO', 40)],
      holdings({ 'XIC.TO': 10000 })
    );

    expect(byGroup(r, 'VCN.TO').currentValue).toBe(0);
    expect(byGroup(r, 'VCN.TO').type).toBe('BUY');
    expect(byGroup(r, 'VCN.TO').amount).toBeCloseTo(4000, 4);
  });

  it('triggers exactly at the threshold and not just below it', async () => {
    const at = await svc.calculateRebalancing(
      [alloc('XIC.TO', 40, 5)],
      holdings({ 'XIC.TO': 4500, 'XEF.TO': 5500 })
    );
    const below = await svc.calculateRebalancing(
      [alloc('XIC.TO', 40, 5)],
      holdings({ 'XIC.TO': 4490, 'XEF.TO': 5510 })
    );

    expect(byGroup(at, 'XIC.TO').type).toBe('SELL');
    expect(byGroup(below, 'XIC.TO').type).toBe('OK');
    expect(below.hasTriggered).toBe(false);
  });

  it('uses the threshold of each group', async () => {
    const r = await svc.calculateRebalancing(
      [alloc('QQQ', 50, 10), alloc('SPY', 50, 20)],
      holdings({ QQQ: 6000, SPY: 4000 })
    );

    expect(byGroup(r, 'QQQ').type).toBe('SELL');
    expect(byGroup(r, 'SPY').type).toBe('OK');
  });

  it('adds the symbols of a group together', async () => {
    const r = await svc.calculateRebalancing(
      [
        alloc('XUS.TO', 25, 5, 'us', 'US'),
        alloc('XQQ.TO', 25, 5, 'us', 'US'),
        alloc('XIC.TO', 50, 5, 'ca', 'Canada')
      ],
      holdings({ 'XUS.TO': 2000, 'XQQ.TO': 3000, 'XIC.TO': 5000 })
    );

    expect(byGroup(r, 'us').currentValue).toBe(5000);
    expect(byGroup(r, 'us').currentWeight).toBeCloseTo(50, 4);
    expect(byGroup(r, 'us').symbols).toEqual(['XUS.TO', 'XQQ.TO']);
  });

  it('describes the direction in the reason', async () => {
    const over = await svc.calculateRebalancing(
      [alloc('XIC.TO', 40)],
      holdings({ 'XIC.TO': 4800, other: 5200 })
    );
    const under = await svc.calculateRebalancing(
      [alloc('XIC.TO', 60)],
      holdings({ 'XIC.TO': 4000, other: 6000 })
    );

    expect(byGroup(over, 'XIC.TO').reason).toContain('overweight');
    expect(byGroup(under, 'XIC.TO').reason).toContain('underweight');
  });

  // ── The base of the weights is the actual market value ─────────────────────
  //
  // Regression: with a Long-term Growth Target of 32 000 and 35 973 actually
  // held, the weights were taken from 32 000. They added up to 112% and XQQ.TO
  // was reported as 5.7% overweight although it is at 31.8% against 30%.

  describe('actual holdings above the Long-term Growth Target', () => {
    const allocations = [
      alloc('XUS.TO', 25),
      alloc('XQQ.TO', 30),
      alloc('XIC.TO', 15),
      alloc('XEF.TO', 15),
      alloc('RISK', 15, 4)
    ];
    const h = holdings({
      'XUS.TO': 7190,
      'XQQ.TO': 11424,
      'XIC.TO': 3648,
      'XEF.TO': 6661,
      RISK: 7050
    });

    it('takes the actual market value as the base', async () => {
      const r = await svc.calculateRebalancing(allocations, h, 32000);

      expect(r.totalValue).toBe(35973);
    });

    it('lets the weights of a fully assigned portfolio add up to 100%', async () => {
      const r = await svc.calculateRebalancing(allocations, h, 32000);
      const sum = r.actions.reduce((total, a) => total + a.currentWeight, 0);

      expect(sum).toBeCloseTo(100, 6);
    });

    it('does not report XQQ.TO as overweight', async () => {
      const r = await svc.calculateRebalancing(allocations, h, 32000);

      expect(byGroup(r, 'XQQ.TO').currentWeight).toBeCloseTo(31.76, 1);
      expect(byGroup(r, 'XQQ.TO').type).toBe('OK');
    });

    it('finds the real drift: XUS.TO under, RISK over', async () => {
      const r = await svc.calculateRebalancing(allocations, h, 32000);

      expect(byGroup(r, 'XUS.TO').type).toBe('BUY');
      expect(byGroup(r, 'RISK').type).toBe('SELL');
      expect(r.hasTriggered).toBe(true);
    });

    it('computes amounts from the same base', async () => {
      const r = await svc.calculateRebalancing(allocations, h, 32000);

      // 25% of 35 973 = 8 993.25, held 7 190
      expect(byGroup(r, 'XUS.TO').amount).toBeCloseTo(1803.25, 2);
    });

    it('gives the same weights whatever the target is', async () => {
      const a = await svc.calculateRebalancing(allocations, h, 32000);
      const b = await svc.calculateRebalancing(allocations, h, 0);

      expect(b.actions.map((x) => x.currentWeight)).toEqual(
        a.actions.map((x) => x.currentWeight)
      );
    });
  });

  // ── The target capital is reported beside the weights ──────────────────────

  describe('capital status', () => {
    const allocations = [alloc('XIC.TO', 100)];

    it('flags holdings above the target capital', async () => {
      const r = await svc.calculateRebalancing(
        allocations,
        holdings({ 'XIC.TO': 35973 }),
        32000
      );

      expect(r.capital.status).toBe('ABOVE_TARGET');
      expect(r.capital.gap).toBe(-3973);
      expect(r.capital.reason).toContain('3,973 above the 32,000 target');
    });

    it('shows how much is still to deploy below the target', async () => {
      const r = await svc.calculateRebalancing(
        allocations,
        holdings({ 'XIC.TO': 27000 }),
        32000
      );

      expect(r.capital.status).toBe('BELOW_TARGET');
      expect(r.capital.gap).toBe(5000);
      expect(r.capital.reason).toContain('5,000 of the 32,000');
    });

    it('is on target within half a percent', async () => {
      const r = await svc.calculateRebalancing(
        allocations,
        holdings({ 'XIC.TO': 32100 }),
        32000
      );

      expect(r.capital.status).toBe('ON_TARGET');
    });

    it('is unset without a target and never changes the weights', async () => {
      const r = await svc.calculateRebalancing(
        allocations,
        holdings({ 'XIC.TO': 1000 })
      );

      expect(r.capital.status).toBe('UNSET');
      expect(r.capital.reason).toBe('');
    });

    it('does not make a rebalancing out of the capital gap', async () => {
      const r = await svc.calculateRebalancing(
        allocations,
        holdings({ 'XIC.TO': 35973 }),
        32000
      );

      expect(r.hasTriggered).toBe(false);
    });
  });
});

// ---------------------------------------------------------------------------
// The holdings come as a list since Ghostfolio 3.63
// ---------------------------------------------------------------------------

describe('toHoldingValuesBySymbol', () => {
  it('maps the list of holdings to the value per symbol', () => {
    const r = toHoldingValuesBySymbol([
      { assetProfile: { symbol: 'XIC.TO' }, valueInBaseCurrency: 4000 },
      { assetProfile: { symbol: 'XEF.TO' }, valueInBaseCurrency: 6000 }
    ] as any);

    expect(r).toEqual({
      'XEF.TO': { valueInBaseCurrency: 6000 },
      'XIC.TO': { valueInBaseCurrency: 4000 }
    });
  });

  it('adds up a symbol held under two data sources', () => {
    const r = toHoldingValuesBySymbol([
      { assetProfile: { symbol: 'XIC.TO' }, valueInBaseCurrency: 1000 },
      { assetProfile: { symbol: 'XIC.TO' }, valueInBaseCurrency: 500 }
    ] as any);

    expect(r['XIC.TO'].valueInBaseCurrency).toBe(1500);
  });

  it('treats a missing value as 0 and a missing list as empty', () => {
    expect(
      toHoldingValuesBySymbol([{ assetProfile: { symbol: 'A' } }] as any)
    ).toEqual({ A: { valueInBaseCurrency: 0 } });
    expect(toHoldingValuesBySymbol(undefined as any)).toEqual({});
  });

  it('feeds calculateRebalancing', async () => {
    const r = await svc.calculateRebalancing(
      [alloc('XIC.TO', 50), alloc('XEF.TO', 50)],
      toHoldingValuesBySymbol([
        { assetProfile: { symbol: 'XIC.TO' }, valueInBaseCurrency: 7000 },
        { assetProfile: { symbol: 'XEF.TO' }, valueInBaseCurrency: 3000 }
      ] as any)
    );

    expect(r.totalValue).toBe(10000);
    expect(byGroup(r, 'XIC.TO').type).toBe('SELL');
  });
});
