import { DataSource } from '@prisma/client';

import {
  buildAnswer,
  createPreferenceSummaryResponse,
  getUserPreferences,
  isPreferenceRecallQuery,
  resolvePreferenceUpdate
} from './ai-agent.chat.helpers';

describe('AiAgentChatHelpers', () => {
  const originalLlmTimeout = process.env.AI_AGENT_LLM_TIMEOUT_IN_MS;

  afterEach(() => {
    if (originalLlmTimeout === undefined) {
      delete process.env.AI_AGENT_LLM_TIMEOUT_IN_MS;
    } else {
      process.env.AI_AGENT_LLM_TIMEOUT_IN_MS = originalLlmTimeout;
    }
  });

  it('returns deterministic fallback when llm generation exceeds timeout', async () => {
    process.env.AI_AGENT_LLM_TIMEOUT_IN_MS = '20';

    const startedAt = Date.now();
    const answer = await buildAnswer({
      generateText: () => {
        return new Promise<{ text?: string }>(() => undefined);
      },
      languageCode: 'en',
      memory: { turns: [] },
      portfolioAnalysis: {
        allocationSum: 1,
        holdings: [
          {
            allocationInPercentage: 0.6,
            dataSource: DataSource.YAHOO,
            symbol: 'AAPL',
            valueInBaseCurrency: 6000
          },
          {
            allocationInPercentage: 0.4,
            dataSource: DataSource.YAHOO,
            symbol: 'MSFT',
            valueInBaseCurrency: 4000
          }
        ],
        holdingsCount: 2,
        totalValueInBaseCurrency: 10000
      },
      query: 'Show my portfolio allocation overview',
      userCurrency: 'USD'
    });

    expect(Date.now() - startedAt).toBeLessThan(400);
    expect(answer).toContain('Largest long allocations:');
  });

  it('keeps generated response when answer passes reliability gate', async () => {
    const generatedText =
      'Trim AAPL by 5% and allocate the next 1000 USD toward MSFT and BND. This lowers concentration risk and improves balance.';

    const answer = await buildAnswer({
      generateText: jest.fn().mockResolvedValue({
        text: generatedText
      }),
      languageCode: 'en',
      memory: { turns: [] },
      query: 'How should I rebalance and invest next?',
      userCurrency: 'USD'
    });

    expect(answer).toBe(generatedText);
  });

  it('parses and persists concise response-style preference updates', () => {
    const result = resolvePreferenceUpdate({
      query: 'Remember to keep responses concise.',
      userPreferences: {}
    });

    expect(result.shouldPersist).toBe(true);
    expect(result.userPreferences.responseStyle).toBe('concise');
    expect(result.acknowledgement).toContain('Saved preference');
  });

  it('recognizes preference recall queries and renders deterministic summary', () => {
    expect(isPreferenceRecallQuery('What do you remember about me?')).toBe(true);
    expect(
      createPreferenceSummaryResponse({
        userPreferences: {
          responseStyle: 'concise',
          updatedAt: '2026-02-24T10:00:00.000Z'
        }
      })
    ).toContain('response style: concise');
  });

  it('returns empty preferences for malformed user preference payload', async () => {
    const redisCacheService = {
      get: jest.fn().mockResolvedValue('{bad-json')
    };

    const result = await getUserPreferences({
      redisCacheService: redisCacheService as never,
      userId: 'user-1'
    });

    expect(result).toEqual({});
  });
});
