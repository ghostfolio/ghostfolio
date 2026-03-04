// Number extraction, truth set building, tolerance matching
import { Injectable } from '@nestjs/common';

import type {
  ExtractedNumber,
  FactCheckResult,
  NumberVerificationDetail,
  TruthSetEntry,
  VerificationChecker,
  VerificationContext
} from './verification.interfaces';

// Numbers too common/ambiguous to verify
const SKIP_NUMBERS = new Set([
  0,
  1,
  2,
  3,
  4,
  5,
  6,
  7,
  8,
  9,
  10,
  12,
  24,
  30,
  31,
  60,
  90,
  365, // common time values
  100,
  1000 // round numbers used conversationally
]);
const SKIP_YEAR_MIN = 2000;
const SKIP_YEAR_MAX = 2029;
const CONTEXT_WINDOW = 40;

// Pre-filter patterns
const ISO_DATE_RE = /\b\d{4}-\d{2}-\d{2}\b/g;
const SLASH_DATE_RE = /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g;
const VERSION_RE = /\bv?\d+\.\d+\.\d+(?:-[\w.]+)?\b/g;
const LIST_INDEX_RE = /(?:^|\n)\s*\d+\.\s/g;

// Pre-filter 5: Known disclaimer text ranges (numbers inside these should be ignored)
const DISCLAIMER_TEXTS = [
  'This information is for educational purposes only and does not constitute tax advice.',
  'Tax laws vary by jurisdiction and individual circumstances.',
  'Please consult a qualified tax professional for advice specific to your situation.',
  'This is not financial advice.',
  'Consider consulting a licensed financial advisor before making investment decisions.',
  'Past performance is not indicative of future results.',
  'Market predictions are inherently uncertain.',
  'Note: The market data used in this analysis is more than 24 hours old and may not reflect current prices.',
  'Some data sources were unavailable. This response may be incomplete.'
];

// Number extraction patterns
const NUMBER_RE = /[$€£¥]?\s*-?\d{1,3}(?:[,.\s]\d{3})*(?:[.,]\d+)?%?/g;
const CHF_NUMBER_RE = /CHF\s*-?\d{1,3}(?:[,.\s]\d{3})*(?:[.,]\d+)?/g;

/**
 * FactChecker cross-references numerical values in the agent's
 * response against structured data from tool call results.
 */
@Injectable()
export class FactChecker implements VerificationChecker {
  public readonly stageName = 'factChecker';
  public check(
    context: VerificationContext,
    signal?: AbortSignal
  ): FactCheckResult {
    const empty: FactCheckResult = {
      passed: true,
      verifiedCount: 0,
      unverifiedCount: 0,
      derivedCount: 0,
      details: []
    };

    if (!context.agentResponseText || context.toolCalls.length === 0) {
      return empty;
    }

    // Step 1: Pre-filter response text (remove dates, versions, list indices, disclaimer text)
    let filteredText = context.agentResponseText
      .replace(ISO_DATE_RE, ' ')
      .replace(SLASH_DATE_RE, ' ')
      .replace(VERSION_RE, ' ')
      .replace(LIST_INDEX_RE, '\n ');

    // Pre-filter 5: Remove known disclaimer text ranges so numbers within them are not checked
    for (const disclaimer of DISCLAIMER_TEXTS) {
      filteredText = filteredText.replace(
        disclaimer,
        ' '.repeat(disclaimer.length)
      );
    }

    if (signal?.aborted) return empty;

    // Step 2 & 3: Extract numbers and filter skip set
    const extractedNumbers = this.extractNumbers(
      filteredText,
      context.agentResponseText
    );
    const candidates = extractedNumbers.filter((n) => !this.shouldSkip(n));

    if (signal?.aborted) return this.buildResult([]);

    // Step 4: Build truth set from tool call outputs
    const truthSet = this.buildTruthSet(context.toolCalls);

    if (signal?.aborted) return this.buildResult([]);

    // Step 5: Compute derived values
    this.addDerivedValues(truthSet);

    if (signal?.aborted) return this.buildResult([]);

    // Step 6 & 7: Match and classify each number
    const details: NumberVerificationDetail[] = [];
    for (const num of candidates) {
      if (signal?.aborted) {
        candidates
          .slice(details.length)
          .forEach((n) =>
            details.push({ extractedNumber: n, status: 'UNVERIFIED' })
          );
        break;
      }
      details.push(this.matchSingle(num, truthSet));
    }

    return this.buildResult(details);
  }

  // --- Number extraction ---

  private extractNumbers(
    filteredText: string,
    originalText: string
  ): ExtractedNumber[] {
    const results: ExtractedNumber[] = [];
    const seen = new Set<number>();
    this.runRegex(NUMBER_RE, filteredText, originalText, results, seen);
    this.runRegex(CHF_NUMBER_RE, filteredText, originalText, results, seen);
    return results;
  }

