// Claim extraction, grounding check, classification
import { Injectable } from '@nestjs/common';

import type {
  ClaimDetail,
  HallucinationResult,
  VerificationChecker,
  VerificationContext
} from './verification.interfaces';

const ABBREVIATION_RE =
  /(?:Mr|Mrs|Ms|Dr|Prof|Sr|Jr|vs|e\.g|i\.e|etc|approx|avg|inc|ltd|corp|est)\.\s*/gi;
const DATE_RE =
  /\b(?:\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{2,4}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+\d{1,2}(?:,?\s+\d{4})?)\b/i;
const FINANCIAL_VALUE_RE =
  /\b(?:high|medium|low|moderate|significant|strong|weak|positive|negative|bullish|bearish)\s+(?:risk|return|performance|growth|allocation|exposure|volatility|correlation)\b/i;
const ORDINAL_RE =
  /\b(?:largest|smallest|biggest|highest|lowest|majority|most|least|primary|top|bottom)\b/i;

const TICKER_STOPWORDS = new Set([
  'A',
  'I',
  'AM',
  'AN',
  'AS',
  'AT',
  'BE',
  'BY',
  'DO',
  'GO',
  'IF',
  'IN',
  'IS',
  'IT',
  'ME',
  'MY',
  'NO',
  'OF',
  'OK',
  'ON',
  'OR',
  'SO',
  'TO',
  'UP',
  'US',
  'WE',
  'THE',
  'AND',
  'FOR',
  'ARE',
  'BUT',
  'NOT',
  'YOU',
  'ALL',
  'CAN',
  'HER',
  'WAS',
  'ONE',
  'OUR',
  'OUT',
  'HAS',
  'HIS',
  'HOW',
  'ITS',
  'LET',
  'MAY',
  'NEW',
  'NOW',
  'OLD',
  'SEE',
  'WAY',
  'WHO',
  'DID',
  'GET',
  'HIM',
  'HAD',
  'SAY',
  'SHE',
  'USE',
  'THAN',
  'EACH',
  'MAKE',
  'LIKE',
  'HAVE',
  'BEEN',
  'MOST',
  'ONLY',
  'OVER',
  'SUCH',
  'TAKE',
  'WITH',
  'THEM',
  'SOME',
  'THAT',
  'THEY',
  'THIS',
  'VERY',
  'WHEN',
  'WHAT',
  'YOUR',
  'WILL',
  'FROM',
  'HIGH',
  'LOW',
  'USD',
  'EUR',
  'GBP',
  'CHF',
  'JPY',
  'ETF',
  'IPO',
  'CEO',
  'CFO',
  'ROI',
  'GDP',
  'API',
  'ESG',
  'NAV',
  'YTD',
  'QTD',
  'MTD',
  'P',
  'Q',
  'R',
  'S',
  'T',
  'U',
  'V',
  'W',
  'X',
  'Y',
  'Z'
]);

