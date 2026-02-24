import { AiAgentMvpEvalCase } from '../mvp-eval.interfaces';
import {
  CONCENTRATED_HOLDINGS,
  createEvalCase
} from './shared';

export const HAPPY_PATH_EVAL_CASES: AiAgentMvpEvalCase[] = [
  createEvalCase({
    category: 'happy_path',
    expected: {
      minCitations: 1,
      requiredTools: ['portfolio_analysis'],
      verificationChecks: [{ check: 'tool_execution', status: 'passed' }]
    },
    id: 'hp-001-portfolio-overview',
    input: {
      query: 'Give me a quick portfolio allocation overview'
    },
    intent: 'portfolio-overview'
  }),
  createEvalCase({
    category: 'happy_path',
    expected: {
      requiredTools: ['portfolio_analysis'],
      verificationChecks: [{ check: 'numerical_consistency', status: 'passed' }]
    },
    id: 'hp-002-holdings-summary',
    input: {
      query: 'Summarize my holdings and performance'
    },
    intent: 'holdings-summary'
  }),
  createEvalCase({
    category: 'happy_path',
    expected: {
      requiredTools: ['portfolio_analysis']
    },
    id: 'hp-003-return-review',
    input: {
      query: 'Review my portfolio return profile'
    },
    intent: 'return-review'
  }),
  createEvalCase({
    category: 'happy_path',
    expected: {
      requiredTools: ['portfolio_analysis']
    },
    id: 'hp-004-health-check',
    input: {
      query: 'Give me a portfolio health summary with allocation context'
    },
    intent: 'portfolio-health'
  }),
  createEvalCase({
    category: 'happy_path',
    expected: {
      requiredTools: ['portfolio_analysis', 'risk_assessment']
    },
    id: 'hp-005-risk-assessment',
    input: {
      query: 'Analyze my portfolio concentration risk'
    },
    intent: 'risk-assessment'
  }),
  createEvalCase({
    category: 'happy_path',
    expected: {
      requiredTools: ['portfolio_analysis', 'risk_assessment']
    },
    id: 'hp-006-diversification-review',
    input: {
      query: 'How diversified is my portfolio today?'
    },
    intent: 'diversification'
  }),
  createEvalCase({
    category: 'happy_path',
    expected: {
      minCitations: 1,
      requiredTools: ['market_data_lookup']
    },
    id: 'hp-007-market-price-nvda',
    input: {
      query: 'What is the latest price of NVDA?'
    },
    intent: 'market-price'
  }),
  createEvalCase({
    category: 'happy_path',
    expected: {
      requiredTools: ['market_data_lookup']
    },
    id: 'hp-008-market-quote-tsla',
    input: {
      query: 'Share ticker quote for TSLA'
    },
    intent: 'market-quote'
  }),
  createEvalCase({
    category: 'happy_path',
    expected: {
      requiredTools: ['market_data_lookup']
    },
    id: 'hp-009-market-context-multi',
    input: {
      query: 'Market context for AAPL and MSFT today'
    },
    intent: 'market-context'
  }),
  createEvalCase({
    category: 'happy_path',
    expected: {
      requiredTools: ['portfolio_analysis', 'risk_assessment', 'rebalance_plan'],
      verificationChecks: [{ check: 'rebalance_coverage', status: 'passed' }]
    },
    id: 'hp-010-rebalance-request',
    input: {
      query: 'Create a rebalance plan for my portfolio'
    },
    intent: 'rebalance'
  }),
  createEvalCase({
    category: 'happy_path',
    expected: {
      answerIncludes: ['Next-step allocation'],
      requiredTools: ['portfolio_analysis', 'risk_assessment', 'rebalance_plan'],
      verificationChecks: [{ check: 'response_quality', status: 'passed' }]
    },
    id: 'hp-011-investment-guidance',
    input: {
      query: 'I want to invest new cash next month, where should I allocate?'
    },
    intent: 'investment-guidance',
    setup: {
      llmThrows: true
    }
  }),
  createEvalCase({
    category: 'happy_path',
    expected: {
      answerIncludes: ['Largest long allocations'],
      requiredTools: ['portfolio_analysis', 'risk_assessment', 'rebalance_plan'],
      verificationChecks: [{ check: 'response_quality', status: 'passed' }]
    },
    id: 'hp-012-buy-trim-guidance',
    input: {
      query: 'Should I buy more MSFT or trim AAPL first?'
    },
    intent: 'buy-trim-guidance',
    setup: {
      llmThrows: true
    }
  }),
  createEvalCase({
    category: 'happy_path',
    expected: {
      answerIncludes: ['Next-step allocation'],
      requiredTools: ['portfolio_analysis', 'risk_assessment', 'rebalance_plan'],
      verificationChecks: [{ check: 'response_quality', status: 'passed' }]
    },
    id: 'hp-012b-direct-invest-question',
    input: {
      query: 'Where should I invest?'
    },
    intent: 'direct-invest-question',
    setup: {
      llmThrows: true
    }
  }),
  createEvalCase({
    category: 'happy_path',
    expected: {
      requiredTools: ['portfolio_analysis', 'risk_assessment', 'stress_test'],
      verificationChecks: [{ check: 'stress_test_coherence', status: 'passed' }]
    },
    id: 'hp-013-stress-scenario',
    input: {
      query: 'Run a stress test on my portfolio'
    },
    intent: 'stress-test'
  }),
  createEvalCase({
    category: 'happy_path',
    expected: {
      requiredTools: ['portfolio_analysis', 'risk_assessment', 'stress_test']
    },
    id: 'hp-014-drawdown-estimate',
    input: {
      query: 'Estimate drawdown impact in a market crash scenario'
    },
    intent: 'drawdown-estimate'
  }),
  createEvalCase({
    category: 'happy_path',
    expected: {
      requiredTools: [
        'portfolio_analysis',
        'risk_assessment',
        'market_data_lookup'
      ]
    },
    id: 'hp-015-risk-and-price',
    input: {
      query: 'Analyze portfolio risk and price action for AAPL'
    },
    intent: 'risk-and-price'
  }),
  createEvalCase({
    category: 'happy_path',
    expected: {
      requiredTools: ['portfolio_analysis', 'risk_assessment', 'stress_test']
    },
    id: 'hp-016-allocation-and-stress',
    input: {
      query: 'Check allocation balance and run downside stress analysis'
    },
    intent: 'allocation-and-stress'
  }),
  createEvalCase({
    category: 'happy_path',
    expected: {
      requiredTools: ['portfolio_analysis', 'risk_assessment', 'rebalance_plan']
    },
    id: 'hp-017-allocation-rebalance',
    input: {
      query: 'Review allocation risk and rebalance priorities'
    },
    intent: 'allocation-rebalance'
  }),
  createEvalCase({
    category: 'happy_path',
    expected: {
      requiredTools: ['portfolio_analysis', 'risk_assessment']
    },
    id: 'hp-018-performance-and-concentration',
    input: {
      query: 'Compare performance trends and concentration exposure'
    },
    intent: 'performance-concentration'
  }),
  createEvalCase({
    category: 'happy_path',
    expected: {
      requiredTools: ['portfolio_analysis', 'market_data_lookup']
    },
    id: 'hp-019-holdings-plus-market',
    input: {
      query: 'Show portfolio holdings and market price for MSFT'
    },
    intent: 'holdings-plus-market'
  }),
  createEvalCase({
    category: 'happy_path',
    expected: {
      requiredTools: ['portfolio_analysis', 'market_data_lookup']
    },
    id: 'hp-020-overview-plus-quote',
    input: {
      query: 'Give portfolio overview and quote for NVDA'
    },
    intent: 'overview-plus-quote'
  }),
  createEvalCase({
    category: 'happy_path',
    expected: {
      answerIncludes: ['Next-step allocation'],
      requiredTools: ['portfolio_analysis', 'risk_assessment', 'rebalance_plan'],
      verificationChecks: [{ check: 'response_quality', status: 'passed' }]
    },
    id: 'hp-021-next-allocation-plan',
    input: {
      query: 'Plan my next allocation with concentration risk controls'
    },
    intent: 'next-allocation-plan',
    setup: {
      llmThrows: true
    }
  }),
  createEvalCase({
    category: 'happy_path',
    expected: {
      requiredTools: ['portfolio_analysis', 'risk_assessment', 'rebalance_plan'],
      verificationChecks: [{ check: 'tool_execution', status: 'passed' }]
    },
    id: 'hp-022-concentrated-rebalance',
    input: {
      query: 'I plan to invest and rebalance concentrated positions this week'
    },
    intent: 'concentrated-rebalance',
    setup: {
      holdings: CONCENTRATED_HOLDINGS
    }
  })
];