  private runRegex(
    regex: RegExp,
    filteredText: string,
    originalText: string,
    results: ExtractedNumber[],
    seen: Set<number>
  ): void {
    regex.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(filteredText)) !== null) {
      const position = match.index;
      if (seen.has(position)) continue;

      const rawText = match[0].trim();
      if (!rawText || !/\d/.test(rawText)) continue;

      const isPercentage = rawText.endsWith('%');
      const isCurrency = /^[$€£¥]/.test(rawText) || /^CHF/i.test(rawText);

      const cleaned = rawText
        .replace(/[$€£¥%]/g, '')
        .replace(/^CHF\s*/i, '')
        .replace(/,/g, '')
        .replace(/\s/g, '');
      const normalizedValue = parseFloat(cleaned);
      if (isNaN(normalizedValue)) continue;

      const ctxStart = Math.max(0, position - CONTEXT_WINDOW);
      const ctxEnd = Math.min(
        originalText.length,
        position + rawText.length + CONTEXT_WINDOW
      );

      seen.add(position);
      results.push({
        rawText,
        normalizedValue,
        isPercentage,
        isCurrency,
        position,
        surroundingContext: originalText.slice(ctxStart, ctxEnd)
      });
    }
  }

  private shouldSkip(num: ExtractedNumber): boolean {
    const v = num.normalizedValue;
    if (SKIP_NUMBERS.has(v)) return true;
    if (Number.isInteger(v) && v >= SKIP_YEAR_MIN && v <= SKIP_YEAR_MAX)
      return true;
    return false;
  }

  // --- Truth set construction ---

  private buildTruthSet(
    toolCalls: VerificationContext['toolCalls']
  ): TruthSetEntry[] {
    const entries: TruthSetEntry[] = [];
    for (const call of toolCalls) {
      if (!call.success || call.outputData == null) continue;
      this.walkJson(call.outputData, call.toolName, '', entries);
    }
    return entries;
  }

  private walkJson(
    node: unknown,
    toolName: string,
    path: string,
    entries: TruthSetEntry[]
  ): void {
    if (node == null) return;

    if (typeof node === 'number' && isFinite(node)) {
      entries.push({ value: node, path, toolName });
      return;
    }
    if (typeof node === 'string') {
      const trimmed = node.trim();
      // Try parsing JSON strings (e.g., tool outputs wrapped in content blocks)
      if (
        (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
        (trimmed.startsWith('[') && trimmed.endsWith(']'))
      ) {
        try {
          const parsed = JSON.parse(trimmed);
          this.walkJson(parsed, toolName, path, entries);
          return;
        } catch {
          // Not valid JSON, fall through to number parsing
        }
      }
      const parsed = parseFloat(node);
      if (!isNaN(parsed) && isFinite(parsed) && /^-?\d/.test(trimmed)) {
        entries.push({ value: parsed, path, toolName });
      }
      return;
    }
    if (Array.isArray(node)) {
      for (let i = 0; i < node.length; i++) {
        this.walkJson(node[i], toolName, `${path}[${i}]`, entries);
      }
      return;
    }
    if (typeof node === 'object') {
      const obj = node as Record<string, unknown>;
      for (const key of Object.keys(obj)) {
        this.walkJson(
          obj[key],
          toolName,
          path ? `${path}.${key}` : key,
          entries
        );
      }
    }
  }

  /** Compute derived sums/totals from array fields in the truth set. */
  private addDerivedValues(truthSet: TruthSetEntry[]): void {
    const byTool = new Map<string, TruthSetEntry[]>();
    for (const entry of truthSet) {
      const list = byTool.get(entry.toolName) ?? [];
      list.push(entry);
      byTool.set(entry.toolName, list);
    }

    for (const [toolName, entries] of byTool) {
      // Group by array parent + field name for sums
      const arrayFields = new Map<string, number[]>();
      const allocFields = new Map<string, number[]>();

      for (const entry of entries) {
        const arrMatch = /^(.+)\[\d+\]\.([^.[]+)$/.exec(entry.path);
        if (arrMatch) {
          const key = `${arrMatch[1]}.*.${arrMatch[2]}`;
          (
            arrayFields.get(key) ??
            (() => {
              const a: number[] = [];
              arrayFields.set(key, a);
              return a;
            })()
          ).push(entry.value);

          // Separately track allocation-like fields
          if (/^(allocation|weight|percentage|share)$/i.test(arrMatch[2])) {
            (
              allocFields.get(key) ??
              (() => {
                const a: number[] = [];
                allocFields.set(key, a);
                return a;
              })()
            ).push(entry.value);
          }
        }
      }

      for (const [pattern, values] of arrayFields) {
        if (values.length >= 2) {
          const sum = values.reduce((a, b) => a + b, 0);
          truthSet.push({
            value: sum,
            path: `derived:sum(${pattern})`,
            toolName
          });

          // Derived differences: absolute difference between each pair
          for (let i = 0; i < values.length; i++) {
            for (let j = i + 1; j < values.length; j++) {
              truthSet.push({
                value: Math.abs(values[i] - values[j]),
                path: `derived:diff(${pattern}[${i}]-[${j}])`,
                toolName
              });
            }
          }

          // Derived percentages: each value as percentage of the sum
          if (sum !== 0) {
            for (let i = 0; i < values.length; i++) {
              truthSet.push({
                value: (values[i] / sum) * 100,
                path: `derived:pct(${pattern}[${i}]/sum)`,
                toolName
              });
            }
          }
        }
      }
      // Product derivations for rate-like values (exchange rates, multipliers)
      const rateEntries = entries.filter((e) => e.value > 0 && e.value < 10);
      const MAX_PRODUCT_DERIVATIONS = 50;
      let productCount = 0;
      for (const entry of rateEntries) {
        for (const other of entries) {
          if (other === entry) continue;
          if (productCount >= MAX_PRODUCT_DERIVATIONS) break;
          truthSet.push({
            value: entry.value * other.value,
            path: `derived:product(${entry.path}*${other.path})`,
            toolName
          });
          productCount++;
        }
        if (productCount >= MAX_PRODUCT_DERIVATIONS) break;
      }

      for (const [pattern, values] of allocFields) {
        if (values.length >= 2) {
          truthSet.push({
            value: values.reduce((a, b) => a + b, 0),
            path: `derived:total(${pattern})`,
            toolName
          });
        }
      }
    }
  }

  // --- Matching ---

  private matchSingle(
    num: ExtractedNumber,
    truthSet: TruthSetEntry[]
  ): NumberVerificationDetail {
    const ctx = num.surroundingContext.toLowerCase();
    const isApprox =
      /\b(approx(?:imately)?|about|around|roughly|nearly|~|estimated)\b/.test(
        ctx
      );
    const isConversion = /\b(convert|exchange|rate|forex|fx)\b/.test(ctx);

    for (const truth of truthSet) {
      // Direct match with context-aware tolerance
      if (this.valuesMatch(num, truth.value, isApprox, isConversion)) {
        const isDerived = truth.path.startsWith('derived:');
        return {
          extractedNumber: num,
          status: isDerived ? 'DERIVED' : 'VERIFIED',
          matchedTruthEntry: truth,
          derivation: isDerived ? truth.path : undefined
        };
      }

      // Decimal-to-percentage: 0.1523 in data <-> 15.23% in text
      if (num.isPercentage && !truth.path.startsWith('derived:')) {
        if (
          this.withinTolerance(num.normalizedValue / 100, truth.value, 0.001)
        ) {
          return {
            extractedNumber: num,
            status: 'VERIFIED',
            matchedTruthEntry: truth
          };
        }
      }

      // Inverse: data has percentage-like value, text shows decimal
      if (!num.isPercentage && truth.value > 0 && truth.value <= 100) {
        if (this.withinTolerance(num.normalizedValue * 100, truth.value, 0.1)) {
          return {
            extractedNumber: num,
            status: 'VERIFIED',
            matchedTruthEntry: truth
          };
        }
      }
    }

    return { extractedNumber: num, status: 'UNVERIFIED' };
  }

  private valuesMatch(
    num: ExtractedNumber,
    truthValue: number,
    isApprox: boolean,
    isConversion: boolean
  ): boolean {
    const v = num.normalizedValue;
    if (isApprox) return this.withinRelTolerance(v, truthValue, 0.05);
    if (isConversion) return this.withinRelTolerance(v, truthValue, 0.01);
    if (num.isCurrency) {
      return Math.abs(v) > 100
        ? this.withinRelTolerance(v, truthValue, 0.005)
        : this.withinTolerance(v, truthValue, 0.01);
    }
    if (num.isPercentage) return this.withinTolerance(v, truthValue, 0.1);
    if (Number.isInteger(v) && Number.isInteger(truthValue))
      return v === truthValue;
    return this.withinTolerance(v, truthValue, 0.01);
  }

  private withinTolerance(a: number, b: number, tol: number): boolean {
    return Math.abs(a - b) <= tol;
  }

  private withinRelTolerance(a: number, b: number, tol: number): boolean {
    if (b === 0) return a === 0;
    return Math.abs(a - b) / Math.abs(b) <= tol;
  }

  // --- Result assembly ---

  private buildResult(details: NumberVerificationDetail[]): FactCheckResult {
    let verifiedCount = 0;
    let unverifiedCount = 0;
    let derivedCount = 0;

    for (const d of details) {
      if (d.status === 'VERIFIED') verifiedCount++;
      else if (d.status === 'DERIVED') derivedCount++;
      else unverifiedCount++;
    }

    return {
      passed: unverifiedCount === 0,
      verifiedCount,
      unverifiedCount,
      derivedCount,
      details
    };
  }
}
