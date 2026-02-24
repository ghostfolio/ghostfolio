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

  it('selects portfolio analysis for portfolio value query wording', () => {
    expect(
      determineToolPlan({
        query: 'how much money i have?'
      })
    ).toEqual(['portfolio_analysis']);
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
    expect(
      createPolicyRouteResponse({ policyDecision: decision, query: 'Who are you?' })
    ).toContain(
      'Ghostfolio AI'
    );
  });

  it('returns deterministic arithmetic result for direct no-tool arithmetic query', () => {
    const decision = applyToolExecutionPolicy({
      plannedTools: [],
      query: '2+2'
    });

    expect(decision.route).toBe('direct');
    expect(decision.toolsToExecute).toEqual([]);
    expect(createPolicyRouteResponse({ policyDecision: decision, query: '2+2' })).toBe(
      '2+2 = 4'
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

  it('selects recommendation tools for ambiguous action phrasing', () => {
    expect(
      determineToolPlan({
        query: 'What can I do?'
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

  it.each([
    {
      expected: ['AAPL', 'MSFT'],
      query: 'Need AAPL plus MSFT update'
    },
    {
      expected: ['BRK.B', 'VTI'],
      query: 'Quote BRK.B and VTI'
    },
    {
      expected: ['QQQ', 'SPY'],
      query: 'Check $qqq against $spy'
    },
    {
      expected: ['AAPL'],
      query: 'Price for AAPL and THE and WHAT'
    },
    {
      expected: [],
      query: 'price for appl and tsla in lowercase without prefixes'
    },
    {
      expected: ['AMD', 'NVDA'],
      query: 'Show AMD then $nvda'
    },
    {
      expected: ['BTCUSD'],
      query: 'ticker BTCUSD now'
    },
    {
      expected: ['MSFT'],
      query: 'Quote MSFT, msft, and $msft'
    },
    {
      expected: ['SHOP.TO'],
      query: 'market for SHOP.TO'
    },
    {
      expected: [],
      query: 'what can you do'
    }
  ])('extractSymbolsFromQuery handles edge case: $query', ({ expected, query }) => {
    expect(extractSymbolsFromQuery(query)).toEqual(expected);
  });

  it.each([
    {
      expectedTools: ['portfolio_analysis'],
      query: 'portfolio overview'
    },
    {
      expectedTools: ['portfolio_analysis'],
      query: 'holdings summary'
    },
    {
      expectedTools: ['portfolio_analysis', 'risk_assessment', 'rebalance_plan'],
      query: 'allocation snapshot'
    },
    {
      expectedTools: ['portfolio_analysis'],
      query: 'performance review'
    },
    {
      expectedTools: ['portfolio_analysis', 'risk_assessment'],
      query: 'risk concentration report'
    },
    {
      expectedTools: ['portfolio_analysis', 'risk_assessment'],
      query: 'diversification check'
    },
    {
      expectedTools: ['market_data_lookup'],
      query: 'price for NVDA'
    },
    {
      expectedTools: ['market_data_lookup'],
      query: 'ticker quote for AAPL'
    },
    {
      expectedTools: ['market_data_lookup'],
      query: 'market context'
    },
    {
      expectedTools: ['portfolio_analysis', 'risk_assessment', 'rebalance_plan'],
      query: 'where should I invest next'
    },
    {
      expectedTools: ['portfolio_analysis', 'risk_assessment', 'rebalance_plan'],
      query: 'trim overweight positions'
    },
    {
      expectedTools: ['portfolio_analysis', 'risk_assessment', 'rebalance_plan'],
      query: 'sell and rebalance'
    },
    {
      expectedTools: ['portfolio_analysis', 'risk_assessment', 'stress_test'],
      query: 'run a crash stress test'
    },
    {
      expectedTools: ['portfolio_analysis', 'risk_assessment', 'stress_test'],
      query: 'drawdown shock analysis'
    },
    {
      expectedTools: ['portfolio_analysis', 'risk_assessment', 'stress_test'],
      query: 'stress scenario'
    },
    {
      expectedTools: ['portfolio_analysis', 'risk_assessment', 'rebalance_plan', 'market_data_lookup'],
      query: 'rebalance portfolio and quote NVDA'
    },
    {
      expectedTools: ['portfolio_analysis', 'risk_assessment', 'market_data_lookup'],
      query: 'analyze risk and market price'
    },
    {
      expectedTools: [],
      query: 'who are you'
    },
    {
      expectedTools: [],
      query: 'hello there'
    },
    {
      expectedTools: [],
      query: 'help me with account settings'
    }
  ])(
    'determineToolPlan returns expected tools for "$query"',
    ({ expectedTools, query }) => {
      expect(determineToolPlan({ query })).toEqual(expectedTools);
    }
  );

  it.each([
    {
      expected: true,
      query: 'How should I rebalance and reduce concentration risk?',
      text:
        'Trim your top position by 4% and direct the next 1500 USD to two smaller holdings. Recheck concentration after each contribution.'
    },
    {
      expected: true,
      query: 'What is my market price exposure?',
      text:
        'AAPL is 210.12 USD and MSFT is 455.90 USD. Market exposure remains concentrated in your top position.'
    },
    {
      expected: false,
      query: 'Should I buy more MSFT?',
      text:
        'As an AI, I cannot provide financial advice and you should consult a financial advisor.'
    },
    {
      expected: false,
      query: 'What are my risk metrics right now?',
      text:
        'Risk seems elevated overall with concentration concerns but no specific values are available.'
    },
    {
      expected: false,
      query: 'Where should I invest next?',
      text:
        'Consider your long-term goals.'
    },
    {
      expected: true,
      query: 'Where should I invest next?',
      text:
        'Allocate 70% of new money to positions outside your top holding and 30% to broad-market exposure. This lowers concentration without forced selling.'
    },
    {
      expected: true,
      query: 'Run stress drawdown estimate',
      text:
        'Under a 20% shock, estimated drawdown is 3200 USD and projected value is 12800 USD. Reduce single-name concentration to improve downside stability.'
    },
    {
      expected: false,
      query: 'Run stress drawdown estimate',
      text:
        'Stress impact could be meaningful and diversification may help over time.'
    },
    {
      expected: false,
      query: 'What is concentration risk now?',
      text: 'Risk is high.'
    },
    {
      expected: true,
      query: 'What is concentration risk now?',
      text:
        'Top holding is 52.4% with HHI 0.331. Trim 2-4 percentage points from the top position or add to underweight holdings.'
    }
  ])(
    'isGeneratedAnswerReliable=$expected for quality gate case',
    ({ expected, query, text }) => {
      expect(
        isGeneratedAnswerReliable({
          answer: text,
          query
        })
      ).toBe(expected);
    }
  );

  it.each([
    {
      expectedStatus: 'passed',
      query: 'How should I rebalance risk?',
      text:
        'Top holding is 48%. Trim 3% from the largest position and add to two underweight holdings. Re-evaluate concentration in one week.'
    },
    {
      expectedStatus: 'warning',
      query: 'Show concentration and market price risk',
      text:
        'Concentration is elevated and diversification would improve resilience over time.'
    },
    {
      expectedStatus: 'warning',
      query: 'Where should I invest next?',
      text:
        'You can diversify over time by considering additional positions that fit your risk profile and timeline.'
    },
    {
      expectedStatus: 'failed',
      query: 'Where should I invest next?',
      text:
        'As an AI, I cannot provide financial advice and you should consult a financial advisor.'
    },
    {
      expectedStatus: 'warning',
      query: 'What is my drawdown risk right now?',
      text:
        'Drawdown risk exists and depends on current concentration and market volatility.'
    },
    {
      expectedStatus: 'passed',
      query: 'What is my drawdown risk right now?',
      text:
        'At a 20% shock, projected drawdown is 2600 USD. Reduce your top position by 2-3 points to lower downside risk concentration.'
    },
    {
      expectedStatus: 'warning',
      query: 'Show my market quote and risk',
      text:
        'AAPL is high and risk is elevated.'
    },
    {
      expectedStatus: 'passed',
      query: 'Show my market quote and risk',
      text:
        'AAPL is 212.40 USD and top holding concentration is 46.2%. Rebalance by directing new cash into lower-weight holdings.'
    },
    {
      expectedStatus: 'warning',
      query: 'Analyze performance and allocation',
      text:
        'Performance and allocation are stable.'
    },
    {
      expectedStatus: 'passed',
      query: 'Analyze performance and allocation',
      text:
        'Portfolio return is 8.4% and top allocation is 41.0%. Add to underweight positions to keep concentration from rising.'
    }
  ])(
    'evaluateAnswerQuality returns $expectedStatus',
    ({ expectedStatus, query, text }) => {
      expect(
        evaluateAnswerQuality({
          answer: text,
          query
        }).status
      ).toBe(expectedStatus);
    }
  );
});
