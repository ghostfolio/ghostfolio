// Financial invariants and X-Ray cross-reference
import { Injectable } from '@nestjs/common';

import type {
  DomainValidationResult,
  DomainViolation,
  VerificationChecker,
  VerificationContext
} from './verification.interfaces';

// Risk keyword to X-Ray category prefixes
const RISK_KEYWORDS: Record<string, string[]> = {
  diversified: [
    'AccountClusterRisk',
    'AssetClassClusterRisk',
    'CurrencyClusterRisk',
    'RegionalMarketClusterRisk'
  ],
  concentrated: [
    'AccountClusterRisk',
    'AssetClassClusterRisk',
    'CurrencyClusterRisk',
    'RegionalMarketClusterRisk'
  ],
  balanced: ['AssetClassClusterRisk', 'RegionalMarketClusterRisk'],
  overweight: [
    'AssetClassClusterRisk',
    'CurrencyClusterRisk',
    'RegionalMarketClusterRisk'
  ],
  underweight: [
    'AssetClassClusterRisk',
    'CurrencyClusterRisk',
    'RegionalMarketClusterRisk'
  ],
  risk: [
    'AccountClusterRisk',
    'AssetClassClusterRisk',
    'CurrencyClusterRisk',
    'EconomicMarketClusterRisk'
  ],
  exposure: [
    'CurrencyClusterRisk',
    'EconomicMarketClusterRisk',
    'RegionalMarketClusterRisk'
  ],
  fees: ['EconomicMarketClusterRisk']
};
const POSITIVE_ASSERTIONS = new Set(['diversified', 'balanced']);
const NEGATIVE_ASSERTIONS = new Set([
  'concentrated',
  'overweight',
  'underweight'
]);

interface HoldingLike {
  allocationInPercentage?: number;
  currency?: string;
  exchangeRate?: number;
  quantity?: number;
  valueInBaseCurrency?: number;
  marketPrice?: number;
}
interface XRayCategory {
  key?: string;
  rules?: { key?: string; value?: boolean; isActive?: boolean }[];
}

/**
 * DomainValidator enforces financial domain invariants across tool call
 * output data and cross-references X-Ray results against risk-related claims.
 */
@Injectable()
export class DomainValidator implements VerificationChecker {
  public readonly stageName = 'domainValidator';
  public validate(
    context: VerificationContext,
    signal?: AbortSignal
  ): DomainValidationResult {
    const v: DomainViolation[] = [];
    if (context.toolCalls.length === 0) return { passed: true, violations: v };

    const holdings: HoldingLike[] = [];
    const xRay: XRayCategory[] = [];
    for (const call of context.toolCalls) {
      if (call.success && call.outputData != null)
        this.extract(call.outputData, holdings, xRay);
    }
    if (signal?.aborted) return { passed: true, violations: v };

    // No negative allocations
    for (const h of holdings) {
      if (h.allocationInPercentage != null && h.allocationInPercentage < 0)
        v.push({
          constraintId: 'NEGATIVE_ALLOCATION',
          description: 'Negative allocation in holdings',
          expected: 'allocationInPercentage >= 0',
          actual: `${h.allocationInPercentage}`
        });
    }
    if (signal?.aborted) return this.res(v);

    // Allocations sum to ~100%
    const allocs = holdings
      .map((h) => h.allocationInPercentage)
      .filter((a): a is number => a != null);
    if (allocs.length >= 2) {
      const sum = allocs.reduce((a, b) => a + b, 0);
      if (Math.abs(sum - 1.0) > 0.01)
        v.push({
          constraintId: 'ALLOCATION_SUM',
          description: 'Allocations do not sum to ~100%',
          expected: 'sum ≈ 1.0 (tolerance: 0.01)',
          actual: `sum = ${sum.toFixed(6)}`
        });
    }
    if (signal?.aborted) return this.res(v);

    // Valid ISO 4217 currency codes
    const seen = new Set<string>();
    for (const h of holdings) {
      if (typeof h.currency !== 'string' || seen.has(h.currency)) continue;
      seen.add(h.currency);
      if (!/^[A-Z]{3}$/.test(h.currency))
        v.push({
          constraintId: 'INVALID_CURRENCY',
          description: 'Invalid ISO 4217 currency code',
          expected: '3 uppercase letters (ISO 4217 format)',
          actual: `"${h.currency}"`
        });
    }
    if (signal?.aborted) return this.res(v);

    // Non-negative quantities
    for (const h of holdings) {
      if (h.quantity != null && h.quantity < 0)
        v.push({
          constraintId: 'NEGATIVE_QUANTITY',
          description: 'Negative quantity in holdings',
          expected: 'quantity >= 0',
          actual: `${h.quantity}`
        });
    }
    if (signal?.aborted) return this.res(v);

    // Value consistency (valueInBaseCurrency ≈ quantity × marketPrice × exchangeRate, 1% tolerance)
    for (const h of holdings) {
      if (
        h.valueInBaseCurrency == null ||
        h.quantity == null ||
        h.marketPrice == null
      )
        continue;
      const exchangeRate = h.exchangeRate ?? 1;
      const exp = h.quantity * h.marketPrice * exchangeRate;
      const ref = Math.max(Math.abs(exp), Math.abs(h.valueInBaseCurrency));
      if (ref > 0 && Math.abs(h.valueInBaseCurrency - exp) / ref > 0.01)
        v.push({
          constraintId: 'VALUE_INCONSISTENCY',
          description:
            'valueInBaseCurrency ≠ quantity × marketPrice × exchangeRate (>1%)',
          expected: `${h.quantity} × ${h.marketPrice} × ${exchangeRate} = ${exp.toFixed(2)}`,
          actual: `valueInBaseCurrency = ${h.valueInBaseCurrency.toFixed(2)}`
        });
    }
    if (signal?.aborted) return this.res(v);

    // X-Ray consistency
    this.checkXRay(context.agentResponseText, xRay, v);
    return this.res(v);
  }

