import {
  calculateConfidence,
  determineToolPlan,
  evaluateAnswerQuality,
  extractSymbolsFromQuery,
  isGeneratedAnswerReliable
} from './ai-agent.utils';
import {
  applyToolExecutionPolicy,
  createPolicyRouteResponse
} from './ai-agent.policy.utils';

describe('AiAgentUtils', () => {
  it('extracts and deduplicates symbols from query', () => {
    expect(extractSymbolsFromQuery('Check AAPL and TSLA then AAPL')).toEqual([
      'AAPL',
      'TSLA'
    ]);
  });

  it('ignores common uppercase stop words while keeping ticker symbols', () => {
    expect(
      extractSymbolsFromQuery('WHAT IS THE PRICE OF NVDA AND TSLA')
    ).toEqual(['NVDA', 'TSLA']);
  });

  it('supports dollar-prefixed lowercase or mixed-case symbol input', () => {
    expect(extractSymbolsFromQuery('Check $nvda and $TsLa')).toEqual([
      'NVDA',
      'TSLA'
    ]);
  });

  it('selects portfolio and risk tools for risk query', () => {
    expect(
      determineToolPlan({
        query: 'Analyze portfolio concentration risk'
      })
    ).toEqual(['portfolio_analysis', 'risk_assessment']);
  });

  it('selects market tool for quote query', () => {
    expect(
      determineToolPlan({
        query: 'What is the price for NVDA?',
        symbols: ['NVDA']
      })
    ).toEqual(['market_data_lookup']);
  });

  it('returns no tools when no clear tool keyword exists', () => {
    expect(
      determineToolPlan({
        query: 'Help me with my account'
      })
    ).toEqual([]);
  });

  it('routes greetings to direct no-tool policy', () => {
    const decision = applyToolExecutionPolicy({
      plannedTools: ['portfolio_analysis'],
      query: 'Hi'
    });

    expect(decision.route).toBe('direct');
    expect(decision.toolsToExecute).toEqual([]);
    expect(decision.blockedByPolicy).toBe(true);
    expect(decision.blockReason).toBe('no_tool_query');
    expect(decision.forcedDirect).toBe(true);
  });

  it('routes assistant capability prompts to direct no-tool policy', () => {
    const decision = applyToolExecutionPolicy({
      plannedTools: [],
      query: 'Who are you?'
    });

    expect(decision.route).toBe('direct');
    expect(decision.toolsToExecute).toEqual([]);
    expect(decision.blockReason).toBe('no_tool_query');
    expect(createPolicyRouteResponse({ policyDecision: decision })).toContain(
      'Ghostfolio AI assistant'
    );
  });

  it('keeps finance-intent prompts on clarify route even with capability phrasing', () => {
    const decision = applyToolExecutionPolicy({
      plannedTools: [],
      query: 'What can you do about my portfolio risk?'
    });

    expect(decision.route).toBe('clarify');
    expect(decision.blockReason).toBe('unknown');
  });

  it('routes to clarify when planner provides no tools for finance-style query', () => {
    const decision = applyToolExecutionPolicy({
      plannedTools: [],
      query: 'Portfolio please'
    });

    expect(decision.route).toBe('clarify');
    expect(decision.toolsToExecute).toEqual([]);
    expect(decision.blockReason).toBe('unknown');
    expect(createPolicyRouteResponse({ policyDecision: decision })).toContain(
      'Which one should I run next?'
    );
  });

  it('blocks rebalance tool without explicit action intent while keeping read tools', () => {
    const decision = applyToolExecutionPolicy({
      plannedTools: ['portfolio_analysis', 'risk_assessment', 'rebalance_plan'],
      query: 'Review portfolio concentration risk'
    });

    expect(decision.route).toBe('tools');
    expect(decision.toolsToExecute).toEqual([
      'portfolio_analysis',
      'risk_assessment'
    ]);
    expect(decision.blockedByPolicy).toBe(true);
    expect(decision.blockReason).toBe('needs_confirmation');
  });

  it('selects risk reasoning for investment intent queries', () => {
    expect(
      determineToolPlan({
        query: 'Where should I invest next?'
      })
    ).toEqual(['portfolio_analysis', 'risk_assessment', 'rebalance_plan']);
  });

  it('selects rebalance tool for rebalance-focused prompts', () => {
    expect(
      determineToolPlan({
        query: 'How should I rebalance overweight positions?'
      })
    ).toEqual(['portfolio_analysis', 'risk_assessment', 'rebalance_plan']);
  });

  it('selects stress test tool for crash scenario prompts', () => {
    expect(
      determineToolPlan({
        query: 'Run a drawdown stress test on my portfolio'
      })
    ).toEqual(['portfolio_analysis', 'risk_assessment', 'stress_test']);
  });

  it('calculates bounded confidence score and band', () => {
    const confidence = calculateConfidence({
      toolCalls: [
        {
          input: {},
          outputSummary: 'ok',
          status: 'success',
          tool: 'portfolio_analysis'
        },
        {
          input: {},
          outputSummary: 'ok',
          status: 'success',
          tool: 'risk_assessment'
        },
        {
          input: {},
          outputSummary: 'failed',
          status: 'failed',
          tool: 'market_data_lookup'
        }
      ],
      verification: [
        {
          check: 'numerical_consistency',
          details: 'ok',
          status: 'passed'
        },
        {
          check: 'tool_execution',
          details: 'partial',
          status: 'warning'
        },
        {
          check: 'market_data_coverage',
          details: 'missing',
          status: 'failed'
        }
      ]
    });

    expect(confidence.score).toBeGreaterThanOrEqual(0);
    expect(confidence.score).toBeLessThanOrEqual(1);
    expect(['high', 'medium', 'low']).toContain(confidence.band);
  });

  it('uses medium band at the 0.6 confidence threshold', () => {
    const confidence = calculateConfidence({
      toolCalls: [],
      verification: [
        {
          check: 'v1',
          details: 'ok',
          status: 'passed'
        },
        {
          check: 'v2',
          details: 'ok',
          status: 'passed'
        },
        {
          check: 'v3',
          details: 'ok',
          status: 'passed'
        },
        {
          check: 'v4',
          details: 'ok',
          status: 'passed'
        },
        {
          check: 'v5',
          details: 'warn',
          status: 'warning'
        }
      ]
    });

    expect(confidence.score).toBe(0.6);
    expect(confidence.band).toBe('medium');
  });

  it('uses high band at the 0.8 confidence threshold', () => {
    const confidence = calculateConfidence({
      toolCalls: [
        {
          input: {},
          outputSummary: 'ok',
          status: 'success',
          tool: 'portfolio_analysis'
        }
      ],
      verification: [
        {
          check: 'v1',
          details: 'ok',
          status: 'passed'
        },
        {
          check: 'v2',
          details: 'warn',
          status: 'warning'
        },
        {
          check: 'v3',
          details: 'warn',
          status: 'warning'
        },
        {
          check: 'v4',
          details: 'warn',
          status: 'warning'
        },
        {
          check: 'v5',
          details: 'warn',
          status: 'warning'
        }
      ]
    });

    expect(confidence.score).toBe(0.8);
    expect(confidence.band).toBe('high');
  });

  it('accepts generated answer with actionable and numeric support', () => {
    expect(
      isGeneratedAnswerReliable({
        answer:
          'Trim AAPL by 5% and allocate the next 1000 USD into MSFT and BND to reduce concentration risk.',
        query: 'Where should I invest next to rebalance my portfolio?'
      })
    ).toBe(true);
  });

  it('rejects generated answer with disclaimer language', () => {
    expect(
      isGeneratedAnswerReliable({
        answer:
          'As an AI, I cannot provide financial advice. Please consult a financial advisor.',
        query: 'How should I rebalance my portfolio?'
      })
    ).toBe(false);
  });

  it('marks response quality as warning when quantitative support is missing', () => {
    const qualityCheck = evaluateAnswerQuality({
      answer:
        'Your allocation profile is concentrated in one name and needs balancing across other holdings.',
      query: 'Show risk concentration and latest price trend for AAPL'
    });

    expect(qualityCheck.check).toBe('response_quality');
    expect(qualityCheck.status).toBe('warning');
    expect(qualityCheck.details).toContain(
      'Quantitative query response lacks numeric support'
    );
  });

  it('marks response quality as failed for generic AI disclaimers', () => {
    const qualityCheck = evaluateAnswerQuality({
      answer:
        'As an AI, I am not your financial advisor so I cannot provide financial advice.',
      query: 'Should I buy more MSFT?'
    });

    expect(qualityCheck.check).toBe('response_quality');
    expect(qualityCheck.status).toBe('failed');
  });
});