const EXEMPT_RULES: { patterns: RegExp[]; reason: string }[] = [
  {
    reason: 'Disclaimer statement',
    patterns: [
      /not\s+financial\s+advice/i,
      /past\s+performance/i,
      /consult\s+(?:a\s+)?(?:financial|professional|tax)/i,
      /for\s+informational\s+purposes/i,
      /does\s+not\s+constitute/i,
      /no\s+guarantee/i
    ]
  },
  {
    reason: 'Meta-statement about data source',
    patterns: [
      /^based\s+on\s+(?:your|the)\s+(?:portfolio|data|account)/i,
      /^(?:looking|according)\s+(?:at|to)\s+(?:your|the)/i,
      /^(?:here(?:'s| is)|let me|i (?:can|don't|cannot|do not|will))/i,
      /^(?:from|using)\s+(?:your|the)\s+(?:data|portfolio|tool)/i
    ]
  },
  {
    reason: 'General financial knowledge',
    patterns: [
      /diversification\s+(?:reduces|lowers|minimizes|helps)/i,
      /(?:compound|compounding)\s+(?:interest|returns|growth)/i,
      /(?:higher|more)\s+risk.*(?:higher|more)\s+(?:return|reward)/i,
      /markets?\s+(?:are|can\s+be)\s+(?:volatile|unpredictable)/i,
      /dollar[\s-]cost\s+averaging/i
    ]
  },
  {
    reason: 'Logical connective',
    patterns: [
      /^(?:therefore|thus|hence|consequently|accordingly|as\s+a\s+result)/i,
      /^(?:this\s+means|this\s+suggests|this\s+indicates|in\s+other\s+words)/i,
      /^(?:in\s+summary|overall|to\s+summarize|in\s+conclusion)/i,
      /^(?:however|nevertheless|on\s+the\s+other\s+hand|that\s+said)/i,
      /^(?:additionally|furthermore|moreover|also|note\s+that)/i
    ]
  },
  {
    reason: 'Currency conversion context',
    patterns: [
      /^(?:at|using|with)\s+(?:the|a|an)\s+(?:current|latest|today)/i,
      /^(?:the\s+)?(?:exchange|conversion)\s+rate/i,
      /^(?:this|that)\s+(?:equals|is\s+equivalent|converts?\s+to|amounts?\s+to)/i
    ]
  },
  {
    reason: 'Data presentation',
    patterns: [
      /^(?:here|below)\s+(?:is|are)\s+(?:the|your)/i,
      /^(?:the\s+)?(?:total|sum|balance|value|amount)\s+(?:is|comes?\s+to|equals?)/i,
      /^(?:as\s+of|updated)\s+/i
    ]
  }
];

const CURRENCY_TOL = 0.01;
const PERCENTAGE_TOL = 0.1;

interface DataPoints {
  numbers: number[];
  isPercentage: boolean[];
  tickers: string[];
  namedEntities: string[];
  hasDate: boolean;
  hasFinancialValue: boolean;
  hasOrdinal: boolean;
}

@Injectable()
export class HallucinationDetector implements VerificationChecker {
  public readonly stageName = 'hallucinationDetector';
  public detect(
    context: VerificationContext,
    signal?: AbortSignal
  ): HallucinationResult {
    const { agentResponseText, toolCalls } = context;
    const toolStrings = new Set<string>();
    const toolNumbers: number[] = [];
    for (const tc of toolCalls)
      this.walkValue(tc.outputData, toolStrings, toolNumbers);

    if (signal?.aborted) return this.empty();

    const sentences = this.splitSentences(agentResponseText);
    const details: ClaimDetail[] = [];

    for (const raw of sentences) {
      if (signal?.aborted) return this.empty();
      const s = raw.trim();
      if (s.length < 3) continue;

      const exemptReason = this.checkExempt(s);
      if (exemptReason) {
        details.push({ text: s, grounding: 'EXEMPT', reason: exemptReason });
        continue;
      }

      const dp = this.extractDataPoints(s);
      if (
        dp.numbers.length === 0 &&
        dp.tickers.length === 0 &&
        dp.namedEntities.length === 0 &&
        !dp.hasDate &&
        !dp.hasFinancialValue
      ) {
        details.push({
          text: s,
          grounding: 'EXEMPT',
          reason: 'No verifiable data points'
        });
        continue;
      }
      details.push(this.groundClaim(s, dp, toolStrings, toolNumbers));
    }

    if (signal?.aborted) return this.empty();

    let grounded = 0,
      ungrounded = 0,
      partial = 0,
      exempt = 0;
    const flagged: string[] = [];
    for (const d of details) {
      if (d.grounding === 'GROUNDED') grounded++;
      else if (d.grounding === 'UNGROUNDED') {
        ungrounded++;
        flagged.push(d.text);
      } else if (d.grounding === 'PARTIALLY_GROUNDED') partial++;
      else exempt++;
    }

    const denom = details.length - exempt;
    const rate = denom > 0 ? ungrounded / denom : 0;

    return {
      detected: ungrounded > 0,
      rate: Math.round(rate * 1000) / 1000,
      totalClaims: details.length,
      groundedClaims: grounded,
      ungroundedClaims: ungrounded,
      partiallyGroundedClaims: partial,
      exemptClaims: exempt,
      flaggedClaims: flagged,
      details
    };
  }

  // -- Sentence splitting --------------------------------------------------

