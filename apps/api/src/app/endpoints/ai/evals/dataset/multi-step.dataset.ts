import { AiAgentMvpEvalCase } from '../mvp-eval.interfaces';
import { ONE_TURN_MEMORY, createEvalCase } from './shared';

export const MULTI_STEP_EVAL_CASES: AiAgentMvpEvalCase[] = [
  createEvalCase({
    category: 'multi_step',
    expected: {
      requiredTools: [
        'portfolio_analysis',
        'risk_assessment',
        'market_data_lookup',
        'rebalance_plan'
      ]
    },
    id: 'multi-001-risk-price-rebalance',
    input: {
      query:
        'Analyze my portfolio risk, check AAPL price, and propose a rebalance plan'
    },
    intent: 'risk-price-rebalance'
  }),
  createEvalCase({
    category: 'multi_step',
    expected: {
      requiredTools: [
        'portfolio_analysis',
        'risk_assessment',
        'rebalance_plan',
        'stress_test'
      ],
      verificationChecks: [{ check: 'stress_test_coherence', status: 'passed' }]
    },
    id: 'multi-002-rebalance-then-stress',
    input: {
      query: 'Rebalance my allocation and run a stress test afterward'
    },
    intent: 'rebalance-then-stress'
  }),
  createEvalCase({
    category: 'multi_step',
    expected: {
      requiredTools: [
        'portfolio_analysis',
        'risk_assessment',
        'market_data_lookup',
        'stress_test'
      ]
    },
    id: 'multi-003-market-risk-stress',
    input: {
      query:
        'Check market prices for AAPL and MSFT, then assess risk and drawdown'
    },
    intent: 'market-risk-stress'
  }),
  createEvalCase({
    category: 'multi_step',
    expected: {
      requiredTools: ['portfolio_analysis', 'risk_assessment', 'rebalance_plan']
    },
    id: 'multi-004-performance-concentration-rebalance',
    input: {
      query:
        'Compare performance and concentration, then recommend what to rebalance next month'
    },
    intent: 'performance-concentration-rebalance'
  }),
  createEvalCase({
    category: 'multi_step',
    expected: {
      requiredTools: ['portfolio_analysis', 'risk_assessment', 'market_data_lookup']
    },
    id: 'multi-005-market-impact-analysis',
    input: {
      query:
        'Get market context for NVDA, AAPL, and TSLA, then evaluate portfolio diversification risk'
    },
    intent: 'market-impact-analysis'
  }),
  createEvalCase({
    category: 'multi_step',
    expected: {
      requiredTools: [
        'portfolio_analysis',
        'risk_assessment',
        'rebalance_plan',
        'stress_test'
      ]
    },
    id: 'multi-006-stress-then-allocation',
    input: {
      query:
        'Run a crash stress test and suggest how I should allocate new money next'
    },
    intent: 'stress-then-allocation'
  }),
  createEvalCase({
    category: 'multi_step',
    expected: {
      requiredTools: [
        'portfolio_analysis',
        'risk_assessment',
        'market_data_lookup',
        'stress_test'
      ]
    },
    id: 'multi-007-allocation-drawdown-ticker',
    input: {
      query:
        'Review portfolio allocation, estimate drawdown, and provide ticker quote for AAPL'
    },
    intent: 'allocation-drawdown-ticker'
  }),
  createEvalCase({
    category: 'multi_step',
    expected: {
      requiredTools: [
        'portfolio_analysis',
        'risk_assessment',
        'market_data_lookup',
        'rebalance_plan'
      ]
    },
    id: 'multi-008-rebalance-with-market',
    input: {
      query:
        'Assess concentration risk, quote MSFT, and tell me what to trim for rebalancing'
    },
    intent: 'rebalance-with-market'
  }),
  createEvalCase({
    category: 'multi_step',
    expected: {
      answerIncludes: ['Session memory applied from 1 prior turn(s).'],
      memoryTurnsAtLeast: 2,
      requiredTools: ['portfolio_analysis', 'risk_assessment', 'rebalance_plan']
    },
    id: 'multi-009-follow-up-with-memory',
    input: {
      query: 'Based on earlier context, rebalance and reassess risk again'
    },
    intent: 'follow-up-with-memory',
    setup: {
      llmThrows: true,
      storedMemoryTurns: ONE_TURN_MEMORY
    }
  }),
  createEvalCase({
    category: 'multi_step',
    expected: {
      requiredTools: [
        'portfolio_analysis',
        'risk_assessment',
        'market_data_lookup',
        'rebalance_plan',
        'stress_test'
      ],
      verificationChecks: [
        { check: 'rebalance_coverage', status: 'passed' },
        { check: 'stress_test_coherence', status: 'passed' }
      ]
    },
    id: 'multi-010-comprehensive-plan',
    input: {
      query:
        'Analyze portfolio allocation and concentration risk, check AAPL price, build a rebalance plan, and run a stress test'
    },
    intent: 'comprehensive-plan'
  })
];
