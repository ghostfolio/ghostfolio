import {
  calculateConfidence,
  determineToolPlan,
  extractSymbolsFromQuery
} from './ai-agent.utils';

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

  it('falls back to portfolio tool when no clear tool keyword exists', () => {
    expect(
      determineToolPlan({
        query: 'Help me with my account'
      })
    ).toEqual(['portfolio_analysis', 'risk_assessment']);
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
});