  private splitSentences(text: string): string[] {
    let proc = text;
    const abbrs: string[] = [];
    const PH_ABBR_START = '<<ABBR:';
    const PH_ABBR_END = '>>';
    const PH_DOT = '<<DOT>>';
    proc = proc.replace(ABBREVIATION_RE, (m) => {
      abbrs.push(m);
      return `${PH_ABBR_START}${abbrs.length - 1}${PH_ABBR_END}`;
    });
    proc = proc.replace(/(\d)\.(\d)/g, `$1${PH_DOT}$2`);

    const parts = proc.split(/(?<=[.!?])\s+(?=[A-Z<])|(?<=[.!?])$/);

    return parts
      .map((s) => {
        let r = s.replace(/<<DOT>>/g, '.');
        r = r.replace(/<<ABBR:(\d+)>>/g, (_, i) => abbrs[Number(i)]);
        return r.trim();
      })
      .filter((s) => s.length > 0);
  }

  // -- Exempt check --------------------------------------------------------

  private checkExempt(sentence: string): string | null {
    for (const rule of EXEMPT_RULES) {
      for (const p of rule.patterns) {
        if (p.test(sentence)) return rule.reason;
      }
    }
    return null;
  }

  // -- Data point extraction -----------------------------------------------

  private extractDataPoints(sentence: string): DataPoints {
    const numbers: number[] = [];
    const isPercentage: boolean[] = [];
    const numRe = /[$€£¥]?\s*(-?\d[\d,]*\.?\d*)\s*(%)?/g;
    let m: RegExpExecArray | null;
    while ((m = numRe.exec(sentence)) !== null) {
      const val = parseFloat(m[1].replace(/,/g, ''));
      if (!isNaN(val)) {
        numbers.push(val);
        isPercentage.push(m[2] === '%');
      }
    }

    const tickers: string[] = [];
    const tickRe = /\b([A-Z]{1,5})\b/g;
    while ((m = tickRe.exec(sentence)) !== null) {
      if (!TICKER_STOPWORDS.has(m[1])) tickers.push(m[1]);
    }

    // Extract multi-word proper nouns (e.g., account/platform names like "Interactive Brokers")
    const namedEntities: string[] = [];
    const namedEntityRe = /\b([A-Z][a-zA-Z]*(?:\s+[A-Z][a-zA-Z]*)+)\b/g;
    while ((m = namedEntityRe.exec(sentence)) !== null) {
      if (m[1].length > 5) namedEntities.push(m[1]);
    }

    return {
      numbers,
      isPercentage,
      tickers,
      namedEntities,
      hasDate: DATE_RE.test(sentence),
      hasFinancialValue: FINANCIAL_VALUE_RE.test(sentence),
      hasOrdinal: ORDINAL_RE.test(sentence)
    };
  }

  // -- Grounding -----------------------------------------------------------

  private groundClaim(
    sentence: string,
    dp: DataPoints,
    toolStrings: Set<string>,
    toolNumbers: number[]
  ): ClaimDetail {
    let matched = 0,
      total = 0;

    for (let i = 0; i < dp.numbers.length; i++) {
      total++;
      if (this.numInTools(dp.numbers[i], dp.isPercentage[i], toolNumbers))
        matched++;
    }
    for (const t of dp.tickers) {
      total++;
      if (this.strInTools(t, toolStrings)) matched++;
    }
    for (const ne of dp.namedEntities) {
      total++;
      if (this.strInTools(ne, toolStrings)) matched++;
    }
    if (dp.hasDate) {
      total++;
      matched++;
    } // dates generally sourced from tools
    if (dp.hasFinancialValue) {
      total++;
      if (this.isValidSynthesis(sentence, toolNumbers)) matched++;
    }

    if (total === 0) {
      return dp.hasOrdinal
        ? {
            text: sentence,
            grounding: 'EXEMPT',
            reason: 'Ordinal description of data'
          }
        : {
            text: sentence,
            grounding: 'EXEMPT',
            reason: 'No verifiable data points'
          };
    }
    if (matched === 0 && dp.hasOrdinal) {
      return {
        text: sentence,
        grounding: 'GROUNDED',
        reason: 'Valid ordinal synthesis from tool data'
      };
    }
    if (matched === total) {
      return {
        text: sentence,
        grounding: 'GROUNDED',
        reason: `All ${total} data point(s) found in tool results`
      };
    }
    if (matched === 0) {
      if (this.isValidSynthesis(sentence, toolNumbers)) {
        return {
          text: sentence,
          grounding: 'GROUNDED',
          reason: 'Valid synthesis from tool data'
        };
      }
      return {
        text: sentence,
        grounding: 'UNGROUNDED',
        reason: `0 of ${total} data point(s) found in tool results`
      };
    }
    return {
      text: sentence,
      grounding: 'PARTIALLY_GROUNDED',
      reason: `${matched} of ${total} data point(s) found in tool results`
    };
  }

