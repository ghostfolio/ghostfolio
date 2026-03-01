// Schema and format checks
import { Injectable } from '@nestjs/common';

import type {
  OutputValidationCorrection,
  OutputValidationIssue,
  OutputValidationResult,
  VerificationChecker,
  VerificationContext
} from './verification.interfaces';

// Currency amount: $1,234.56 or 1234.56 USD
const CURRENCY_RE =
  /\$\s?[\d,]+(?:\.\d+)?|\b\d[\d,]*\.\d+\s?(?:USD|EUR|GBP|CHF|JPY|CAD|AUD)\b/g;
const CURRENCY_STRIP_RE = /[$,\s]|USD|EUR|GBP|CHF|JPY|CAD|AUD/g;

// Percentage: 12.5%
const PERCENT_RE = /\b\d+(?:\.\d+)?\s?%/g;

// Potential ticker: 1-5 uppercase letters at word boundary
const TICKER_RE = /\b[A-Z]{1,5}\b/g;

// Common uppercase words/acronyms to ignore when detecting tickers
// prettier-ignore
const NON_TICKERS = new Set([
  'A','I','AM','AN','AND','ARE','AS','AT','BE','BY','DO','FOR','GO','HAS','HE',
  'IF','IN','IS','IT','ME','MY','NO','NOT','OF','ON','OR','OUR','SO','THE','TO',
  'UP','US','WE','ALL','ANY','BUT','CAN','DID','FEW','GOT','HAD','HAS','HER',
  'HIM','HIS','HOW','ITS','LET','MAY','NEW','NOR','NOW','OFF','OLD','ONE','OUR',
  'OUT','OWN','PUT','SAY','SET','SHE','TOO','USE','WAS','WHO','WHY','YET','YOU',
  'ALSO','BACK','BEEN','DOES','EACH','EVEN','FROM','GIVE','INTO','JUST','KEEP',
  'LIKE','LONG','LOOK','MADE','MAKE','MANY','MORE','MOST','MUCH','MUST','NEXT',
  'ONLY','OVER','PART','SAID','SAME','SOME','SUCH','TAKE','THAN','THAT','THEM',
  'THEN','THEY','THIS','VERY','WANT','WELL','WERE','WHAT','WHEN','WILL','WITH',
  'YOUR','TOTAL','PER','NET','YTD','ETF','API','CEO','CFO','IPO','GDP','ROI',
  'EPS','NAV','YOY','QOQ','MOM','USD','EUR','GBP','CHF','JPY','CAD','AUD',
]);

const MIN_LENGTH = 50;
const MAX_LENGTH = 5000;

@Injectable()
export class OutputValidator implements VerificationChecker {
  public readonly stageName = 'outputValidator';
  public validate(context: VerificationContext): OutputValidationResult {
    const issues: OutputValidationIssue[] = [];
    const corrections: OutputValidationCorrection[] = [];
    const { agentResponseText: text, toolCalls } = context;

    this.checkCurrencyFormatting(text, issues, corrections);
    this.checkPercentageFormatting(text, issues, corrections);
    this.checkSymbolReferences(text, toolCalls, issues);
    this.checkResponseLength(text, issues);
    this.checkDateFormatting(text, issues);
    this.checkResponseCompleteness(text, toolCalls, issues);

    return {
      passed: issues.length === 0,
      issues,
      ...(corrections.length > 0 ? { corrections } : {})
    };
  }

  private checkCurrencyFormatting(
    text: string,
    issues: OutputValidationIssue[],
    corrections: OutputValidationCorrection[]
  ): void {
    const re = new RegExp(CURRENCY_RE.source, CURRENCY_RE.flags);
    let match: RegExpExecArray | null;
    while ((match = re.exec(text)) !== null) {
      const raw = match[0];
      const numeric = raw.replace(CURRENCY_STRIP_RE, '');
      const dot = numeric.indexOf('.');
      if (dot === -1) continue; // whole amount, acceptable
      const decimals = numeric.length - dot - 1;
      if (decimals !== 2) {
        issues.push({
          checkId: 'currency_format',
          description: `Currency amount "${raw}" should use exactly 2 decimal places`,
          severity: 'warning'
        });
        // Auto-correct: round to 2 decimal places
        const correctedNumeric = parseFloat(numeric).toFixed(2);
        const corrected = raw.replace(numeric, correctedNumeric);
        corrections.push({
          original: raw,
          corrected,
          checkId: 'currency_format'
        });
      }
    }
  }

