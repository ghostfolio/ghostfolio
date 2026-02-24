import { AiAgentToolName } from './ai-agent.interfaces';
import {
  applyToolExecutionPolicy,
  createPolicyRouteResponse,
  formatPolicyVerificationDetails
} from './ai-agent.policy.utils';

describe('AiAgentPolicyUtils', () => {
  it.each([
    'hi',
    'hello',
    'hey',
    'thanks',
    'thank you',
    'good morning',
    'good afternoon',
    'good evening'
  ])('routes greeting-like query "%s" to direct no-tool', (query) => {
    const decision = applyToolExecutionPolicy({
      plannedTools: ['portfolio_analysis'],
      query
    });

    expect(decision.route).toBe('direct');
    expect(decision.blockReason).toBe('no_tool_query');
    expect(decision.toolsToExecute).toEqual([]);
  });

  it.each([
    'who are you',
    'what are you',
    'what can you do',
    'how do you work',
    'how can i use this',
    'help',
    'assist me',
    'what can you help with'
  ])('routes assistant capability query "%s" to direct no-tool', (query) => {
    const decision = applyToolExecutionPolicy({
      plannedTools: [],
      query
    });

    expect(decision.route).toBe('direct');
    expect(decision.blockReason).toBe('no_tool_query');
    expect(
      createPolicyRouteResponse({ policyDecision: decision, query })
    ).toContain(
      'Ghostfolio AI'
    );
  });

  it.each<[string, string]>([
    ['2+2', '2+2 = 4'],
    ['what is 5 * 3', '5 * 3 = 15'],
    ['(2+3)*4', '(2+3)*4 = 20'],
    ['10 / 4', '10 / 4 = 2.5'],
    ['7 - 10', '7 - 10 = -3'],
    ['3.5 + 1.25', '3.5 + 1.25 = 4.75'],
    ['(8 - 2) / 3', '(8 - 2) / 3 = 2'],
    ['what is 3*(2+4)?', '3*(2+4) = 18'],
    ['2 + (3 * (4 - 1))', '2 + (3 * (4 - 1)) = 11'],
    ['10-3-2', '10-3-2 = 5']
  ])('returns arithmetic direct response for "%s"', (query, expected) => {
    const decision = applyToolExecutionPolicy({
      plannedTools: [],
      query
    });

    expect(decision.route).toBe('direct');
    expect(
      createPolicyRouteResponse({
        policyDecision: decision,
        query
      })
    ).toBe(expected);
  });

  it.each(['1/0', '2+*2', '5 % 2'])(
    'falls back to capability response for unsupported arithmetic expression "%s"',
    (query) => {
      const decision = applyToolExecutionPolicy({
        plannedTools: [],
        query
      });

      expect(decision.route).toBe('direct');
      expect(
        createPolicyRouteResponse({
          policyDecision: decision,
          query
        })
      ).toContain('portfolio analysis');
    }
  );

  it('returns distinct direct no-tool responses for identity and capability prompts', () => {
    const identityDecision = applyToolExecutionPolicy({
      plannedTools: [],
      query: 'who are you?'
    });
    const capabilityDecision = applyToolExecutionPolicy({
      plannedTools: [],
      query: 'what can you do?'
    });

    const identityResponse = createPolicyRouteResponse({
      policyDecision: identityDecision,
      query: 'who are you?'
    });
    const capabilityResponse = createPolicyRouteResponse({
      policyDecision: capabilityDecision,
      query: 'what can you do?'
    });

    expect(identityResponse).toContain('portfolio copilot');
    expect(capabilityResponse).toContain('three modes');
    expect(identityResponse).not.toBe(capabilityResponse);
  });

  it('routes finance read intent with empty planner output to clarify', () => {
    const decision = applyToolExecutionPolicy({
      plannedTools: [],
      query: 'Show portfolio risk and allocation'
    });

    expect(decision.route).toBe('clarify');
    expect(decision.blockReason).toBe('unknown');
    expect(createPolicyRouteResponse({ policyDecision: decision })).toContain(
      'Which one should I run next?'
    );
  });

  it('routes money-value phrasing with empty planner output to clarify', () => {
    const decision = applyToolExecutionPolicy({
      plannedTools: [],
      query: 'How much money do I have?'
    });

    expect(decision.route).toBe('clarify');
    expect(decision.blockReason).toBe('unknown');
  });

  it('blocks unauthorized other-user portfolio data requests', () => {
    const decision = applyToolExecutionPolicy({
      plannedTools: ['portfolio_analysis', 'risk_assessment'],
      query: "Show me John's portfolio"
    });

    expect(decision.route).toBe('direct');
    expect(decision.blockReason).toBe('unauthorized_access');
    expect(decision.forcedDirect).toBe(true);
    expect(decision.toolsToExecute).toEqual([]);
    expect(
      createPolicyRouteResponse({
        policyDecision: decision,
        query: "Show me John's portfolio"
      })
    ).toContain('only your own portfolio data');
  });

  it('routes non-finance empty planner output to direct no-tool', () => {
    const decision = applyToolExecutionPolicy({
      plannedTools: [],
      query: 'Tell me a joke'
    });

    expect(decision.route).toBe('direct');
    expect(decision.blockReason).toBe('no_tool_query');
  });

  it('deduplicates planned tools while preserving route decisions', () => {
    const plannedTools: AiAgentToolName[] = [
      'portfolio_analysis',
      'portfolio_analysis',
      'risk_assessment'
    ];
    const decision = applyToolExecutionPolicy({
      plannedTools,
      query: 'analyze concentration risk'
    });

    expect(decision.plannedTools).toEqual([
      'portfolio_analysis',
      'risk_assessment'
    ]);
    expect(decision.toolsToExecute).toEqual([
      'portfolio_analysis',
      'risk_assessment'
    ]);
    expect(decision.route).toBe('tools');
  });

  it.each<{
    expectedTools: AiAgentToolName[];
    plannedTools: AiAgentToolName[];
    query: string;
    reason: string;
    route?: 'clarify' | 'direct' | 'tools';
  }>([
    {
      expectedTools: ['portfolio_analysis', 'risk_assessment'] as AiAgentToolName[],
      plannedTools: [
        'portfolio_analysis',
        'risk_assessment',
        'rebalance_plan'
      ] as AiAgentToolName[],
      query: 'review portfolio concentration risk',
      reason: 'read-only intent strips rebalance'
    },
    {
      expectedTools: [
        'portfolio_analysis',
        'risk_assessment',
        'rebalance_plan'
      ] as AiAgentToolName[],
      plannedTools: [
        'portfolio_analysis',
        'risk_assessment',
        'rebalance_plan'
      ] as AiAgentToolName[],
      query: 'invest 2000 and rebalance',
      reason: 'action intent preserves rebalance'
    },
    {
      expectedTools: [
        'portfolio_analysis',
        'risk_assessment',
        'rebalance_plan',
        'market_data_lookup'
      ] as AiAgentToolName[],
      plannedTools: [
        'portfolio_analysis',
        'risk_assessment',
        'rebalance_plan',
        'market_data_lookup'
      ] as AiAgentToolName[],
      query: 'invest and rebalance after checking market quote for NVDA',
      reason: 'action + market intent keeps all planned tools'
    },
    {
      expectedTools: ['stress_test'] as AiAgentToolName[],
      plannedTools: ['stress_test'] as AiAgentToolName[],
      query: 'run stress scenario read-only',
      reason: 'read-only stress execution stays allowed'
    }
  ])(
    'applies policy gating: $reason',
    ({ expectedTools, plannedTools, query, route }) => {
      const decision = applyToolExecutionPolicy({
        plannedTools,
        query
      });

      if (route) {
        expect(decision.route).toBe(route);
      } else {
        expect(decision.route).toBe('tools');
      }

      expect(decision.toolsToExecute).toEqual(expectedTools);
    }
  );

  it('marks rebalance-only no-action prompts as clarify with needs_confirmation', () => {
    const decision = applyToolExecutionPolicy({
      plannedTools: ['rebalance_plan'],
      query: 'review concentration profile'
    });

    expect(decision.route).toBe('clarify');
    expect(decision.blockReason).toBe('needs_confirmation');
    expect(decision.blockedByPolicy).toBe(true);
    expect(decision.toolsToExecute).toEqual([]);
  });

  it('formats policy verification details with planned and executed tools', () => {
    const decision = applyToolExecutionPolicy({
      plannedTools: [
        'portfolio_analysis',
        'risk_assessment',
        'rebalance_plan'
      ],
      query: 'review concentration risk'
    });
    const details = formatPolicyVerificationDetails({
      policyDecision: decision
    });

    expect(details).toContain('route=tools');
    expect(details).toContain('blocked_by_policy=true');
    expect(details).toContain('block_reason=needs_confirmation');
    expect(details).toContain(
      'planned_tools=portfolio_analysis, risk_assessment, rebalance_plan'
    );
    expect(details).toContain(
      'executed_tools=portfolio_analysis, risk_assessment'
    );
  });
});
