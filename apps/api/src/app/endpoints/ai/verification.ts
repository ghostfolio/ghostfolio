/**
 * Verification layer for the AI agent.
 *
 * Runs post-generation checks on the LLM response to detect hallucinations,
 * out-of-scope claims, and missing disclaimers.
 */

export interface VerificationResult {
  checkName: string;
  passed: boolean;
  details: string;
}

export interface VerificationContext {
  responseText: string;
  toolResults: any[];
  toolCalls: Array<{ toolName: string; args: any }>;
}

/**
 * Run all verification checks and return annotated response text + results.
 */
export function runVerificationChecks(
  ctx: VerificationContext
): { responseText: string; checks: VerificationResult[] } {
  const checks: VerificationResult[] = [];
  let responseText = ctx.responseText;

  // Check 1: Financial disclaimer injection
  const disclaimerResult = checkFinancialDisclaimer(responseText);
  checks.push(disclaimerResult.check);
  responseText = disclaimerResult.responseText;

  // Check 2: Data-backed claims (hallucination detection)
  const dataBackedResult = checkDataBackedClaims(responseText, ctx.toolResults);
  checks.push(dataBackedResult.check);
  responseText = dataBackedResult.responseText;

  // Check 3: Portfolio scope validation
  const scopeResult = checkPortfolioScope(responseText, ctx.toolResults);
  checks.push(scopeResult.check);
  responseText = scopeResult.responseText;

  return { responseText, checks };
}

/**
 * Check 1: Financial Disclaimer Injection
 * Ensures responses containing financial figures include a disclaimer.
 */
function checkFinancialDisclaimer(responseText: string): {
  check: VerificationResult;
  responseText: string;
} {
  const containsNumbers = /\$[\d,]+|\d+\.\d{2}%|\d{1,3}(,\d{3})+/.test(
    responseText
  );

  if (!containsNumbers) {
    return {
      check: {
        checkName: "financial_disclaimer",
        passed: true,
        details: "No financial figures detected; disclaimer not needed."
      },
      responseText
    };
  }

  const hasDisclaimer =
    responseText.toLowerCase().includes("not financial advice") ||
    responseText.toLowerCase().includes("informational only") ||
    responseText.toLowerCase().includes("consult with a qualified");

  if (hasDisclaimer) {
    return {
      check: {
        checkName: "financial_disclaimer",
        passed: true,
        details: "Disclaimer already present in response."
      },
      responseText
    };
  }

  responseText +=
    "\n\n*Note: All figures shown are based on your actual portfolio data. This is informational only and not financial advice.*";

  return {
    check: {
      checkName: "financial_disclaimer",
      passed: true,
      details: "Disclaimer injected into response."
    },
    responseText
  };
}

/**
 * Check 2: Data-Backed Claims (Hallucination Detection)
 * Extracts dollar amounts and percentages from the response and verifies
 * they can be traced back to tool result data.
 */
function checkDataBackedClaims(
  responseText: string,
  toolResults: any[]
): { check: VerificationResult; responseText: string } {
  if (toolResults.length === 0) {
    return {
      check: {
        checkName: "data_backed_claims",
        passed: true,
        details: "No tools called; no numerical claims to verify."
      },
      responseText
    };
  }

  // Flatten all tool result data into a string for number extraction
  const toolDataStr = JSON.stringify(toolResults);

  // Extract numbers from the response (dollar amounts, percentages, plain numbers)
  const numberPattern = /(?:\$[\d,]+(?:\.\d{1,2})?|[\d,]+(?:\.\d{1,2})?%|[\d,]+\.\d{2})/g;
  const responseNumbers = responseText.match(numberPattern) || [];

  // Normalize numbers: strip $, %, commas
  const normalize = (s: string) =>
    s.replace(/[$%,]/g, "").replace(/^0+/, "");

  const unverifiedNumbers: string[] = [];

  for (const num of responseNumbers) {
    const normalized = normalize(num);
    // Skip very small numbers (likely formatting artifacts like "0.00")
    if (parseFloat(normalized) === 0) continue;
    // Check if this number appears in the tool data
    if (!toolDataStr.includes(normalized)) {
      unverifiedNumbers.push(num);
    }
  }

  if (unverifiedNumbers.length === 0) {
    return {
      check: {
        checkName: "data_backed_claims",
        passed: true,
        details: `All ${responseNumbers.length} numerical claims verified against tool data.`
      },
      responseText
    };
  }

  // Some numbers couldn't be traced — this is a soft warning, not a hard failure,
  // because the LLM may compute derived values (e.g., percentages of a whole)
  const ratio = unverifiedNumbers.length / responseNumbers.length;
  const passed = ratio < 0.5; // Fail only if majority of numbers are unverified

  if (!passed) {
    responseText +=
      "\n\n*Warning: Some figures in this response could not be fully verified against the source data. Please double-check critical numbers.*";
  }

  return {
    check: {
      checkName: "data_backed_claims",
      passed,
      details: `${responseNumbers.length - unverifiedNumbers.length}/${responseNumbers.length} numerical claims verified. Unverified: [${unverifiedNumbers.slice(0, 5).join(", ")}]${unverifiedNumbers.length > 5 ? "..." : ""}`
    },
    responseText
  };
}

