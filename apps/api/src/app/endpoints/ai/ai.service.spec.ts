import { DataSource } from '@prisma/client';

import { AiService } from './ai.service';

describe('AiService', () => {
  let dataProviderService: { getQuotes: jest.Mock };
  let portfolioService: { getDetails: jest.Mock };
  let propertyService: { getByKey: jest.Mock };
  let redisCacheService: { get: jest.Mock; set: jest.Mock };
  let subject: AiService;
  const originalFetch = global.fetch;
  const originalMinimaxApiKey = process.env.minimax_api_key;
  const originalMinimaxModel = process.env.minimax_model;
  const originalZAiGlmApiKey = process.env.z_ai_glm_api_key;
  const originalZAiGlmModel = process.env.z_ai_glm_model;

  beforeEach(() => {
    dataProviderService = {
      getQuotes: jest.fn()
    };
    portfolioService = {
      getDetails: jest.fn()
    };
    propertyService = {
      getByKey: jest.fn()
    };
    redisCacheService = {
      get: jest.fn(),
      set: jest.fn()
    };

    subject = new AiService(
      dataProviderService as never,
      portfolioService as never,
      propertyService as never,
      redisCacheService as never
    );

    delete process.env.minimax_api_key;
    delete process.env.minimax_model;
    delete process.env.z_ai_glm_api_key;
    delete process.env.z_ai_glm_model;
  });

  afterAll(() => {
    global.fetch = originalFetch;

    if (originalMinimaxApiKey === undefined) {
      delete process.env.minimax_api_key;
    } else {
      process.env.minimax_api_key = originalMinimaxApiKey;
    }

    if (originalMinimaxModel === undefined) {
      delete process.env.minimax_model;
    } else {
      process.env.minimax_model = originalMinimaxModel;
    }

    if (originalZAiGlmApiKey === undefined) {
      delete process.env.z_ai_glm_api_key;
    } else {
      process.env.z_ai_glm_api_key = originalZAiGlmApiKey;
    }

    if (originalZAiGlmModel === undefined) {
      delete process.env.z_ai_glm_model;
    } else {
      process.env.z_ai_glm_model = originalZAiGlmModel;
    }
  });

  it('runs portfolio, risk, and market tools with structured response fields', async () => {
    portfolioService.getDetails.mockResolvedValue({
      holdings: {
        AAPL: {
          allocationInPercentage: 0.6,
          dataSource: DataSource.YAHOO,
          symbol: 'AAPL',
          valueInBaseCurrency: 6000
        },
        MSFT: {
          allocationInPercentage: 0.4,
          dataSource: DataSource.YAHOO,
          symbol: 'MSFT',
          valueInBaseCurrency: 4000
        }
      }
    });
    dataProviderService.getQuotes.mockResolvedValue({
      AAPL: {
        currency: 'USD',
        marketPrice: 210.12,
        marketState: 'REGULAR'
      },
      MSFT: {
        currency: 'USD',
        marketPrice: 455.9,
        marketState: 'REGULAR'
      }
    });
    redisCacheService.get.mockResolvedValue(undefined);
    jest.spyOn(subject, 'generateText').mockResolvedValue({
      text: 'Portfolio risk looks medium with strong concentration controls.'
    } as never);

    const result = await subject.chat({
      languageCode: 'en',
      query: 'Analyze my portfolio risk and price for AAPL',
      sessionId: 'session-1',
      userCurrency: 'USD',
      userId: 'user-1'
    });

    expect(result.answer).toContain('Portfolio risk');
    expect(result.toolCalls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          status: 'success',
          tool: 'portfolio_analysis'
        }),
        expect.objectContaining({
          status: 'success',
          tool: 'risk_assessment'
        }),
        expect.objectContaining({
          status: 'success',
          tool: 'market_data_lookup'
        })
      ])
    );
    expect(result.citations.length).toBeGreaterThan(0);
    expect(result.confidence.score).toBeGreaterThanOrEqual(0);
    expect(result.confidence.score).toBeLessThanOrEqual(1);
    expect(result.verification).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ check: 'numerical_consistency' }),
        expect.objectContaining({ check: 'tool_execution' }),
        expect.objectContaining({ check: 'output_completeness' }),
        expect.objectContaining({ check: 'citation_coverage' })
      ])
    );
    expect(result.memory).toEqual({
      sessionId: 'session-1',
      turns: 1
    });
    expect(redisCacheService.set).toHaveBeenCalledWith(
      'ai-agent-memory-user-1-session-1',
      expect.any(String),
      expect.any(Number)
    );
  });

  it('keeps memory history and caps turns at the configured limit', async () => {
    const previousTurns = Array.from({ length: 10 }, (_, index) => {
      return {
        answer: `answer-${index}`,
        query: `query-${index}`,
        timestamp: `2026-02-20T00:0${index}:00.000Z`,
        toolCalls: [{ status: 'success', tool: 'portfolio_analysis' }]
      };
    });

    portfolioService.getDetails.mockResolvedValue({
      holdings: {}
    });
    redisCacheService.get.mockResolvedValue(
      JSON.stringify({
        turns: previousTurns
      })
    );
    jest.spyOn(subject, 'generateText').mockRejectedValue(new Error('offline'));

    const result = await subject.chat({
      languageCode: 'en',
      query: 'Show my portfolio overview',
      sessionId: 'session-memory',
      userCurrency: 'USD',
      userId: 'user-memory'
    });

    expect(result.memory.turns).toBe(10);
    const [, payload] = redisCacheService.set.mock.calls[0];
    const persistedMemory = JSON.parse(payload as string);
    expect(persistedMemory.turns).toHaveLength(10);
    expect(
      persistedMemory.turns.find(
        ({ query }: { query: string }) => query === 'query-0'
      )
    ).toBeUndefined();
  });

  it('runs rebalance and stress test tools for portfolio scenario prompts', async () => {
    portfolioService.getDetails.mockResolvedValue({
      holdings: {
        AAPL: {
          allocationInPercentage: 0.6,
          dataSource: DataSource.YAHOO,
          symbol: 'AAPL',
          valueInBaseCurrency: 6000
        },
        MSFT: {
          allocationInPercentage: 0.4,
          dataSource: DataSource.YAHOO,
          symbol: 'MSFT',
          valueInBaseCurrency: 4000
        }
      }
    });
    redisCacheService.get.mockResolvedValue(undefined);
    jest.spyOn(subject, 'generateText').mockResolvedValue({
      text: 'Trim AAPL toward target allocation and monitor stress drawdown.'
    } as never);

    const result = await subject.chat({
      languageCode: 'en',
      query: 'Rebalance my portfolio and run a stress test',
      sessionId: 'session-core-tools',
      userCurrency: 'USD',
      userId: 'user-core-tools'
    });

    expect(result.toolCalls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ tool: 'portfolio_analysis' }),
        expect.objectContaining({ tool: 'risk_assessment' }),
        expect.objectContaining({ tool: 'rebalance_plan' }),
        expect.objectContaining({ tool: 'stress_test' })
      ])
    );
    expect(result.verification).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          check: 'rebalance_coverage',
          status: 'passed'
        }),
        expect.objectContaining({
          check: 'stress_test_coherence',
          status: 'passed'
        })
      ])
    );
  });

  it('returns graceful failure metadata when a tool execution fails', async () => {
    dataProviderService.getQuotes.mockRejectedValue(
      new Error('market provider unavailable')
    );
    redisCacheService.get.mockResolvedValue(undefined);
    jest.spyOn(subject, 'generateText').mockResolvedValue({
      text: 'Market data currently has limited availability.'
    } as never);

    const result = await subject.chat({
      languageCode: 'en',
      query: 'What is the current price of NVDA?',
      sessionId: 'session-failure',
      userCurrency: 'USD',
      userId: 'user-failure'
    });

    expect(result.toolCalls).toEqual([
      expect.objectContaining({
        outputSummary: 'market provider unavailable',
        status: 'failed',
        tool: 'market_data_lookup'
      })
    ]);
    expect(result.verification).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          check: 'numerical_consistency',
          status: 'warning'
        }),
        expect.objectContaining({
          check: 'tool_execution',
          status: 'warning'
        })
      ])
    );
    expect(result.answer).toContain('limited availability');
  });

  it('flags numerical consistency warning when allocation sum exceeds tolerance', async () => {
    portfolioService.getDetails.mockResolvedValue({
      holdings: {
        AAPL: {
          allocationInPercentage: 0.8,
          dataSource: DataSource.YAHOO,
          symbol: 'AAPL',
          valueInBaseCurrency: 8000
        },
        MSFT: {
          allocationInPercentage: 0.3,
          dataSource: DataSource.YAHOO,
          symbol: 'MSFT',
          valueInBaseCurrency: 3000
        }
      }
    });
    redisCacheService.get.mockResolvedValue(undefined);
    jest.spyOn(subject, 'generateText').mockRejectedValue(new Error('offline'));

    const result = await subject.chat({
      languageCode: 'en',
      query: 'Show portfolio allocation',
      sessionId: 'session-allocation-warning',
      userCurrency: 'USD',
      userId: 'user-allocation-warning'
    });

    expect(result.verification).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          check: 'numerical_consistency',
          status: 'warning'
        })
      ])
    );
  });

  it('flags market data coverage warning when only part of symbols resolve', async () => {
    dataProviderService.getQuotes.mockResolvedValue({
      AAPL: {
        currency: 'USD',
        marketPrice: 210.12,
        marketState: 'REGULAR'
      }
    });
    redisCacheService.get.mockResolvedValue(undefined);
    jest.spyOn(subject, 'generateText').mockResolvedValue({
      text: 'Partial market data was returned.'
    } as never);

    const result = await subject.chat({
      languageCode: 'en',
      query: 'Get market prices for AAPL and TSLA',
      sessionId: 'session-market-coverage-warning',
      symbols: ['AAPL', 'TSLA'],
      userCurrency: 'USD',
      userId: 'user-market-coverage-warning'
    });

    expect(result.verification).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          check: 'market_data_coverage',
          status: 'warning'
        })
      ])
    );
  });

  it('uses z.ai glm provider when z_ai_glm_api_key is available', async () => {
    process.env.z_ai_glm_api_key = 'zai-key';
    process.env.z_ai_glm_model = 'glm-5';

    const fetchMock = jest.fn().mockResolvedValue({
      json: jest.fn().mockResolvedValue({
        choices: [{ message: { content: 'zai-response' } }]
      }),
      ok: true
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await subject.generateText({
      prompt: 'hello'
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.z.ai/api/paas/v4/chat/completions',
      expect.objectContaining({
        method: 'POST'
      })
    );
    expect(result).toEqual({
      text: 'zai-response'
    });
    expect(propertyService.getByKey).not.toHaveBeenCalled();
  });

  it('falls back to minimax when z.ai request fails', async () => {
    process.env.z_ai_glm_api_key = 'zai-key';
    process.env.minimax_api_key = 'minimax-key';
    process.env.minimax_model = 'MiniMax-M2.5';

    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 500
      })
      .mockResolvedValueOnce({
        json: jest.fn().mockResolvedValue({
          choices: [{ message: { content: 'minimax-response' } }]
        }),
        ok: true
      });
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await subject.generateText({
      prompt: 'fallback test'
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'https://api.z.ai/api/paas/v4/chat/completions',
      expect.any(Object)
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'https://api.minimax.io/v1/chat/completions',
      expect.any(Object)
    );
    expect(result).toEqual({
      text: 'minimax-response'
    });
  });
});