  // -- Numeric matching with tolerance -------------------------------------

  private numInTools(
    value: number,
    isPct: boolean,
    toolNums: number[]
  ): boolean {
    const tol = isPct ? PERCENTAGE_TOL : CURRENCY_TOL;
    for (const tn of toolNums) {
      if (Math.abs(value - tn) <= tol) return true;
      // Percentage <-> decimal: 15.23% might appear as 0.1523 in tool data
      if (isPct && Math.abs(value / 100 - tn) <= 0.001) return true;
      if (!isPct && Math.abs(value * 100 - tn) <= PERCENTAGE_TOL) return true;
      // Approximate match (within 5% relative)
      if (tn !== 0 && Math.abs((value - tn) / tn) <= 0.05) return true;
    }
    return false;
  }

  // -- String matching (case-insensitive) ----------------------------------

  private strInTools(candidate: string, toolStrings: Set<string>): boolean {
    const lower = candidate.toLowerCase();
    for (const ts of toolStrings) {
      const tl = ts.toLowerCase();
      if (tl === lower || tl.includes(lower)) return true;
    }
    return false;
  }

  // -- Valid synthesis check ------------------------------------------------

  private isValidSynthesis(sentence: string, toolNums: number[]): boolean {
    const s = sentence.toLowerCase();
    if (/\b(?:equity|stock)[\s-]*heavy\b/.test(s))
      return toolNums.some((n) => n > 60);
    if (/\bpositive\s+(?:performance|return|growth)\b/.test(s))
      return toolNums.some((n) => n > 0);
    if (/\bnegative\s+(?:performance|return|growth)\b/.test(s))
      return toolNums.some((n) => n < 0);
    if (/\b(?:high|significant|elevated)\s+risk\b/.test(s))
      return toolNums.length > 0;
    if (/\b(?:well[\s-]*)?diversified\b/.test(s)) return toolNums.length > 0;
    if (/\bconcentrated\b/.test(s)) return toolNums.some((n) => n > 40);
    return false;
  }

  // -- Recursive tool data extraction --------------------------------------

  private walkValue(
    value: unknown,
    strings: Set<string>,
    numbers: number[]
  ): void {
    if (value === null || value === undefined) return;
    if (typeof value === 'number' && isFinite(value)) {
      numbers.push(value);
      return;
    }
    if (typeof value === 'string') {
      const trimmed = value.trim();
      // Try parsing JSON strings (e.g., tool outputs wrapped in content blocks)
      if (
        (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
        (trimmed.startsWith('[') && trimmed.endsWith(']'))
      ) {
        try {
          const parsed = JSON.parse(trimmed);
          this.walkValue(parsed, strings, numbers);
          return;
        } catch {
          // Not valid JSON, fall through
        }
      }
      strings.add(value);
      const n = parseFloat(value);
      if (!isNaN(n) && isFinite(n)) numbers.push(n);
      return;
    }
    if (Array.isArray(value)) {
      for (const v of value) this.walkValue(v, strings, numbers);
      return;
    }
    if (typeof value === 'object') {
      for (const v of Object.values(value as Record<string, unknown>))
        this.walkValue(v, strings, numbers);
    }
  }

  // -- Default empty result ------------------------------------------------

  private empty(): HallucinationResult {
    return {
      detected: false,
      rate: 0,
      totalClaims: 0,
      groundedClaims: 0,
      ungroundedClaims: 0,
      partiallyGroundedClaims: 0,
      exemptClaims: 0,
      flaggedClaims: [],
      details: []
    };
  }
}
