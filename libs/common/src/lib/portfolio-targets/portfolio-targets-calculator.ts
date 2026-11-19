import { UNKNOWN_KEY } from '@ghostfolio/common/config';
import {
  PortfolioDetails,
  PortfolioTargetsSettings
} from '@ghostfolio/common/interfaces';
import { AssetClass, AssetSubClass } from '@ghostfolio/prisma/enums';

export const TARGET_ASSET_CLASSES = Object.values(AssetClass);

export type TargetAllocationKey = AssetClass | typeof UNKNOWN_KEY;

/**
 * Forward-error bound gamma(n) * magnitude for n rounding steps. EPSILON
 * conservatively bounds unit roundoff (EPSILON / 2), including evaluation of
 * the bound from already rounded, nonnegative magnitudes. No currency units
 * or decimal-place assumptions enter this calculation.
 */
function roundoffBudget(magnitude: number, operations: number) {
  const error = operations * Number.EPSILON;
  return (error / (1 - error)) * Math.abs(magnitude);
}

export interface TargetAllocationRow {
  assetClass: TargetAllocationKey;
  actual: number;
  target: number;
  /** Signed percentage-point difference, expressed as a fraction. */
  drift: number;
  outOfTolerance: boolean;
}

export interface TargetAllocationResult {
  rows: TargetAllocationRow[];
  /** Total asset value, including cash balances. */
  totalValue: number;
  /** Independently verified account cash, whether already represented in holdings or not. */
  accountCashValue: number;
  /** Half of the absolute drifts, including unclassified holdings. */
  totalDrift: number;
  maxDrift: number;
  outOfToleranceCount: number;
  unclassifiedValue: number;
  status: 'ready' | 'empty' | 'unavailable' | 'inconsistent' | 'unsupported';
}

/** The first release permits only one active target, but uses a versioned shape. */
export function getActivePortfolioTarget(settings: PortfolioTargetsSettings) {
  return settings.profiles.find(({ id }) => id === settings.activeProfileId);
}

export function isValidPortfolioTarget(
  allocations: Partial<Record<AssetClass, number>>,
  tolerance: number
): boolean {
  if (!Number.isFinite(tolerance) || tolerance < 0 || tolerance > 1) {
    return false;
  }

  const values = TARGET_ASSET_CLASSES.map(
    (assetClass) => allocations[assetClass] ?? 0
  );

  return (
    values.every(
      (value) => Number.isFinite(value) && value >= 0 && value <= 1
    ) &&
    Math.abs(values.reduce((sum, value) => sum + value, 0) - 1) < 1e-8 &&
    Object.keys(allocations).every((key) =>
      TARGET_ASSET_CLASSES.includes(key as AssetClass)
    )
  );
}

/**
 * Computes actual allocation from the unfiltered (or account-only filtered)
 * portfolio details. Cached snapshots computed by the queue worker already
 * include account cash as currency holdings. Never add that cash a second time.
 *
 * Never use this method on redacted values: combining percentage-only
 * holdings with account balances would yield incorrect allocations.
 */
