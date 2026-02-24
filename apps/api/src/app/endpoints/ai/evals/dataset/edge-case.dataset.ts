import { AiAgentMvpEvalCase } from '../mvp-eval.interfaces';
import {
  EMPTY_HOLDINGS,
  LARGE_HOLDINGS,
  LEVERAGED_HOLDINGS,
  ONE_TURN_MEMORY,
  SINGLE_HOLDING,
  TWO_TURN_MEMORY,
  ZERO_VALUE_HOLDINGS,
  createEvalCase
} from './shared';

export const EDGE_CASE_EVAL_CASES: AiAgentMvpEvalCase[] = [
  createEvalCase({
    category: 'edge_case',
    expected: {
      requiredTools: ['portfolio_analysis'],
      verificationChecks: [{ check: 'numerical_consistency', status: 'warning' }]
    },
    id: 'edge-001-empty-portfolio-overview',
    input: {
      query: 'Show my portfolio overview'
    },
    intent: 'empty-portfolio-overview',
    setup: {
      holdings: EMPTY_HOLDINGS
    }
  }),
  createEvalCase({
    category: 'edge_case',
    expected: {
      requiredTools: ['portfolio_analysis', 'risk_assessment'],
      verificationChecks: [{ check: 'numerical_consistency', status: 'warning' }]
    },
    id: 'edge-002-empty-risk-check',
    input: {
      query: 'Analyze my portfolio concentration risk'
    },
    intent: 'empty-risk-check',
    setup: {
      holdings: EMPTY_HOLDINGS
    }
  }),
  createEvalCase({
    category: 'edge_case',
    expected: {
      requiredTools: ['portfolio_analysis', 'risk_assessment']
    },
    id: 'edge-003-single-symbol-risk',
    input: {
      query: 'Evaluate concentration risk in my portfolio'
    },
    intent: 'single-symbol-risk',
    setup: {
      holdings: SINGLE_HOLDING
    }
  }),
  createEvalCase({
    category: 'edge_case',
    expected: {
      requiredTools: ['portfolio_analysis']
    },
    id: 'edge-004-large-portfolio-scan',
    input: {
      query: 'Provide a portfolio allocation summary'
    },
    intent: 'large-portfolio-scan',
    setup: {
      holdings: LARGE_HOLDINGS
    }
  }),
  createEvalCase({
    category: 'edge_case',
    expected: {
      requiredTools: ['portfolio_analysis', 'risk_assessment'],
      verificationChecks: [{ check: 'numerical_consistency', status: 'warning' }]
    },
    id: 'edge-005-zero-value-positions',
    input: {
      query: 'Assess risk for my current holdings'
    },
    intent: 'zero-value-positions',
    setup: {
      holdings: ZERO_VALUE_HOLDINGS
    }
  }),
  createEvalCase({
    category: 'edge_case',
    expected: {
      requiredTools: ['portfolio_analysis'],
      verificationChecks: [{ check: 'numerical_consistency', status: 'warning' }]
    },
    id: 'edge-006-leveraged-allocation-warning',
    input: {
      query: 'Review portfolio allocation consistency'
    },
    intent: 'leveraged-allocation-warning',
    setup: {
      holdings: LEVERAGED_HOLDINGS
    }
  }),
  createEvalCase({
    category: 'edge_case',
    expected: {
      requiredTools: ['market_data_lookup'],
      verificationChecks: [{ check: 'market_data_coverage', status: 'warning' }]
    },
    id: 'edge-007-partial-market-coverage',
    input: {
      query: 'Get market prices for AAPL and UNKNOWN',
      symbols: ['AAPL', 'UNKNOWN']
    },
    intent: 'partial-market-coverage',
    setup: {
      quotesBySymbol: {
        AAPL: {
          currency: 'USD',
          marketPrice: 213.34,
          marketState: 'REGULAR'
        }
      }
    }
  }),
  createEvalCase({
    category: 'edge_case',
    expected: {
      requiredToolCalls: [{ status: 'failed', tool: 'market_data_lookup' }],
      requiredTools: ['market_data_lookup'],
      verificationChecks: [{ check: 'tool_execution', status: 'warning' }]
    },
    id: 'edge-008-market-provider-failure',
    input: {
      query: 'Fetch price for NVDA and TSLA',
      symbols: ['NVDA', 'TSLA']
    },
    intent: 'market-provider-failure',
    setup: {
      marketDataErrorMessage: 'market provider unavailable'
    }
  }),
  createEvalCase({
    category: 'edge_case',
    expected: {
      answerIncludes: ['Largest long allocations:'],
      memoryTurnsAtLeast: 3,
      requiredTools: ['portfolio_analysis']
    },
    id: 'edge-009-memory-continuity',
    input: {
      query: 'Show my portfolio status again'
    },
    intent: 'memory-continuity',
    setup: {
      llmThrows: true,
      storedMemoryTurns: TWO_TURN_MEMORY
    }
  }),
  createEvalCase({
    category: 'edge_case',
    expected: {
      answerIncludes: ['Largest long allocations:'],
      memoryTurnsAtLeast: 2,
      requiredTools: ['portfolio_analysis']
    },
    id: 'edge-010-llm-fallback',
    input: {
      query: 'Give me portfolio allocation details'
    },
    intent: 'llm-fallback',
    setup: {
      llmThrows: true,
      storedMemoryTurns: ONE_TURN_MEMORY
    }
  }),
  createEvalCase({
    category: 'edge_case',
    expected: {
      requiredTools: [],
      forbiddenTools: ['portfolio_analysis', 'risk_assessment', 'market_data_lookup', 'rebalance_plan', 'stress_test']
    },
    id: 'edge-011-simple-arithmetic-2-plus-2',
    input: {
      query: '2+2'
    },
    intent: 'simple-arithmetic',
    setup: {}
  }),
  createEvalCase({
    category: 'edge_case',
    expected: {
      requiredTools: [],
      forbiddenTools: ['portfolio_analysis', 'risk_assessment', 'market_data_lookup', 'rebalance_plan', 'stress_test']
    },
    id: 'edge-012-simple-arithmetic-5-times-3',
    input: {
      query: 'what is 5 * 3'
    },
    intent: 'simple-arithmetic',
    setup: {}
  }),
  createEvalCase({
    category: 'edge_case',
    expected: {
      requiredTools: [],
      forbiddenTools: ['portfolio_analysis', 'risk_assessment', 'market_data_lookup', 'rebalance_plan', 'stress_test']
    },
    id: 'edge-013-greeting-only',
    input: {
      query: 'hello'
    },
    intent: 'greeting-only',
    setup: {}
  }),
  createEvalCase({
    category: 'edge_case',
    expected: {
      requiredTools: [],
      forbiddenTools: ['portfolio_analysis', 'risk_assessment', 'market_data_lookup', 'rebalance_plan', 'stress_test']
    },
    id: 'edge-014-thanks-only',
    input: {
      query: 'thanks'
    },
    intent: 'greeting-only',
    setup: {}
  })
];