  /** Recursively extract holding-like objects and X-Ray categories from tool output. */
  private extract(
    data: unknown,
    holdings: HoldingLike[],
    xRay: XRayCategory[]
  ): void {
    if (data == null || typeof data !== 'object') return;
    if (Array.isArray(data)) {
      const isHoldings =
        data.length > 0 &&
        data.some(
          (i) =>
            i &&
            typeof i === 'object' &&
            ('allocationInPercentage' in i ||
              ('quantity' in i && 'marketPrice' in i))
        );
      const isXRay =
        data.length > 0 &&
        data.some(
          (i) => i && typeof i === 'object' && 'key' in i && 'rules' in i
        );
      if (isHoldings) {
        for (const i of data) {
          if (i && typeof i === 'object') holdings.push(i as HoldingLike);
        }
      } else if (isXRay) {
        for (const i of data) {
          if (i && typeof i === 'object' && 'rules' in i)
            xRay.push(i as XRayCategory);
        }
      } else {
        for (const i of data) this.extract(i, holdings, xRay);
      }
      return;
    }
    const obj = data as Record<string, unknown>;
    for (const k of Object.keys(obj)) this.extract(obj[k], holdings, xRay);
  }

  /** Cross-reference agent risk assertions against X-Ray rule pass/fail. */
  private checkXRay(
    text: string,
    categories: XRayCategory[],
    v: DomainViolation[]
  ): void {
    if (!text || categories.length === 0) return;
    const lower = text.toLowerCase();

    // Build category -> pass rate
    const stats = new Map<string, { passed: number; total: number }>();
    for (const cat of categories) {
      if (!cat.key || !cat.rules) continue;
      let passed = 0,
        total = 0;
      for (const r of cat.rules) {
        if (!r.isActive) continue;
        total++;
        if (r.value === true) passed++;
      }
      if (total > 0) stats.set(cat.key, { passed, total });
    }
    if (stats.size === 0) return;

    for (const [keyword, prefixes] of Object.entries(RISK_KEYWORDS)) {
      if (!lower.includes(keyword)) continue;
      const pos = POSITIVE_ASSERTIONS.has(keyword);
      const neg = NEGATIVE_ASSERTIONS.has(keyword);
      if (!pos && !neg) continue;

      for (const pfx of prefixes) {
        for (const [key, s] of Array.from(stats.entries())) {
          if (!key.startsWith(pfx)) continue;
          const rate = s.passed / s.total;
          if (pos && rate < 0.5)
            v.push({
              constraintId: 'XRAY_INCONSISTENCY',
              description: `Agent claims "${keyword}" but X-Ray "${key}" mostly failing`,
              expected: `Majority of ${key} rules passing for "${keyword}" claim`,
              actual: `${s.passed}/${s.total} passing (${(rate * 100).toFixed(0)}%)`
            });
          if (neg && rate > 0.5)
            v.push({
              constraintId: 'XRAY_INCONSISTENCY',
              description: `Agent claims "${keyword}" but X-Ray "${key}" mostly passing`,
              expected: `Some ${key} rules failing for "${keyword}" claim`,
              actual: `${s.passed}/${s.total} passing (${(rate * 100).toFixed(0)}%)`
            });
        }
      }
    }
  }

  private res(violations: DomainViolation[]): DomainValidationResult {
    return { passed: violations.length === 0, violations };
  }
}