export function calculatePortfolioTargets({
  details,
  targets,
  tolerance
}: {
  details: Pick<PortfolioDetails, 'accounts' | 'holdings' | 'summary'>;
  targets: Partial<Record<AssetClass, number>>;
  tolerance: number;
}): TargetAllocationResult {
  const empty = (
    status: TargetAllocationResult['status']
  ): TargetAllocationResult => ({
    rows: [],
    totalValue: 0,
    accountCashValue: 0,
    totalDrift: 0,
    maxDrift: 0,
    outOfToleranceCount: 0,
    unclassifiedValue: 0,
    status
  });

  if (!isValidPortfolioTarget(targets, tolerance)) {
    return empty('inconsistent');
  }

  const values = new Map<TargetAllocationKey, number>(
    TARGET_ASSET_CLASSES.map((assetClass) => [assetClass, 0])
  );

  let holdingsValue = 0;
  let cashHoldingsValue = 0;
  let cashHoldingsCount = 0;
  let hasCashHoldings = false;
  for (const holding of details.holdings) {
    const value = holding.valueInBaseCurrency;
    if (value === undefined || !Number.isFinite(value)) {
      return empty('unavailable');
    }

    if (value < 0 || holding.quantity < 0) {
      return empty('unsupported');
    }

    holdingsValue += value;

    const profile = holding.assetProfile;
    // The backend's synthetic currency positions use the currency code as
    // their symbol. Ordinary cash instruments have their own symbol and must
    // not be confused with an account's balance.
    if (
      profile?.assetClass === AssetClass.LIQUIDITY &&
      profile.assetSubClass === AssetSubClass.CASH &&
      typeof profile.currency === 'string' &&
      profile.symbol === profile.currency
    ) {
      hasCashHoldings = true;
      cashHoldingsCount++;
      cashHoldingsValue += value;
    }

    const assetClass = holding.assetProfile?.assetClass;
    const key =
      assetClass && TARGET_ASSET_CLASSES.includes(assetClass)
        ? assetClass
        : UNKNOWN_KEY;

    values.set(key, (values.get(key) ?? 0) + value);
  }

  const accountValues = Object.values(details.accounts);
  if (
    accountValues.some(
      ({ valueInBaseCurrency, balance }) =>
        !Number.isFinite(valueInBaseCurrency) || !Number.isFinite(balance)
    )
  ) {
    return empty('unavailable');
  }

  // Negative balances and short positions are legitimate, but the v1
  // long-only comparison cannot represent them. Never normalize them away.
  if (
    accountValues.some(
      ({ balance, valueInBaseCurrency }) =>
        balance < 0 || valueInBaseCurrency < 0
    )
  ) {
    return empty('unsupported');
  }

  const accountsTotal = accountValues.reduce(
    (sum, account) => sum + account.valueInBaseCurrency,
    0
  );

  if (accountValues.length === 0 && holdingsValue > 0) {
    return empty('unavailable');
  }

  // A positive residual alone is not proof of cash: getDetails can omit a
  // position whose symbol profile is missing. Its existing summary provides
  // the snapshot total and independently converted account cash, for this
  // same unfiltered/account-only selection.
  const summary = details.summary;
  const snapshotValue = summary?.filteredValueInBaseCurrency;
  const accountCashValue = summary?.accountCashInBaseCurrency;
  if (
    typeof snapshotValue !== 'number' ||
    typeof accountCashValue !== 'number' ||
    !summary ||
    ![
      summary.filteredValueInBaseCurrency,
      accountCashValue,
      summary.liabilitiesInBaseCurrency
    ].every((value) => typeof value === 'number' && Number.isFinite(value))
  ) {
    return empty('unavailable');
  }

  if (accountCashValue < 0 || summary.liabilitiesInBaseCurrency !== 0) {
    return empty('unsupported');
  }

  const cashNotInHoldings = hasCashHoldings ? 0 : accountCashValue;
  const totalValue = holdingsValue + cashNotInHoldings;
  if (
    ![holdingsValue, accountsTotal, accountCashValue, totalValue].every(
      Number.isFinite
    )
  ) {
    return empty('unavailable');
  }

  // Holdings: one Big-to-number conversion per value, then n - 1 additions.
  // The snapshot independently converts the Big sum once.
  const holdingsError = roundoffBudget(holdingsValue, details.holdings.length);
  const snapshotError = roundoffBudget(snapshotValue, 1);

  // Accounts: up to two FX multiplications (an indirect rate and the amount)
  // or a serialized snapshot price, a final conversion, then n - 1 additions.
  const accountsError = roundoffBudget(accountsTotal, accountValues.length + 2);

  // AccountService converts each nonnegative balance with up to two FX
  // multiplications, sums using Big and converts the sum once. These three
  // rounding steps stay at cash scale, independently of securities/funds.
  const cashError = roundoffBudget(accountCashValue, 3);
  const cashHoldingsError = roundoffBudget(
    cashHoldingsValue,
    cashHoldingsCount
  );
  const totalError = hasCashHoldings
    ? holdingsError
    : holdingsError + cashError + roundoffBudget(totalValue, 1);

  if (
    ![holdingsError, snapshotError, accountsError, cashError, totalError].every(
      Number.isFinite
    )
  ) {
    return empty('unavailable');
  }

  // Each comparison uses only its own operands. In particular, a large
  // security position must never enlarge the independent cash error budget.
  if (
    Math.abs(holdingsValue - snapshotValue) > holdingsError + snapshotError ||
    Math.abs(accountsTotal - totalValue) > accountsError + totalError ||
    (hasCashHoldings &&
      Math.abs(cashHoldingsValue - accountCashValue) >
        cashHoldingsError + cashError)
  ) {
    return empty('inconsistent');
  }

  if (totalValue === 0) {
    return empty('empty');
  }

  values.set(
    AssetClass.LIQUIDITY,
    (values.get(AssetClass.LIQUIDITY) ?? 0) + cashNotInHoldings
  );

  const rows: TargetAllocationRow[] = TARGET_ASSET_CLASSES.map((assetClass) => {
    const actual = (values.get(assetClass) ?? 0) / totalValue;
    const target = targets[assetClass] ?? 0;
    const drift = actual - target;
    return {
      assetClass,
      actual,
      target,
      drift,
      outOfTolerance: Math.abs(drift) > tolerance + 1e-10
    };
  });

  const unclassifiedValue = values.get(UNKNOWN_KEY) ?? 0;
  if (unclassifiedValue > 0) {
    rows.push({
      assetClass: UNKNOWN_KEY,
      actual: unclassifiedValue / totalValue,
      target: 0,
      drift: unclassifiedValue / totalValue,
      outOfTolerance: unclassifiedValue / totalValue > tolerance + 1e-10
    });
  }

  const drifts = rows.map(({ drift }) => Math.abs(drift));

  return {
    rows,
    totalValue,
    accountCashValue,
    totalDrift: drifts.reduce((sum, value) => sum + value, 0) / 2,
    maxDrift: Math.max(...drifts),
    outOfToleranceCount: rows.filter(({ outOfTolerance }) => outOfTolerance)
      .length,
    unclassifiedValue,
    status: 'ready'
  };
}
