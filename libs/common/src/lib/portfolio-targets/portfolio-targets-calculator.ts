import { UNKNOWN_KEY } from '@ghostfolio/common/config';
import {
  PortfolioDetails,
  PortfolioTargetsSettings
} from '@ghostfolio/common/interfaces';
import { AssetClass } from '@ghostfolio/prisma/enums';

export const TARGET_ASSET_CLASSES = Object.values(AssetClass);

export type TargetAllocationKey = AssetClass | typeof UNKNOWN_KEY;

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
  /** Estimated cash in account balances (not cash already in holdings). */
  accountCashValue: number;
  /** Half of the absolute drifts; excludes unclassified holdings. */
  totalDrift: number;
  maxDrift: number;
  outOfToleranceCount: number;
  unclassifiedValue: number;
  status: 'ready' | 'empty' | 'unavailable' | 'inconsistent';
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

  const values = TARGET_ASSET_CLASSES.map((assetClass) => allocations[assetClass] ?? 0);

  return (
    values.every((value) => Number.isFinite(value) && value >= 0 && value <= 1) &&
    Math.abs(values.reduce((sum, value) => sum + value, 0) - 1) < 1e-8 &&
    Object.keys(allocations).every((key) =>
      TARGET_ASSET_CLASSES.includes(key as AssetClass)
    )
  );
}

/**
 * Computes actual allocation from the unfiltered (or account-only filtered)
 * portfolio details. Account value includes cash, while ordinary holdings
 * generally do not include the accounts' cash balances.
 *
 * Never use this method on redacted values: combining percentage-only
 * holdings with account balances would yield incorrect allocations.
 */
export function calculatePortfolioTargets({
  details,
  targets,
  tolerance
}: {
  details: Pick<PortfolioDetails, 'accounts' | 'holdings'>;
  targets: Partial<Record<AssetClass, number>>;
  tolerance: number;
}): TargetAllocationResult {
  const empty = (status: TargetAllocationResult['status']): TargetAllocationResult => ({
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
  for (const holding of details.holdings) {
    const value = holding.valueInBaseCurrency;
    if (value === undefined || !Number.isFinite(value)) {
      return empty('unavailable');
    }

    if (value < 0) {
      return empty('inconsistent');
    }

    holdingsValue += value;

    const assetClass = holding.assetProfile.assetClass;
    const key = assetClass && TARGET_ASSET_CLASSES.includes(assetClass)
      ? assetClass
      : UNKNOWN_KEY;

    values.set(key, (values.get(key) ?? 0) + value);
  }

  const accountValues = Object.values(details.accounts);
  if (accountValues.some(({ valueInBaseCurrency }) =>
    !Number.isFinite(valueInBaseCurrency) || valueInBaseCurrency < 0
  )) {
    return empty('inconsistent');
  }

  const accountsTotal = accountValues.reduce(
    (sum, account) => sum + account.valueInBaseCurrency,
    0
  );

  // Positions with no account are included in the UNKNOWN account bucket.
  // An empty accounts object is tolerated only if there are no holdings.
  if (accountValues.length === 0 && holdingsValue > 0) {
    return empty('unavailable');
  }

  const accountCashValue = accountsTotal - holdingsValue;
  const epsilon = Math.max(accountsTotal, 1) * 1e-8;

  // A negative residual signals that accounts and holdings cannot be
  // reconciled (rather than negative cash to silently normalize).
  if (accountCashValue < -epsilon) {
    return empty('inconsistent');
  }

  const totalValue = accountsTotal;
  if (totalValue <= epsilon) {
    return empty('empty');
  }

  values.set(
    AssetClass.LIQUIDITY,
    (values.get(AssetClass.LIQUIDITY) ?? 0) + Math.max(0, accountCashValue)
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
      outOfTolerance: true
    });
  }

  const drifts = rows.map(({ drift }) => Math.abs(drift));

  return {
    rows,
    totalValue,
    accountCashValue: Math.max(0, accountCashValue),
    totalDrift: drifts.reduce((sum, value) => sum + value, 0) / 2,
    maxDrift: Math.max(...drifts),
    outOfToleranceCount: rows.filter(({ outOfTolerance }) => outOfTolerance).length,
    unclassifiedValue,
    status: 'ready'
  };
}
