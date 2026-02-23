import { DataSource } from '@prisma/client';

import { AiAgentMvpEvalCase } from './mvp-eval.interfaces';

const DEFAULT_HOLDINGS = {
  AAPL: {
    allocationInPercentage: 0.5,
    dataSource: DataSource.YAHOO,
    symbol: 'AAPL',
    valueInBaseCurrency: 5000
  },
  MSFT: {
    allocationInPercentage: 0.3,
    dataSource: DataSource.YAHOO,
    symbol: 'MSFT',
    valueInBaseCurrency: 3000
  },
  NVDA: {
    allocationInPercentage: 0.2,
    dataSource: DataSource.YAHOO,
    symbol: 'NVDA',
    valueInBaseCurrency: 2000
  }
};

const DEFAULT_QUOTES = {
  AAPL: {
    currency: 'USD',
    marketPrice: 213.34,
    marketState: 'REGULAR'
  },
  MSFT: {
    currency: 'USD',
    marketPrice: 462.15,
    marketState: 'REGULAR'
  },
  NVDA: {
    currency: 'USD',
    marketPrice: 901.22,
    marketState: 'REGULAR'
  }
};

export const AI_AGENT_MVP_EVAL_DATASET: AiAgentMvpEvalCase[] = [
  {
    expected: {
      minCitations: 1,
      requiredTools: ['portfolio_analysis'],
      verificationChecks: [{ check: 'tool_execution', status: 'passed' }]
    },
    id: 'mvp-001-portfolio-overview',
    input: {
      query: 'Give me a quick portfolio allocation overview',
      sessionId: 'mvp-eval-session-1',
      userId: 'mvp-user'
    },
    intent: 'portfolio-analysis',
    setup: {
      holdings: DEFAULT_HOLDINGS,
      llmText: 'Your portfolio is diversified with large-cap concentration.',
      quotesBySymbol: DEFAULT_QUOTES
    }
  },
  {
    expected: {
      minCitations: 2,
      requiredTools: ['portfolio_analysis', 'risk_assessment'],
      verificationChecks: [{ check: 'numerical_consistency', status: 'passed' }]
    },
    id: 'mvp-002-risk-assessment',
    input: {
      query: 'Analyze my portfolio concentration risk',
      sessionId: 'mvp-eval-session-2',
      userId: 'mvp-user'
    },
    intent: 'risk-assessment',
    setup: {
      holdings: DEFAULT_HOLDINGS,
      llmText: 'Concentration risk sits in the medium range.',
      quotesBySymbol: DEFAULT_QUOTES
    }
  },
  {
    expected: {
      minCitations: 1,
      requiredToolCalls: [
        { status: 'success', tool: 'market_data_lookup' }
      ],
      requiredTools: ['market_data_lookup']
    },
    id: 'mvp-003-market-quote',
    input: {
      query: 'What is the latest price of NVDA?',
      sessionId: 'mvp-eval-session-3',
      userId: 'mvp-user'
    },
    intent: 'market-data',
    setup: {
      holdings: DEFAULT_HOLDINGS,
      llmText: 'NVDA is currently trading near recent highs.',
      quotesBySymbol: DEFAULT_QUOTES
    }
  },
  {
    expected: {
      minCitations: 3,
      requiredTools: [
        'portfolio_analysis',
        'risk_assessment',
        'market_data_lookup'
      ],
      verificationChecks: [
        { check: 'numerical_consistency', status: 'passed' },
        { check: 'citation_coverage', status: 'passed' }
      ]
    },
    id: 'mvp-004-multi-tool-query',
    input: {
      query: 'Analyze portfolio risk and price action for AAPL',
      sessionId: 'mvp-eval-session-4',
      userId: 'mvp-user'
    },
    intent: 'multi-tool',
    setup: {
      holdings: DEFAULT_HOLDINGS,
      llmText: 'Risk is moderate and AAPL supports portfolio momentum.',
      quotesBySymbol: DEFAULT_QUOTES
    }
  },
  {
    expected: {
      requiredTools: ['portfolio_analysis'],
      verificationChecks: [{ check: 'tool_execution', status: 'passed' }]
    },
    id: 'mvp-005-default-fallback-tool',
    input: {
      query: 'Help me with my investments this week',
      sessionId: 'mvp-eval-session-5',
      userId: 'mvp-user'
    },
    intent: 'fallback-tool-selection',
    setup: {
      holdings: DEFAULT_HOLDINGS,
      llmText: 'Portfolio context provides the best starting point.',
      quotesBySymbol: DEFAULT_QUOTES
    }
  },
  {
    expected: {
      answerIncludes: ['Session memory applied from 2 prior turn(s).'],
      memoryTurnsAtLeast: 3,
      requiredTools: ['portfolio_analysis']
    },
    id: 'mvp-006-memory-continuity',
    input: {
      query: 'Show my portfolio status again',
      sessionId: 'mvp-eval-session-6',
      userId: 'mvp-user'
    },
    intent: 'memory',
    setup: {
      holdings: DEFAULT_HOLDINGS,
      llmThrows: true,
      quotesBySymbol: DEFAULT_QUOTES,
      storedMemoryTurns: [
        {
          answer: 'Prior answer 1',
          query: 'Initial query',
          timestamp: '2026-02-23T10:00:00.000Z',
          toolCalls: [{ status: 'success', tool: 'portfolio_analysis' }]
        },
        {
          answer: 'Prior answer 2',
          query: 'Follow-up query',
          timestamp: '2026-02-23T10:05:00.000Z',
          toolCalls: [{ status: 'success', tool: 'risk_assessment' }]
        }
      ]
    }
  },
  {
    expected: {
      requiredToolCalls: [
        { status: 'failed', tool: 'market_data_lookup' }
      ],
      requiredTools: ['market_data_lookup'],
      verificationChecks: [{ check: 'tool_execution', status: 'warning' }]
    },
    id: 'mvp-007-market-tool-graceful-failure',
    input: {
      query: 'Fetch price for NVDA and TSLA',
      sessionId: 'mvp-eval-session-7',
      symbols: ['NVDA', 'TSLA'],
      userId: 'mvp-user'
    },
    intent: 'tool-failure',
    setup: {
      holdings: DEFAULT_HOLDINGS,
      llmText: 'Market provider has limited availability right now.',
      marketDataErrorMessage: 'market provider unavailable'
    }
  },
  {
    expected: {
      requiredTools: ['market_data_lookup'],
      verificationChecks: [{ check: 'market_data_coverage', status: 'warning' }]
    },
    id: 'mvp-008-partial-market-coverage',
    input: {
      query: 'Get market prices for AAPL and UNKNOWN',
      sessionId: 'mvp-eval-session-8',
      symbols: ['AAPL', 'UNKNOWN'],
      userId: 'mvp-user'
    },
    intent: 'partial-coverage',
    setup: {
      holdings: DEFAULT_HOLDINGS,
      llmText: 'Some symbols resolved while others remained unresolved.',
      quotesBySymbol: {
        AAPL: DEFAULT_QUOTES.AAPL
      }
    }
  },
  {
    expected: {
      requiredTools: [
        'portfolio_analysis',
        'risk_assessment',
        'rebalance_plan'
      ],
      verificationChecks: [{ check: 'rebalance_coverage', status: 'passed' }]
    },
    id: 'mvp-009-rebalance-plan',
    input: {
      query: 'Create a rebalance plan for my portfolio',
      sessionId: 'mvp-eval-session-9',
      userId: 'mvp-user'
    },
    intent: 'rebalance',
    setup: {
      holdings: DEFAULT_HOLDINGS,
      llmText: 'AAPL is overweight and should be trimmed toward your target.',
      quotesBySymbol: DEFAULT_QUOTES
    }
  },
  {
    expected: {
      requiredTools: ['portfolio_analysis', 'risk_assessment', 'stress_test'],
      verificationChecks: [{ check: 'stress_test_coherence', status: 'passed' }]
    },
    id: 'mvp-010-stress-test',
    input: {
      query: 'Run a drawdown stress scenario for my portfolio',
      sessionId: 'mvp-eval-session-10',
      userId: 'mvp-user'
    },
    intent: 'stress-test',
    setup: {
      holdings: DEFAULT_HOLDINGS,
      llmText: 'A ten percent downside shock indicates manageable drawdown.',
      quotesBySymbol: DEFAULT_QUOTES
    }
  }
];
