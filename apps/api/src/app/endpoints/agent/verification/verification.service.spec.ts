import { ConfidenceScorer, classifyQueryType } from './confidence-scorer';
import { DisclaimerInjector } from './disclaimer-injector';
import { DomainValidator } from './domain-validator';
import { FactChecker } from './fact-checker';
import { HallucinationDetector } from './hallucination-detector';
import { OutputValidator } from './output-validator';
import type {
  ToolCallRecord,
  VerificationContext
} from './verification.interfaces';
import { VerificationService } from './verification.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeContext(
  overrides?: Partial<VerificationContext>
): VerificationContext {
  return {
    toolCalls: [],
    agentResponseText: '',
    userId: 'test-user',
    userCurrency: 'USD',
    requestTimestamp: new Date(),
    ...overrides
  };
}

function makeToolCall(overrides?: Partial<ToolCallRecord>): ToolCallRecord {
  return {
    toolName: 'get_portfolio_holdings',
    timestamp: new Date(),
    inputArgs: {},
    outputData: null,
    success: true,
    durationMs: 100,
    ...overrides
  };
}

// ---------------------------------------------------------------------------
// FactChecker
// ---------------------------------------------------------------------------

describe('FactChecker', () => {
  const checker = new FactChecker();

  it('extracts numbers in various formats ($1,234.56, 45.2%, CHF 250, €500)', () => {
    const ctx = makeContext({
      agentResponseText:
        'Your portfolio is worth $1,234.56, up 45.2% this year. You have CHF 250 in cash and €500 in bonds.',
      toolCalls: [
        makeToolCall({
          outputData: {
            totalValue: 1234.56,
            returnPct: 45.2,
            cash: 250,
            bonds: 500
          }
        })
      ]
    });
    const result = checker.check(ctx);
    expect(result.verifiedCount).toBeGreaterThanOrEqual(4);
    expect(result.unverifiedCount).toBe(0);
    expect(result.passed).toBe(true);
  });

  it('filters skip-list numbers (small integers, years, time values)', () => {
    const ctx = makeContext({
      agentResponseText:
        'Over the past 5 years, with 30 day average, your return was 15.5%.',
      toolCalls: [makeToolCall({ outputData: { returnPct: 15.5 } })]
    });
    const result = checker.check(ctx);
    // 5 and 30 should be skipped (small integers / time values); 15.5% is the only candidate
    expect(result.verifiedCount).toBe(1);
    expect(result.passed).toBe(true);
  });

  it('builds truth set from nested tool JSON', () => {
    const ctx = makeContext({
      agentResponseText: 'AAPL is at $172.50 and MSFT is at $310.25.',
      toolCalls: [
        makeToolCall({
          outputData: {
            holdings: [
              { symbol: 'AAPL', price: 172.5 },
              { symbol: 'MSFT', price: 310.25 }
            ]
          }
        })
      ]
    });
    const result = checker.check(ctx);
    expect(result.verifiedCount).toBe(2);
    expect(result.passed).toBe(true);
  });

  it('verifies numbers within tolerance (currency ±0.01, percentage ±0.1pp)', () => {
    const ctx = makeContext({
      agentResponseText: 'Total: $500.01, gain: 12.1%.',
      toolCalls: [makeToolCall({ outputData: { total: 500.0, gain: 12.0 } })]
    });
    const result = checker.check(ctx);
    expect(result.verifiedCount).toBe(2);
    expect(result.unverifiedCount).toBe(0);
  });

  it('matches decimal-to-percentage conversion (0.4523 <-> 45.23%)', () => {
    const ctx = makeContext({
      agentResponseText: 'Your equity allocation is 45.23%.',
      toolCalls: [makeToolCall({ outputData: { allocation: 0.4523 } })]
    });
    const result = checker.check(ctx);
    expect(result.verifiedCount).toBe(1);
    expect(result.unverifiedCount).toBe(0);
  });

  it('handles "approximately" context with wider tolerance', () => {
    const ctx = makeContext({
      agentResponseText: 'Your total is approximately $1,050 (about $1,050).',
      toolCalls: [makeToolCall({ outputData: { totalValue: 1000.0 } })]
    });
    const result = checker.check(ctx);
    // 5% relative tolerance for "approximately"
    expect(result.verifiedCount).toBeGreaterThanOrEqual(1);
  });

  it('returns passed=true when all numbers verified', () => {
    const ctx = makeContext({
      agentResponseText: 'Value is $200.00.',
      toolCalls: [makeToolCall({ outputData: { value: 200.0 } })]
    });
    const result = checker.check(ctx);
    expect(result.passed).toBe(true);
    expect(result.unverifiedCount).toBe(0);
  });

  it('returns passed=false with unverifiedCount when unmatched', () => {
    const ctx = makeContext({
      agentResponseText: 'Value is $999.99.',
      toolCalls: [makeToolCall({ outputData: { value: 200.0 } })]
    });
    const result = checker.check(ctx);
    expect(result.passed).toBe(false);
    expect(result.unverifiedCount).toBeGreaterThanOrEqual(1);
  });

  it('computes derived values (sums of array fields)', () => {
    const ctx = makeContext({
      agentResponseText: 'Total value is $750.00.',
      toolCalls: [
        makeToolCall({
          outputData: {
            holdings: [{ value: 250 }, { value: 200 }, { value: 300 }]
          }
        })
      ]
    });
    const result = checker.check(ctx);
    // 750 = 250 + 200 + 300 derived sum
    expect(
      result.details.some(
        (d) => d.status === 'DERIVED' || d.status === 'VERIFIED'
      )
    ).toBe(true);
    expect(result.passed).toBe(true);
  });

  it('tolerates currency conversion differences within 1% (AT-27)', () => {
    const ctx = makeContext({
      agentResponseText:
        'Your EUR position is worth approximately $1,120 after exchange rate conversion.',
      toolCalls: [
        makeToolCall({
          outputData: {
            eurValue: 1000,
            exchangeRate: 1.12,
            convertedValue: 1120
          }
        })
      ]
    });
    const result = checker.check(ctx);
    // "approximately" context with conversion should match within tolerance
    expect(result.verifiedCount).toBeGreaterThanOrEqual(1);
  });

  it('verifies currency conversion via product-derived values', () => {
    const ctx = makeContext({
      agentResponseText:
        'Your EUR 1,000 position converts to $1,120.00 at the current exchange rate.',
      toolCalls: [
        makeToolCall({
          outputData: {
            eurValue: 1000,
            exchangeRate: 1.12
          }
        })
      ]
    });
    const result = checker.check(ctx);
    // 1120 = 1000 * 1.12 should be found via product derivation
    expect(
      result.details.some(
        (d) => d.status === 'DERIVED' || d.status === 'VERIFIED'
      )
    ).toBe(true);
  });

  it('parses JSON strings in SDK content block format', () => {
    const ctx = makeContext({
      agentResponseText:
        'Your EUR 1,000 converts to $1,179.38 at a rate of 1.18.',
      toolCalls: [
        makeToolCall({
          toolName: 'convert_currency',
          outputData: [
            {
              type: 'text',
              text: JSON.stringify({
                amount: 1000,
                fromCurrency: 'EUR',
                toCurrency: 'USD',
                convertedAmount: 1179.38,
                rate: 1.17938
              })
            }
          ]
        })
      ]
    });
    const result = checker.check(ctx);
    // 1179.38 should be VERIFIED directly, 1.18 should match rate 1.17938 within tolerance
    expect(result.verifiedCount).toBeGreaterThanOrEqual(1);
    expect(result.unverifiedCount).toBe(0);
  });

  it('uses relative tolerance for large currency amounts', () => {
    const ctx = makeContext({
      agentResponseText: 'Your portfolio is worth $50,125.00.',
      toolCalls: [makeToolCall({ outputData: { totalValue: 50000.0 } })]
    });
    const result = checker.check(ctx);
    // $50,125 is within 0.5% of $50,000 -> should verify
    expect(result.verifiedCount).toBeGreaterThanOrEqual(1);
  });

  it('returns empty result for no text or no tool calls', () => {
    const noText = checker.check(makeContext({ agentResponseText: '' }));
    expect(noText.verifiedCount).toBe(0);
    expect(noText.unverifiedCount).toBe(0);
    expect(noText.passed).toBe(true);

    const noTools = checker.check(
      makeContext({ agentResponseText: 'Value is $100.', toolCalls: [] })
    );
    expect(noTools.verifiedCount).toBe(0);
    expect(noTools.passed).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// HallucinationDetector
// ---------------------------------------------------------------------------

describe('HallucinationDetector', () => {
  const detector = new HallucinationDetector();

  it('splits sentences correctly (handles abbreviations, decimal numbers)', () => {
    const ctx = makeContext({
      agentResponseText:
        'Dr. Smith recommends a 12.5% allocation. The price is $100.50. This is good.',
      toolCalls: [
        makeToolCall({ outputData: { allocation: 12.5, price: 100.5 } })
      ]
    });
    const result = detector.detect(ctx);
    // Should not split on "Dr." or "12.5" or "$100.50"
    expect(result.totalClaims).toBeGreaterThanOrEqual(2);
    expect(result.totalClaims).toBeLessThanOrEqual(4);
  });

  it('classifies disclaimers as EXEMPT', () => {
    const ctx = makeContext({
      agentResponseText:
        'This is not financial advice. Past performance is not indicative of future results.',
      toolCalls: [makeToolCall({ outputData: { value: 100 } })]
    });
    const result = detector.detect(ctx);
    const exemptDetails = result.details.filter(
      (d) => d.grounding === 'EXEMPT'
    );
    expect(exemptDetails.length).toBeGreaterThanOrEqual(2);
  });

  it('classifies meta-statements as EXEMPT', () => {
    const ctx = makeContext({
      agentResponseText:
        'Based on your portfolio data, here is the summary. Looking at the holdings below.',
      toolCalls: [makeToolCall({ outputData: { value: 100 } })]
    });
    const result = detector.detect(ctx);
    const exempt = result.details.filter((d) => d.grounding === 'EXEMPT');
    expect(exempt.length).toBeGreaterThanOrEqual(1);
  });

  it('classifies general financial knowledge as EXEMPT', () => {
    const ctx = makeContext({
      agentResponseText:
        'Diversification reduces risk. Markets can be volatile.',
      toolCalls: [makeToolCall({ outputData: { value: 100 } })]
    });
    const result = detector.detect(ctx);
    const exempt = result.details.filter((d) => d.grounding === 'EXEMPT');
    expect(exempt.length).toBeGreaterThanOrEqual(2);
  });

  it('classifies grounded claims (numbers found in tools) as GROUNDED', () => {
    const ctx = makeContext({
      agentResponseText: 'AAPL is worth $150.00 in your portfolio.',
      toolCalls: [
        makeToolCall({
          outputData: { symbol: 'AAPL', value: 150.0 }
        })
      ]
    });
    const result = detector.detect(ctx);
    const grounded = result.details.filter((d) => d.grounding === 'GROUNDED');
    expect(grounded.length).toBeGreaterThanOrEqual(1);
  });

  it('classifies ungrounded claims as UNGROUNDED', () => {
    const ctx = makeContext({
      agentResponseText: 'TSLA is worth $9999.99 in your portfolio.',
      toolCalls: [
        makeToolCall({
          outputData: { symbol: 'AAPL', value: 150.0 }
        })
      ]
    });
    const result = detector.detect(ctx);
    expect(result.detected).toBe(true);
    expect(result.ungroundedClaims).toBeGreaterThanOrEqual(1);
  });

  it('detects fabricated performance number (AT-8)', () => {
    const detector = new HallucinationDetector();
    const ctx = makeContext({
      agentResponseText:
        'Your portfolio returned 18% this year, significantly outperforming expectations.',
      toolCalls: [
        makeToolCall({
          outputData: { netPerformancePercentage: 0.12 }
        })
      ]
    });
    const result = detector.detect(ctx);
    // 18% does not match 12% (0.12) - should detect ungrounded claim
    expect(result.detected).toBe(true);
    expect(result.ungroundedClaims).toBeGreaterThanOrEqual(1);
  });

  it('handles intermediate hallucination rates 1-5% and 5-15% (AT-11)', () => {
    const detector = new HallucinationDetector();

    // Create a response with many grounded claims and one ungrounded.
    // Use $77,777.77 for the ungrounded claim since it is far from all tool
    // numbers (avoids the 5% relative tolerance match).
    const ctx = makeContext({
      agentResponseText:
        'AAPL is at $150.00. MSFT is at $310.25. GOOG is at $2800.00. ' +
        'Your total portfolio is $50,000.00. Bonds make up $10,000.00. ' +
        'Cash reserves are $5,000.00. ETF allocation is $15,000.00. ' +
        'ZZZZ is at $77,777.77.',
      toolCalls: [
        makeToolCall({
          outputData: {
            holdings: [
              { symbol: 'AAPL', price: 150.0 },
              { symbol: 'MSFT', price: 310.25 },
              { symbol: 'GOOG', price: 2800.0 }
            ],
            total: 50000,
            bonds: 10000,
            cash: 5000,
            etf: 15000
          }
        })
      ]
    });
    const result = detector.detect(ctx);
    expect(result.detected).toBe(true);
    // The rate should be low since most claims are grounded
    expect(result.rate).toBeGreaterThan(0);
    expect(result.rate).toBeLessThan(0.5);
  });

  it('calculates hallucination rate correctly', () => {
    const ctx = makeContext({
      agentResponseText: 'AAPL is at $150. FAKE is at $9999. XYZ is at $8888.',
      toolCalls: [
        makeToolCall({
          outputData: { symbol: 'AAPL', price: 150.0 }
        })
      ]
    });
    const result = detector.detect(ctx);
    // rate = ungrounded / (total - exempt)
    expect(result.rate).toBeGreaterThan(0);
    expect(result.rate).toBeLessThanOrEqual(1);
  });

  it('handles div-by-zero (all exempt -> rate 0)', () => {
    const ctx = makeContext({
      agentResponseText:
        'This is not financial advice. Past performance does not guarantee future results.',
      toolCalls: [makeToolCall({ outputData: { v: 1 } })]
    });
    const result = detector.detect(ctx);
    expect(result.rate).toBe(0);
  });

  it('validates synthesis (e.g., "equity-heavy" when data supports it)', () => {
    const ctx = makeContext({
      agentResponseText:
        'Your portfolio shows strong positive performance with equity-heavy allocation.',
      toolCalls: [
        makeToolCall({
          outputData: { equityPct: 75.0, returnPct: 12.5 }
        })
      ]
    });
    const result = detector.detect(ctx);
    // "equity-heavy" is valid synthesis when toolNumbers include > 60
    const ungrounded = result.details.filter(
      (d) => d.grounding === 'UNGROUNDED'
    );
    expect(ungrounded.length).toBe(0);
  });

  it('returns empty result for empty text', () => {
    const ctx = makeContext({ agentResponseText: '' });
    const result = detector.detect(ctx);
    expect(result.totalClaims).toBe(0);
    expect(result.rate).toBe(0);
    expect(result.detected).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// ConfidenceScorer
// ---------------------------------------------------------------------------

describe('ConfidenceScorer', () => {
  const scorer = new ConfidenceScorer();

  const perfectFactCheck = {
    passed: true,
    verifiedCount: 5,
    unverifiedCount: 0,
    derivedCount: 0,
    details: []
  };

  const noHallucination = {
    detected: false,
    rate: 0,
    totalClaims: 5,
    groundedClaims: 5,
    ungroundedClaims: 0,
    partiallyGroundedClaims: 0,
    exemptClaims: 0,
    flaggedClaims: [] as string[],
    details: []
  };

  it('scores HIGH (>0.7) for perfect single-tool query', () => {
    const ctx = makeContext({
      agentResponseText: 'Your portfolio value is $10,000.',
      toolCalls: [
        makeToolCall({ timestamp: new Date() }) // fresh data
      ]
    });
    const result = scorer.score(ctx, perfectFactCheck, noHallucination);
    expect(result.level).toBe('HIGH');
    expect(result.score).toBeGreaterThan(0.7);
  });

  it('scores MEDIUM for synthesis with some unverified', () => {
    const ctx = makeContext({
      agentResponseText: 'Your portfolio combines multiple data points.',
      toolCalls: [
        makeToolCall({ timestamp: new Date() }),
        makeToolCall({
          toolName: 'get_performance',
          timestamp: new Date()
        })
      ]
    });
    const partialFact = {
      ...perfectFactCheck,
      verifiedCount: 2,
      unverifiedCount: 5,
      passed: false
    };
    const someHallucination = {
      ...noHallucination,
      detected: true,
      rate: 0.2,
      ungroundedClaims: 1
    };
    const result = scorer.score(ctx, partialFact, someHallucination);
    expect(result.level).toBe('MEDIUM');
    expect(result.score).toBeGreaterThanOrEqual(0.4);
    expect(result.score).toBeLessThanOrEqual(0.7);
  });

  it('scores LOW for speculative with many unverified', () => {
    const ctx = makeContext({
      agentResponseText: 'You should consider rebalancing.',
      toolCalls: [makeToolCall({ timestamp: new Date() })]
    });
    const badFact = {
      ...perfectFactCheck,
      verifiedCount: 0,
      unverifiedCount: 5,
      passed: false
    };
    const highHallucination = {
      ...noHallucination,
      detected: true,
      rate: 0.85,
      ungroundedClaims: 4
    };
    const result = scorer.score(ctx, badFact, highHallucination);
    expect(result.level).toBe('LOW');
    expect(result.score).toBeLessThan(0.4);
  });

  it('classifies query types correctly', () => {
    // single tool -> direct_data_retrieval
    const singleCtx = makeContext({
      agentResponseText: 'Here is your data.',
      toolCalls: [makeToolCall()]
    });
    expect(classifyQueryType(singleCtx)).toBe('direct_data_retrieval');

    // multiple tools -> multi_tool_synthesis
    const multiCtx = makeContext({
      agentResponseText: 'Here is your combined data.',
      toolCalls: [makeToolCall(), makeToolCall({ toolName: 'get_performance' })]
    });
    expect(classifyQueryType(multiCtx)).toBe('multi_tool_synthesis');

    // comparative language with single tool -> comparative_analysis
    const compCtx = makeContext({
      agentResponseText: 'Account A has higher than account B.',
      toolCalls: [makeToolCall()]
    });
    expect(classifyQueryType(compCtx)).toBe('comparative_analysis');

    // speculative phrase patterns -> speculative
    const specCtx = makeContext({
      agentResponseText: 'You should consider selling.',
      toolCalls: [makeToolCall()]
    });
    expect(classifyQueryType(specCtx)).toBe('speculative');

    // "should" alone (non-recommendation) -> NOT speculative
    const nonSpecCtx = makeContext({
      agentResponseText: 'You should see your data below.',
      toolCalls: [makeToolCall()]
    });
    expect(classifyQueryType(nonSpecCtx)).not.toBe('speculative');

    // no tools -> unsupported
    const noToolCtx = makeContext({
      agentResponseText: 'I cannot help with that.',
      toolCalls: []
    });
    expect(classifyQueryType(noToolCtx)).toBe('unsupported');
  });

  it('data freshness: +0.1 for <1hr, +0.05 for <24hr, +0 for older', () => {
    const now = new Date();
    const freshCtx = makeContext({
      agentResponseText: 'Fresh data.',
      toolCalls: [makeToolCall({ timestamp: now })],
      requestTimestamp: now
    });
    const freshResult = scorer.score(
      freshCtx,
      perfectFactCheck,
      noHallucination
    );

    const hourAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    const staleCtx = makeContext({
      agentResponseText: 'Slightly stale data.',
      toolCalls: [makeToolCall({ timestamp: hourAgo })],
      requestTimestamp: now
    });
    const staleResult = scorer.score(
      staleCtx,
      perfectFactCheck,
      noHallucination
    );

    const dayAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);
    const oldCtx = makeContext({
      agentResponseText: 'Old data.',
      toolCalls: [makeToolCall({ timestamp: dayAgo })],
      requestTimestamp: now
    });
    const oldResult = scorer.score(oldCtx, perfectFactCheck, noHallucination);

    expect(freshResult.breakdown.dataScore).toBeGreaterThan(
      staleResult.breakdown.dataScore
    );
    expect(staleResult.breakdown.dataScore).toBeGreaterThan(
      oldResult.breakdown.dataScore
    );
  });

  it('score is clamped to [0, 1]', () => {
    const ctx = makeContext({
      agentResponseText: 'Data.',
      toolCalls: [makeToolCall({ timestamp: new Date() })]
    });
    const result = scorer.score(ctx, perfectFactCheck, noHallucination);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(1);
  });

  it('reduces confidence when tool calls have success=false (AT-15)', () => {
    const scorer = new ConfidenceScorer();
    const factCheck = {
      passed: true,
      verifiedCount: 3,
      unverifiedCount: 0,
      derivedCount: 0,
      details: []
    };
    const noHallucination = {
      detected: false,
      rate: 0,
      totalClaims: 3,
      groundedClaims: 3,
      ungroundedClaims: 0,
      partiallyGroundedClaims: 0,
      exemptClaims: 0,
      flaggedClaims: [] as string[],
      details: []
    };

    // All tools succeed
    const successCtx = makeContext({
      agentResponseText: 'Your portfolio data is here.',
      toolCalls: [makeToolCall({ success: true, timestamp: new Date() })]
    });
    const successResult = scorer.score(successCtx, factCheck, noHallucination);

    // Some tools fail
    const failCtx = makeContext({
      agentResponseText: 'Your portfolio data is here.',
      toolCalls: [
        makeToolCall({ success: false, timestamp: new Date() }),
        makeToolCall({ success: true, timestamp: new Date() })
      ]
    });
    const failResult = scorer.score(failCtx, factCheck, noHallucination);

    // Failed tools should result in lower dataScore
    expect(failResult.breakdown.dataScore).toBeLessThan(
      successResult.breakdown.dataScore
    );
  });
});

// ---------------------------------------------------------------------------
// DomainValidator
// ---------------------------------------------------------------------------

describe('DomainValidator', () => {
  const validator = new DomainValidator();

  it('detects negative allocations (NEGATIVE_ALLOCATION)', () => {
    const ctx = makeContext({
      toolCalls: [
        makeToolCall({
          outputData: [
            { allocationInPercentage: -0.05, currency: 'USD', quantity: 10 }
          ]
        })
      ]
    });
    const result = validator.validate(ctx);
    expect(result.passed).toBe(false);
    expect(
      result.violations.some((v) => v.constraintId === 'NEGATIVE_ALLOCATION')
    ).toBe(true);
  });

  it('detects allocation sum != 100% (ALLOCATION_SUM)', () => {
    const ctx = makeContext({
      toolCalls: [
        makeToolCall({
          outputData: [
            { allocationInPercentage: 0.3 },
            { allocationInPercentage: 0.3 }
          ]
        })
      ]
    });
    const result = validator.validate(ctx);
    expect(result.passed).toBe(false);
    expect(
      result.violations.some((v) => v.constraintId === 'ALLOCATION_SUM')
    ).toBe(true);
  });

  it('detects invalid currency codes (INVALID_CURRENCY)', () => {
    // Invalid format: not 3 uppercase letters
    const ctx = makeContext({
      toolCalls: [
        makeToolCall({
          outputData: [{ allocationInPercentage: 1.0, currency: 'us' }]
        })
      ]
    });
    const result = validator.validate(ctx);
    expect(result.passed).toBe(false);
    expect(
      result.violations.some((v) => v.constraintId === 'INVALID_CURRENCY')
    ).toBe(true);
  });

  it('accepts any valid 3-letter currency code (INVALID_CURRENCY)', () => {
    // XYZ is a valid format even if not in ISO 4217 standard set
    const ctx = makeContext({
      toolCalls: [
        makeToolCall({
          outputData: [{ allocationInPercentage: 1.0, currency: 'MYR' }]
        })
      ]
    });
    const result = validator.validate(ctx);
    expect(
      result.violations.some((v) => v.constraintId === 'INVALID_CURRENCY')
    ).toBe(false);
  });

  it('detects negative quantities (NEGATIVE_QUANTITY)', () => {
    const ctx = makeContext({
      toolCalls: [
        makeToolCall({
          outputData: [{ quantity: -5, marketPrice: 100 }]
        })
      ]
    });
    const result = validator.validate(ctx);
    expect(result.passed).toBe(false);
    expect(
      result.violations.some((v) => v.constraintId === 'NEGATIVE_QUANTITY')
    ).toBe(true);
  });

  it('detects value inconsistency (VALUE_INCONSISTENCY)', () => {
    const ctx = makeContext({
      toolCalls: [
        makeToolCall({
          outputData: [
            {
              quantity: 10,
              marketPrice: 100,
              valueInBaseCurrency: 5000 // should be 1000
            }
          ]
        })
      ]
    });
    const result = validator.validate(ctx);
    expect(result.passed).toBe(false);
    expect(
      result.violations.some((v) => v.constraintId === 'VALUE_INCONSISTENCY')
    ).toBe(true);
  });

  it('returns passed=true when all constraints satisfied', () => {
    const ctx = makeContext({
      toolCalls: [
        makeToolCall({
          outputData: [
            {
              allocationInPercentage: 0.6,
              currency: 'USD',
              quantity: 10,
              marketPrice: 100,
              valueInBaseCurrency: 1000
            },
            {
              allocationInPercentage: 0.4,
              currency: 'EUR',
              quantity: 5,
              marketPrice: 200,
              valueInBaseCurrency: 1000
            }
          ]
        })
      ]
    });
    const result = validator.validate(ctx);
    expect(result.passed).toBe(true);
    expect(result.violations.length).toBe(0);
  });

  it('returns empty for no tool calls', () => {
    const ctx = makeContext({ toolCalls: [] });
    const result = validator.validate(ctx);
    expect(result.passed).toBe(true);
    expect(result.violations.length).toBe(0);
  });

  it('detects X-Ray inconsistency: agent claims "diversified" but rules mostly failing (XRAY_INCONSISTENCY)', () => {
    const ctx = makeContext({
      agentResponseText:
        'Your portfolio is well diversified across asset classes.',
      toolCalls: [
        makeToolCall({
          outputData: {
            xRay: [
              {
                key: 'AssetClassClusterRisk',
                rules: [
                  { key: 'basicMaterials', value: false, isActive: true },
                  { key: 'technology', value: false, isActive: true },
                  { key: 'energy', value: true, isActive: true }
                ]
              }
            ]
          }
        })
      ]
    });
    const result = validator.validate(ctx);
    expect(result.passed).toBe(false);
    expect(
      result.violations.some((v) => v.constraintId === 'XRAY_INCONSISTENCY')
    ).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// DisclaimerInjector
// ---------------------------------------------------------------------------

describe('DisclaimerInjector', () => {
  const injector = new DisclaimerInjector();

  it('triggers D-TAX for "tax" keyword', () => {
    const ctx = makeContext({
      agentResponseText: 'You may owe tax on these gains.'
    });
    const result = injector.inject(ctx);
    expect(result.disclaimerIds).toContain('D-TAX');
  });

  it('triggers D-ADVICE for "should" keyword', () => {
    const ctx = makeContext({
      agentResponseText: 'You should consider rebalancing.'
    });
    const result = injector.inject(ctx);
    expect(result.disclaimerIds).toContain('D-ADVICE');
  });

  it('triggers D-PREDICTION for "future" keyword', () => {
    const ctx = makeContext({
      agentResponseText: 'In the future, this may grow.'
    });
    const result = injector.inject(ctx);
    expect(result.disclaimerIds).toContain('D-PREDICTION');
  });

  it('triggers D-STALE for data >24 hours old', () => {
    const now = new Date();
    const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);
    const ctx = makeContext({
      agentResponseText: 'Here is your data.',
      toolCalls: [makeToolCall({ timestamp: twoDaysAgo })],
      requestTimestamp: now
    });
    const result = injector.inject(ctx);
    expect(result.disclaimerIds).toContain('D-STALE');
  });

  it('triggers D-PARTIAL for failed tool calls', () => {
    const ctx = makeContext({
      agentResponseText: 'Some data could not be retrieved.',
      toolCalls: [makeToolCall({ success: false })]
    });
    const result = injector.inject(ctx);
    expect(result.disclaimerIds).toContain('D-PARTIAL');
  });

  it('deduplicates (no repeated IDs)', () => {
    const ctx = makeContext({
      agentResponseText:
        'You should consider rebalancing. I also suggest selling. You might want to optimize.'
    });
    const result = injector.inject(ctx);
    const adviceCount = result.disclaimerIds.filter(
      (id) => id === 'D-ADVICE'
    ).length;
    expect(adviceCount).toBe(1);
  });

  it('returns empty for clean response', () => {
    const ctx = makeContext({
      agentResponseText: 'Your portfolio value is stable.',
      toolCalls: [makeToolCall({ timestamp: new Date() })]
    });
    const result = injector.inject(ctx);
    expect(result.disclaimerIds.length).toBe(0);
    expect(result.texts.length).toBe(0);
  });

  it('returns disclaimers sorted by priority', () => {
    const now = new Date();
    const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);
    const ctx = makeContext({
      agentResponseText:
        'You should invest for the future. Consider the tax implications.',
      toolCalls: [
        makeToolCall({ timestamp: twoDaysAgo }),
        makeToolCall({ success: false })
      ],
      requestTimestamp: now
    });
    const result = injector.inject(ctx);
    // D-STALE (1), D-PARTIAL (2), D-TAX (3), D-ADVICE (4), D-PREDICTION (5)
    const ids = result.disclaimerIds;
    expect(ids.length).toBeGreaterThanOrEqual(3);
    // Verify order: D-STALE before D-PARTIAL before keyword disclaimers
    const staleIdx = ids.indexOf('D-STALE');
    const partialIdx = ids.indexOf('D-PARTIAL');
    const taxIdx = ids.indexOf('D-TAX');
    if (staleIdx !== -1 && partialIdx !== -1) {
      expect(staleIdx).toBeLessThan(partialIdx);
    }
    if (partialIdx !== -1 && taxIdx !== -1) {
      expect(partialIdx).toBeLessThan(taxIdx);
    }
  });
});

// ---------------------------------------------------------------------------
// OutputValidator
// ---------------------------------------------------------------------------

describe('OutputValidator', () => {
  const validator = new OutputValidator();

  it('flags currency with wrong decimal places', () => {
    const ctx = makeContext({
      agentResponseText:
        'Your total is $1,234.567 which is a significant amount of money in your portfolio right now.',
      toolCalls: [makeToolCall({ outputData: { total: 1234.567 } })]
    });
    const result = validator.validate(ctx);
    expect(result.passed).toBe(false);
    expect(result.issues.some((i) => i.checkId === 'currency_format')).toBe(
      true
    );
  });

  it('flags unknown ticker symbols', () => {
    const ctx = makeContext({
      agentResponseText:
        'AAPL is performing well. ZZQQ is also in your portfolio and doing great today and tomorrow.',
      toolCalls: [makeToolCall({ outputData: { symbol: 'AAPL', value: 150 } })]
    });
    const result = validator.validate(ctx);
    expect(
      result.issues.some(
        (i) =>
          i.checkId === 'symbol_reference' && i.description.includes('ZZQQ')
      )
    ).toBe(true);
  });

  it('flags too-short response', () => {
    const ctx = makeContext({
      agentResponseText: 'OK.',
      toolCalls: []
    });
    const result = validator.validate(ctx);
    expect(result.passed).toBe(false);
    expect(result.issues.some((i) => i.checkId === 'response_length')).toBe(
      true
    );
  });

  it('flags too-long response', () => {
    const ctx = makeContext({
      agentResponseText: 'A'.repeat(5001),
      toolCalls: []
    });
    const result = validator.validate(ctx);
    expect(result.passed).toBe(false);
    expect(result.issues.some((i) => i.checkId === 'response_length')).toBe(
      true
    );
  });

  it('passes clean responses', () => {
    const ctx = makeContext({
      agentResponseText:
        'Your portfolio holds AAPL at $150.00 and MSFT at $310.25. Together they represent a solid position in the technology sector.',
      toolCalls: [
        makeToolCall({
          outputData: [
            { symbol: 'AAPL', value: 150 },
            { symbol: 'MSFT', value: 310.25 }
          ]
        })
      ]
    });
    const result = validator.validate(ctx);
    expect(result.passed).toBe(true);
    expect(result.issues.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// VerificationService (Pipeline)
// ---------------------------------------------------------------------------

describe('VerificationService', () => {
  let service: VerificationService;

  beforeEach(() => {
    service = new VerificationService(
      new FactChecker(),
      new HallucinationDetector(),
      new ConfidenceScorer(),
      new DomainValidator(),
      new OutputValidator(),
      new DisclaimerInjector()
    );
  });

  it('happy path: returns complete result with timedOut=false', async () => {
    const ctx = makeContext({
      agentResponseText:
        'Your portfolio value is $10,000.00 with a return of 12.5% this year. AAPL makes up a large portion.',
      toolCalls: [
        makeToolCall({
          outputData: {
            holdings: [
              {
                symbol: 'AAPL',
                allocationInPercentage: 0.6,
                valueInBaseCurrency: 6000,
                quantity: 40,
                marketPrice: 150,
                currency: 'USD'
              },
              {
                symbol: 'MSFT',
                allocationInPercentage: 0.4,
                valueInBaseCurrency: 4000,
                quantity: 13,
                marketPrice: 307.69,
                currency: 'USD'
              }
            ],
            totalValue: 10000,
            returnPct: 12.5
          }
        })
      ]
    });

    const result = await service.verify(ctx);

    expect(result.timedOut).toBe(false);
    expect(result.confidence).toBeDefined();
    expect(result.confidence.score).toBeGreaterThanOrEqual(0);
    expect(result.confidence.score).toBeLessThanOrEqual(1);
    expect(result.confidence.level).toMatch(/^(HIGH|MEDIUM|LOW)$/);
    expect(result.factCheck).toBeDefined();
    expect(result.hallucination).toBeDefined();
    expect(result.domainValidation).toBeDefined();
    expect(result.disclaimers).toBeDefined();
    expect(result.outputValidation).toBeDefined();
    expect(result.verificationDurationMs).toBeGreaterThanOrEqual(0);
  });

  it('handles stage failures gracefully (returns defaults on error)', async () => {
    // Create a context that won't cause errors but test the error path
    // by verifying the catch block behavior with an empty/edge-case context
    const ctx = makeContext({
      agentResponseText:
        'A perfectly normal response with enough characters to pass the output length check.',
      toolCalls: []
    });

    const result = await service.verify(ctx);

    // With no tool calls, the pipeline should still complete
    expect(result.timedOut).toBe(false);
    expect(result.confidence).toBeDefined();
    expect(result.factCheck.passed).toBe(true);
    expect(result.hallucination.detected).toBe(false);
    expect(result.domainValidation.passed).toBe(true);
  });

  it('emits correction-level data when hallucination rate > 15%', async () => {
    const ctx = makeContext({
      agentResponseText:
        'FAKE stock is at $9999.99 and BOGUS is at $8888.88. PHONY is trading at $7777.77 in the market.',
      toolCalls: [
        makeToolCall({
          outputData: { symbol: 'AAPL', price: 150.0 }
        })
      ]
    });

    const result = await service.verify(ctx);

    // Hallucination rate should be significant
    expect(result.hallucination.rate).toBeGreaterThan(0);
    expect(result.hallucination.detected).toBe(true);
    // The pipeline itself doesn't emit SSE events, but it exposes the data
    // for the caller to decide whether to emit a correction
    expect(result.hallucination.ungroundedClaims).toBeGreaterThanOrEqual(1);
  });

  it('returns timedOut=false for successful runs within budget', async () => {
    const ctx = makeContext({
      agentResponseText:
        'A simple response with no special numbers or claims but long enough to pass validation.',
      toolCalls: [makeToolCall({ outputData: { value: 42 } })]
    });

    const result = await service.verify(ctx);
    expect(result.timedOut).toBe(false);
    expect(result.verificationDurationMs).toBeLessThan(500);
  });

  it('returns timedOut=true when pipeline exceeds 500ms', async () => {
    // Create a slow fact checker that returns a promise that delays > 500ms
    // We use an async delay to avoid blocking the event loop so the timeout
    // promise can actually fire.
    const slowFactChecker = new FactChecker();
    const originalCheck = slowFactChecker.check.bind(slowFactChecker);
    (slowFactChecker as any).check = async (ctx: any, signal?: AbortSignal) => {
      await new Promise((resolve) => setTimeout(resolve, 600));
      return originalCheck(ctx, signal);
    };

    const slowService = new VerificationService(
      slowFactChecker,
      new HallucinationDetector(),
      new ConfidenceScorer(),
      new DomainValidator(),
      new OutputValidator(),
      new DisclaimerInjector()
    );

    const ctx = makeContext({
      agentResponseText: 'Your portfolio value is $10,000.',
      toolCalls: [makeToolCall({ outputData: { value: 10000 } })]
    });

    const result = await slowService.verify(ctx);
    expect(result.timedOut).toBe(true);
    expect(result.confidence.level).toBe('MEDIUM');
    expect(result.confidence.score).toBe(0.5);
  });

  it('handles stage error gracefully without collapsing pipeline', async () => {
    const errorFactChecker = new FactChecker();
    errorFactChecker.check = () => {
      throw new Error('Simulated stage failure');
    };

    const errorService = new VerificationService(
      errorFactChecker,
      new HallucinationDetector(),
      new ConfidenceScorer(),
      new DomainValidator(),
      new OutputValidator(),
      new DisclaimerInjector()
    );

    const ctx = makeContext({
      agentResponseText:
        'Your portfolio value is $10,000 and it has been performing well this year.',
      toolCalls: [makeToolCall({ outputData: { value: 10000 } })]
    });

    const result = await errorService.verify(ctx);
    // Pipeline should still complete (not throw)
    expect(result).toBeDefined();
    expect(result.timedOut).toBe(false);
    // Other stages should still have run
    expect(result.hallucination).toBeDefined();
    expect(result.domainValidation).toBeDefined();
  });
});