  private checkPercentageFormatting(
    text: string,
    issues: OutputValidationIssue[],
    corrections: OutputValidationCorrection[]
  ): void {
    const re = new RegExp(PERCENT_RE.source, PERCENT_RE.flags);
    let match: RegExpExecArray | null;
    while ((match = re.exec(text)) !== null) {
      const raw = match[0];
      const numeric = raw.replace(/[%\s]/g, '');
      const dot = numeric.indexOf('.');
      if (dot === -1) continue; // whole percentage, acceptable
      const decimals = numeric.length - dot - 1;
      if (decimals < 1 || decimals > 2) {
        issues.push({
          checkId: 'percentage_format',
          description: `Percentage "${raw}" should use 1-2 decimal places`,
          severity: 'warning'
        });
        // Auto-correct: round to 2 decimal places
        const correctedNumeric = parseFloat(numeric).toFixed(2);
        const corrected = raw.replace(numeric, correctedNumeric);
        corrections.push({
          original: raw,
          corrected,
          checkId: 'percentage_format'
        });
      }
    }
  }

  private checkSymbolReferences(
    text: string,
    toolCalls: VerificationContext['toolCalls'],
    issues: OutputValidationIssue[]
  ): void {
    const known = new Set<string>();
    for (const call of toolCalls) {
      if (call.success && call.outputData != null) {
        this.extractSymbols(call.outputData, known);
      }
    }
    if (known.size === 0) return;

    const unknown = new Set<string>();
    const tickerRe = new RegExp(TICKER_RE.source, TICKER_RE.flags);
    let tickerMatch: RegExpExecArray | null;
    while ((tickerMatch = tickerRe.exec(text)) !== null) {
      const t = tickerMatch[0];
      if (t.length >= 2 && !NON_TICKERS.has(t) && !known.has(t)) {
        unknown.add(t);
      }
    }
    unknown.forEach((sym) => {
      issues.push({
        checkId: 'symbol_reference',
        description: `Symbol "${sym}" referenced in response was not found in tool result data`,
        severity: 'warning'
      });
    });
  }

  private extractSymbols(data: unknown, out: Set<string>): void {
    if (data == null) return;
    if (typeof data === 'string') {
      const re = new RegExp(TICKER_RE.source, TICKER_RE.flags);
      let m: RegExpExecArray | null;
      while ((m = re.exec(data)) !== null) {
        if (!NON_TICKERS.has(m[0])) out.add(m[0]);
      }
      return;
    }
    if (Array.isArray(data)) {
      for (const item of data) this.extractSymbols(item, out);
      return;
    }
    if (typeof data === 'object') {
      const obj = data as Record<string, unknown>;
      for (const key of ['symbol', 'ticker', 'code', 'name']) {
        if (typeof obj[key] === 'string') out.add(obj[key] as string);
      }
      for (const val of Object.values(obj)) this.extractSymbols(val, out);
    }
  }

  private checkResponseLength(
    text: string,
    issues: OutputValidationIssue[]
  ): void {
    const len = text.length;
    if (len < MIN_LENGTH) {
      issues.push({
        checkId: 'response_length',
        description: `Response length (${len} chars) is below minimum of ${MIN_LENGTH} characters`,
        severity: 'warning'
      });
    } else if (len > MAX_LENGTH) {
      issues.push({
        checkId: 'response_length',
        description: `Response length (${len} chars) exceeds maximum of ${MAX_LENGTH} characters`,
        severity: 'warning'
      });
    }
  }

  private checkDateFormatting(
    text: string,
    issues: OutputValidationIssue[]
  ): void {
    const isoDatePattern = /\b\d{4}-\d{2}-\d{2}\b/g;
    const slashDatePattern = /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g;
    const hasIso = isoDatePattern.test(text);
    const hasSlash = slashDatePattern.test(text);
    if (hasIso && hasSlash) {
      issues.push({
        checkId: 'date_format',
        description:
          'Mixed date formats detected (ISO and slash-separated). Use consistent formatting.',
        severity: 'warning'
      });
    }
  }

  private checkResponseCompleteness(
    text: string,
    toolCalls: VerificationContext['toolCalls'],
    issues: OutputValidationIssue[]
  ): void {
    for (const call of toolCalls) {
      if (!call.success || call.outputData == null) continue;
      if (Array.isArray(call.outputData)) {
        const holdingCount = call.outputData.length;
        if (holdingCount > 0 && holdingCount <= 20) {
          // Count how many items from the array are referenced
          const symbols = new Set<string>();
          for (const item of call.outputData) {
            if (item && typeof item === 'object') {
              const sym =
                (item as Record<string, unknown>).symbol ??
                (item as Record<string, unknown>).name;
              if (typeof sym === 'string') symbols.add(sym);
            }
          }
          if (symbols.size > 0) {
            let referenced = 0;
            symbols.forEach((sym) => {
              if (text.includes(sym)) referenced++;
            });
            if (referenced > 0 && referenced < symbols.size * 0.5) {
              issues.push({
                checkId: 'response_completeness',
                description: `Response references ${referenced} of ${symbols.size} items from tool results. Some items may be missing.`,
                severity: 'warning'
              });
            }
          }
        }
      }
    }
  }
}
