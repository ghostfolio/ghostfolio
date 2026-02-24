import { AiAgentToolName } from './ai-agent.interfaces';
import {
  applyToolExecutionPolicy,
  createPolicyRouteResponse
} from './ai-agent.policy.utils';
import { determineToolPlan } from './ai-agent.utils';

const GREETING_QUERIES = [
  'hi',
  'Hi!',
  'hello',
  'hello.',
  'hey?',
  'thanks',
  'thanks!',
  'thank you',
  'thank you.',
  'good morning',
  'Good morning!',
  'good afternoon',
  'good afternoon.',
  'good evening',
  'good evening?',
  ' hi ',
  'HELLO',
  'Hey!',
  'hi!!!',
  'hello??',
  'good morning.',
  'good afternoon?',
  'good evening!',
  'THANK YOU',
  'Thanks.'
];

const IDENTITY_AND_USAGE_QUERIES = [
  'who are you',
  'who are you?',
  'Who are you?',
  'what are you',
  'what are you?',
  'what can you do',
  'what can you do?',
  'What can you do?',
  'how do you work',
  'how do you work?',
  'how can i use this',
  'how can i use this?',
  'help',
  'Help',
  'help?',
  'assist me',
  'assist me?',
  'what can you help with',
  'what can you help with?',
  'What can you help with?'
];

const ARITHMETIC_CASES: Array<{ expected: string; query: string }> = [
  { expected: '2+2 = 4', query: '2+2' },
  { expected: '5*3 = 15', query: '5*3' },
  { expected: '10 / 4 = 2.5', query: '10 / 4' },
  { expected: '7-10 = -3', query: '7-10' },
  { expected: '(2+3)*4 = 20', query: '(2+3)*4' },
  { expected: '3.5 + 1.25 = 4.75', query: '3.5 + 1.25' },
  { expected: '2 + (3 * (4 - 1)) = 11', query: '2 + (3 * (4 - 1))' },
  { expected: '8/2 = 4', query: 'what is 8/2' },
  { expected: '14 - 6 = 8', query: 'what is 14 - 6' },
  { expected: '100-25*2 = 50', query: '100-25*2' },
  { expected: '9+9 = 18', query: '9+9' },
  { expected: '12 / 3 = 4', query: '12 / 3' },
  { expected: '6*7 = 42', query: '6*7' },
  { expected: '(5+5)/2 = 5', query: '(5+5)/2' },
  { expected: '4*(2+1) = 12', query: '4*(2+1)' },
  { expected: '50 - 7 = 43', query: '50 - 7' },
  { expected: '1.2 + 3.4 = 4.6', query: '1.2 + 3.4' },
  { expected: '18/6+2 = 5', query: '18/6+2' },
  { expected: '2*(2*(2+1)) = 12', query: '2*(2*(2+1))' },
  { expected: '99-9 = 90', query: '99-9' }
];

const PORTFOLIO_VALUE_QUERIES = [
  'How much money do I have?',
  'how much money i have?',
  'how much.i ahve money?',
  'how much cash do i have?',
  'how much value do i have?',
  'what is my account balance?',
  'what is my balance?',
  'what is my portfolio value?',
  'what is my portfolio worth?',
  'what is my net worth?',
  'tell me my account balance',
  'tell me my portfolio value',
  'show my account balance',
  'show my portfolio value',
  'show my portfolio worth',
  'show my net worth',
  'total portfolio value',
  'total account value',
  'what is the total value of my portfolio?',
  'what is the total value in my account?',
  'how much assets do i have?',
  'how much equity do i have?',
  'do i have enough money in my portfolio?',
  'do i have money in my account?',
  'tell me how much value my portfolio has'
];