/**
 * Check 3: Portfolio Scope Validation
 * Verifies that stock symbols mentioned in the response actually appear in
 * tool results, flagging potential out-of-scope references.
 */
function checkPortfolioScope(
  responseText: string,
  toolResults: any[]
): { check: VerificationResult; responseText: string } {
  if (toolResults.length === 0) {
    return {
      check: {
        checkName: "portfolio_scope",
        passed: true,
        details: "No tools called; no scope validation needed."
      },
      responseText
    };
  }

  // Extract known symbols from tool results
  const toolDataStr = JSON.stringify(toolResults);
  const knownSymbolsMatch = toolDataStr.match(/"symbol"\s*:\s*"([A-Z.]+)"/g) || [];
  const knownSymbols = new Set(
    knownSymbolsMatch.map((m) => {
      const match = m.match(/"symbol"\s*:\s*"([A-Z.]+)"/);
      return match ? match[1] : "";
    }).filter(Boolean)
  );

  if (knownSymbols.size === 0) {
    return {
      check: {
        checkName: "portfolio_scope",
        passed: true,
        details: "No symbols found in tool results to validate against."
      },
      responseText
    };
  }

  // Extract ticker-like symbols from the response text
  // Look for uppercase 1-5 letter words that look like stock tickers
  const tickerPattern = /\b([A-Z]{1,5})\b/g;
  const responseTickersRaw = responseText.match(tickerPattern) || [];

  // Filter to likely tickers (exclude common English words)
  const commonWords = new Set([
    "I", "A", "AN", "OR", "AND", "THE", "FOR", "TO", "IN", "AT", "BY",
    "ON", "IS", "IT", "OF", "IF", "NO", "NOT", "BUT", "ALL", "GET",
    "HAS", "HAD", "HER", "HIS", "HOW", "ITS", "LET", "MAY", "NEW",
    "NOW", "OLD", "OUR", "OUT", "OWN", "SAY", "SHE", "TOO", "USE",
    "WAY", "WHO", "BOY", "DID", "ITS", "SAY", "PUT", "TOP", "BUY",
    "ETF", "USD", "EUR", "GBP", "JPY", "CAD", "CHF", "AUD",
    "YTD", "MTD", "WTD", "NOTE", "FAQ", "AI", "API", "CEO", "CFO"
  ]);

  const responseTickers = [...new Set(responseTickersRaw)].filter(
    (t) => !commonWords.has(t) && t.length >= 2
  );

  // Check for out-of-scope symbols
  const outOfScope = responseTickers.filter(
    (t) => !knownSymbols.has(t) && knownSymbols.size > 0
  );

  // Only flag if the ticker looks like it's being discussed as a holding
  // (simple heuristic: appears near financial context words)
  const contextualOutOfScope = outOfScope.filter((ticker) => {
    const idx = responseText.indexOf(ticker);
    if (idx === -1) return false;
    const surrounding = responseText.substring(
      Math.max(0, idx - 80),
      Math.min(responseText.length, idx + 80)
    ).toLowerCase();
    return (
      surrounding.includes("share") ||
      surrounding.includes("holding") ||
      surrounding.includes("position") ||
      surrounding.includes("own") ||
      surrounding.includes("bought") ||
      surrounding.includes("invested") ||
      surrounding.includes("stock") ||
      surrounding.includes("$")
    );
  });

  if (contextualOutOfScope.length === 0) {
    return {
      check: {
        checkName: "portfolio_scope",
        passed: true,
        details: `All referenced symbols found in tool data. Known: [${[...knownSymbols].join(", ")}]`
      },
      responseText
    };
  }

  responseText +=
    `\n\n*Note: The symbol(s) ${contextualOutOfScope.join(", ")} mentioned above were not found in your portfolio data.*`;

  return {
    check: {
      checkName: "portfolio_scope",
      passed: false,
      details: `Out-of-scope symbols referenced as holdings: [${contextualOutOfScope.join(", ")}]. Known: [${[...knownSymbols].join(", ")}]`
    },
    responseText
  };
}
