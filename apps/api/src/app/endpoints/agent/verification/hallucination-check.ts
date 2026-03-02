export interface ToolResult {
  toolName: string;
  result: unknown;
}

export interface HallucinationCheckResult {
  clean: boolean;
  score: number;
  issues: string[];
}

/**
 * Deterministic hallucination detection.
 * Checks that the response doesn't reference data not present in tool results.
 */
export function checkHallucination({
  text,
  toolResults
}: {
  text: string;
  toolResults: ToolResult[];
}): HallucinationCheckResult {
  const issues: string[] = [];
  let checks = 0;
  let passed = 0;

  if (toolResults.length === 0) {
    return { clean: true, score: 1, issues: [] };
  }

  const toolDataStr = JSON.stringify(toolResults.map((tr) => tr.result));

  // Check: ticker symbols in response should exist in tool data
  const tickerMatches = text.match(/\b[A-Z]{2,5}\b/g) ?? [];
  const toolTickers = extractTickers(toolDataStr);
  const knownNonTickers = new Set([
    'THE',
    'AND',
    'FOR',
    'NOT',
    'YOU',
    'ARE',
    'HAS',
    'WAS',
    'ALL',
    'CAN',
    'HAD',
    'HER',
    'ONE',
    'OUR',
    'OUT',
    'HIS',
    'HOW',
    'ITS',
    'MAY',
    'NEW',
    'NOW',
    'OLD',
    'SEE',
    'WAY',
    'WHO',
    'DID',
    'GET',
    'LET',
    'SAY',
    'SHE',
    'TOO',
    'USE',
    'YTD',
    'USD',
    'ETF',
    'IPO',
    'CEO',
    'CFO',
    'ROI',
    'EPS',
    'ATH',
    'APR',
    'FEB',
    'MAR',
    'JAN',
    'JUN',
    'JUL',
    'AUG',
    'SEP',
    'OCT',
    'NOV',
    'DEC'
  ]);

  if (tickerMatches.length > 0) {
    checks++;
    const unknownTickers = tickerMatches.filter(
      (t) => !toolTickers.has(t) && !knownNonTickers.has(t)
    );
    if (unknownTickers.length === 0) {
      passed++;
    } else {
      // Only flag if many unknown tickers (some might be abbreviations)
      const ratio = unknownTickers.length / tickerMatches.length;
      if (ratio > 0.5) {
        issues.push(
          `Possible hallucinated tickers: ${unknownTickers.slice(0, 5).join(', ')}`
        );
      } else {
        passed++;
      }
    }
  }

  // Check: dollar amounts in response should approximately match tool data
  const responseDollars = extractDollarAmounts(text);
  const toolDollars = extractDollarAmounts(toolDataStr);

  if (responseDollars.length > 0 && toolDollars.length > 0) {
    checks++;
    const unmatchedAmounts = responseDollars.filter(
      (rd) => !toolDollars.some((td) => isApproximateMatch(rd, td))
    );
    if (unmatchedAmounts.length === 0) {
      passed++;
    } else {
      const ratio = unmatchedAmounts.length / responseDollars.length;
      if (ratio > 0.5) {
        issues.push(
          `Dollar amounts not found in tool data: ${unmatchedAmounts
            .slice(0, 3)
            .map((a) => `$${a}`)
            .join(', ')}`
        );
      } else {
        passed++;
      }
    }
  }

  // Check: no claims about holdings not in tool results
  const holdingSymbols = extractHoldingSymbols(toolResults);
  if (holdingSymbols.size > 0) {
    checks++;
    // Look for "you hold X" or "your X position" patterns referencing unknown symbols
    const holdingClaims =
      text.match(
        /(?:you (?:hold|own|have)|your .+ position|holding of)\s+([A-Z]{2,5})/gi
      ) ?? [];
    const claimedSymbols = holdingClaims
      .map((m) => {
        const match = m.match(/([A-Z]{2,5})$/);
        return match?.[1];
      })
      .filter(Boolean) as string[];

    const unknownHoldings = claimedSymbols.filter(
      (s) => !holdingSymbols.has(s)
    );
    if (unknownHoldings.length === 0) {
      passed++;
    } else {
      issues.push(
        `Claims about holdings not in data: ${unknownHoldings.join(', ')}`
      );
    }
  }

  const score = checks > 0 ? passed / checks : 1;

  return {
    clean: issues.length === 0,
    score,
    issues
  };
}

function extractTickers(str: string): Set<string> {
  const matches = str.match(/\b[A-Z]{2,5}\b/g) ?? [];
  return new Set(matches);
}

function extractDollarAmounts(str: string): number[] {
  const matches = str.match(/\$[\d,]+(?:\.\d{1,2})?/g) ?? [];
  return matches.map((m) => parseFloat(m.replace(/[$,]/g, '')));
}

function isApproximateMatch(a: number, b: number): boolean {
  if (a === 0 && b === 0) return true;
  const diff = Math.abs(a - b);
  const max = Math.max(Math.abs(a), Math.abs(b));
  // Allow 5% tolerance or $1 absolute
  return diff / max < 0.05 || diff < 1;
}

function extractHoldingSymbols(toolResults: ToolResult[]): Set<string> {
  const symbols = new Set<string>();

  for (const tr of toolResults) {
    if (
      tr.toolName === 'holdings_lookup' ||
      tr.toolName === 'portfolio_analysis'
    ) {
      const str = JSON.stringify(tr.result);
      const matches = str.match(/"symbol"\s*:\s*"([^"]+)"/g) ?? [];
      for (const m of matches) {
        const sym = /"symbol"\s*:\s*"([^"]+)"/.exec(m)?.[1];
        if (sym) symbols.add(sym);
      }
    }
  }

  return symbols;
}