const INVESTMENT_QUERIES = [
  'where should i invest',
  'where should i invest next',
  'where i should invest',
  'what should i invest in',
  'what should i do to invest',
  'what should i do with my portfolio',
  'what can i do to improve my portfolio',
  'how do i invest new money',
  'how do i rebalance',
  'invest 1000 usd',
  'allocate 2000 usd',
  'buy more diversified holdings',
  'sell overweight positions and rebalance',
  'trim my top holding and rebalance',
  'rebalance my portfolio',
  'rebalance and invest new cash',
  'where should i allocate new money',
  'how should i allocate this month',
  'invest and rebalance for lower risk',
  'buy and rebalance based on risk',
  'sell and rotate into diversified assets',
  'what should i do next with this portfolio',
  'how do i add money without increasing concentration',
  'invest next contribution into safer mix',
  'allocate next cash to lower risk positions'
];
const ACTION_CONFIRMATION_PATTERN = /\b(?:allocat|buy|invest|rebalanc|sell|trim)\b/i;

describe('AiAgentSimpleInteractions', () => {
  it('supports 100+ simple user commands with expected routing behavior', () => {
    let evaluatedQueries = 0;

    for (const query of GREETING_QUERIES) {
      const plannedTools = determineToolPlan({ query });
      const decision = applyToolExecutionPolicy({ plannedTools, query });
      const response = createPolicyRouteResponse({
        policyDecision: decision,
        query
      });

      expect(decision.route).toBe('direct');
      expect(decision.toolsToExecute).toEqual([]);
      expect(response).toContain('Ghostfolio AI');
      evaluatedQueries += 1;
    }

    for (const query of IDENTITY_AND_USAGE_QUERIES) {
      const plannedTools = determineToolPlan({ query });
      const decision = applyToolExecutionPolicy({ plannedTools, query });
      const response = createPolicyRouteResponse({
        policyDecision: decision,
        query
      });

      expect(decision.route).toBe('direct');
      expect(decision.toolsToExecute).toEqual([]);
      expect(response).toContain('Ghostfolio AI');
      evaluatedQueries += 1;
    }

    for (const { expected, query } of ARITHMETIC_CASES) {
      const plannedTools = determineToolPlan({ query });
      const decision = applyToolExecutionPolicy({ plannedTools, query });
      const response = createPolicyRouteResponse({
        policyDecision: decision,
        query
      });

      expect(decision.route).toBe('direct');
      expect(decision.toolsToExecute).toEqual([]);
      expect(response).toBe(expected);
      evaluatedQueries += 1;
    }

    for (const query of PORTFOLIO_VALUE_QUERIES) {
      const plannedTools = determineToolPlan({ query });
      const decision = applyToolExecutionPolicy({ plannedTools, query });

      expect(plannedTools).toContain('portfolio_analysis');
      expect(decision.route).toBe('tools');
      expect(decision.toolsToExecute).toContain(
        'portfolio_analysis' as AiAgentToolName
      );
      evaluatedQueries += 1;
    }

    for (const query of INVESTMENT_QUERIES) {
      const plannedTools = determineToolPlan({ query });
      const decision = applyToolExecutionPolicy({ plannedTools, query });
      const hasActionConfirmationSignal = ACTION_CONFIRMATION_PATTERN.test(
        query.toLowerCase()
      );

      expect(plannedTools).toEqual(
        expect.arrayContaining([
          'portfolio_analysis' as AiAgentToolName,
          'risk_assessment' as AiAgentToolName,
          'rebalance_plan' as AiAgentToolName
        ])
      );
      expect(decision.route).toBe('tools');
      expect(decision.toolsToExecute).toEqual(
        expect.arrayContaining([
          'portfolio_analysis' as AiAgentToolName,
          'risk_assessment' as AiAgentToolName
        ])
      );

      if (hasActionConfirmationSignal) {
        expect(decision.toolsToExecute).toContain(
          'rebalance_plan' as AiAgentToolName
        );
      }
      evaluatedQueries += 1;
    }

    expect(evaluatedQueries).toBeGreaterThanOrEqual(100);
  });
});
