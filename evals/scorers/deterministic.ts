import { createScorer } from 'evalite';

interface AgentResponse {
  toolCalls: string[];
  text: string;
}

export interface GoldenExpected {
  toolsAtLeast?: string[];
  toolsExactly?: string[];
  noTools?: boolean;
  containsPattern?: RegExp[];
  containsNone?: string[];
  hasTable?: boolean;
  hasList?: boolean;
  nonEmpty?: boolean;
}

interface CheckResult {
  name: string;
  pass: boolean;
  detail?: string;
}

function checkToolMatch(
  actual: string[],
  expected: GoldenExpected
): CheckResult[] {
  const results: CheckResult[] = [];
  const actualSet = new Set(actual);

  if (expected.toolsAtLeast) {
    const missing = expected.toolsAtLeast.filter((t) => !actualSet.has(t));
    results.push({
      name: 'ToolsAtLeast',
      pass: missing.length === 0,
      detail:
        missing.length > 0
          ? `missing: ${missing.join(', ')}`
          : `found: ${expected.toolsAtLeast.join(', ')}`
    });
  }

  if (expected.toolsExactly) {
    const expectedSet = new Set(expected.toolsExactly);
    const match =
      actualSet.size === expectedSet.size &&
      [...expectedSet].every((t) => actualSet.has(t));
    results.push({
      name: 'ToolsExactly',
      pass: match,
      detail: match
        ? `matched: ${[...actualSet].join(', ')}`
        : `expected: ${expected.toolsExactly.join(', ')}, got: ${actual.join(', ')}`
    });
  }

  if (expected.noTools) {
    results.push({
      name: 'NoTools',
      pass: actual.length === 0,
      detail:
        actual.length > 0
          ? `unexpected tools: ${actual.join(', ')}`
          : 'no tools called'
    });
  }

  return results;
}

function checkPatterns(text: string, expected: GoldenExpected): CheckResult[] {
  const results: CheckResult[] = [];

  if (expected.containsPattern) {
    for (const re of expected.containsPattern) {
      results.push({
        name: `Pattern(${re.source})`,
        pass: re.test(text),
        detail: re.test(text) ? 'matched' : 'no match'
      });
    }
  }

  if (expected.containsNone) {
    const lower = text.toLowerCase();
    for (const forbidden of expected.containsNone) {
      const found = lower.includes(forbidden.toLowerCase());
      results.push({
        name: `Forbidden("${forbidden}")`,
        pass: !found,
        detail: found ? 'FOUND in response' : 'absent'
      });
    }
  }

  return results;
}

function checkStructure(text: string, expected: GoldenExpected): CheckResult[] {
  const results: CheckResult[] = [];

  if (expected.hasTable) {
    const hasTablePattern = /\|[-:]+/.test(text);
    results.push({
      name: 'HasTable',
      pass: hasTablePattern,
      detail: hasTablePattern ? 'table found' : 'no markdown table detected'
    });
  }

  if (expected.hasList) {
    const hasBullet = /^[\s]*[-*]\s/m.test(text);
    const hasNumbered = /^[\s]*\d+\.\s/m.test(text);
    const pass = hasBullet || hasNumbered;
    results.push({
      name: 'HasList',
      pass,
      detail: pass ? 'list found' : 'no bullet or numbered list detected'
    });
  }

  if (expected.nonEmpty) {
    const pass = text.trim().length > 0;
    results.push({
      name: 'NonEmpty',
      pass,
      detail: pass ? `${text.trim().length} chars` : 'empty response'
    });
  }

  return results;
}

/**
 * Deterministic meta-scorer: returns 1 only if ALL specified checks pass.
 * Metadata shows each individual check result.
 */
export const GoldenCheck = createScorer<string, AgentResponse, GoldenExpected>({
  name: 'Golden Check',
  description: 'Deterministic binary pass/fail — all checks must pass',
  scorer: ({ output, expected }) => {
    if (!expected) {
      return { score: 0, metadata: { error: 'no expected config' } };
    }

    const checks = [
      ...checkToolMatch(output.toolCalls, expected),
      ...checkPatterns(output.text, expected),
      ...checkStructure(output.text, expected)
    ];

    const failed = checks.filter((c) => !c.pass);
    const score = failed.length === 0 ? 1 : 0;

    return {
      score,
      metadata: {
        total: checks.length,
        passed: checks.length - failed.length,
        failed: failed.length,
        checks: checks.map((c) => ({
          name: c.name,
          pass: c.pass,
          detail: c.detail
        }))
      }
    };
  }
});
