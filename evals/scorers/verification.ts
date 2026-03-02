import { createScorer } from 'evalite';

import type { AgentResponse } from '../helpers';

/**
 * Deterministic verification scorer that runs output validation +
 * hallucination checks on eval outputs. Uses tool results from the
 * extended AgentResponse.
 */
export const VerificationCheck = createScorer<string, AgentResponse, string>({
  name: 'Verification',
  description:
    'Checks output validity and hallucination risk using tool results',
  scorer: ({ output }) => {
    const issues: string[] = [];
    let checks = 0;
    let passed = 0;

    // Output validation: non-empty
    checks++;
    if (output.text.trim().length >= 10) {
      passed++;
    } else {
      issues.push('Response too short');
    }

    // Output validation: if tools called, response should have numbers
    if (output.toolCalls.length > 0) {
      checks++;
      if (/\d/.test(output.text)) {
        passed++;
      } else {
        issues.push('Tools called but no numeric data in response');
      }
    }

    // Hallucination: dollar amounts should appear in tool results
    if (output.toolResults.length > 0) {
      const responseDollars = extractDollarAmounts(output.text);
      const toolDataStr = JSON.stringify(
        output.toolResults.map((tr) => tr.result)
      );
      const toolDollars = extractDollarAmounts(toolDataStr);

      if (responseDollars.length > 0 && toolDollars.length > 0) {
        checks++;
        const unmatched = responseDollars.filter(
          (rd) => !toolDollars.some((td) => isApproxMatch(rd, td))
        );
        if (unmatched.length / responseDollars.length <= 0.5) {
          passed++;
        } else {
          issues.push(
            `Unmatched dollar amounts: ${unmatched
              .slice(0, 3)
              .map((a) => '$' + a)
              .join(', ')}`
          );
        }
      }
    }

    const score = checks > 0 ? passed / checks : 1;

    return {
      score: Math.round(score * 100) / 100,
      metadata: {
        checks,
        passed,
        issues
      }
    };
  }
});

function extractDollarAmounts(str: string): number[] {
  const matches = str.match(/\$[\d,]+(?:\.\d{1,2})?/g) ?? [];
  return matches.map((m) => parseFloat(m.replace(/[$,]/g, '')));
}

function isApproxMatch(a: number, b: number): boolean {
  if (a === 0 && b === 0) return true;
  const diff = Math.abs(a - b);
  const max = Math.max(Math.abs(a), Math.abs(b));
  return diff / max < 0.05 || diff < 1;
}
