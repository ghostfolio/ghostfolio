const mockClientConstructor = jest.fn();
const mockRunTreeConstructor = jest.fn();

jest.mock('langsmith', () => {
  return {
    Client: mockClientConstructor,
    RunTree: mockRunTreeConstructor
  };
});

import { AiObservabilityService } from './ai-observability.service';

function createResponse() {
  return {
    answer: 'Portfolio remains concentrated in one holding.',
    citations: [],
    confidence: {
      band: 'medium' as const,
      score: 0.72
    },
    memory: {
      sessionId: 'session-1',
      turns: 1
    },
    toolCalls: [],
    verification: []
  };
}

describe('AiObservabilityService', () => {
  const originalLangChainApiKey = process.env.LANGCHAIN_API_KEY;
  const originalLangChainTracingV2 = process.env.LANGCHAIN_TRACING_V2;
  const originalLangSmithApiKey = process.env.LANGSMITH_API_KEY;
  const originalLangSmithTracing = process.env.LANGSMITH_TRACING;

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.LANGCHAIN_API_KEY;
    delete process.env.LANGCHAIN_TRACING_V2;
    delete process.env.LANGSMITH_API_KEY;
    delete process.env.LANGSMITH_TRACING;
  });

  afterAll(() => {
    if (originalLangChainApiKey === undefined) {
      delete process.env.LANGCHAIN_API_KEY;
    } else {
      process.env.LANGCHAIN_API_KEY = originalLangChainApiKey;
    }

    if (originalLangChainTracingV2 === undefined) {
      delete process.env.LANGCHAIN_TRACING_V2;
    } else {
      process.env.LANGCHAIN_TRACING_V2 = originalLangChainTracingV2;
    }

    if (originalLangSmithApiKey === undefined) {
      delete process.env.LANGSMITH_API_KEY;
    } else {
      process.env.LANGSMITH_API_KEY = originalLangSmithApiKey;
    }

    if (originalLangSmithTracing === undefined) {
      delete process.env.LANGSMITH_TRACING;
    } else {
      process.env.LANGSMITH_TRACING = originalLangSmithTracing;
    }
  });

  it('keeps tracing disabled when env contains placeholder api key', async () => {
    process.env.LANGSMITH_TRACING = 'true';
    process.env.LANGSMITH_API_KEY = '<INSERT_LANGSMITH_API_KEY>';

    const subject = new AiObservabilityService();

    const snapshot = await subject.captureChatSuccess({
      durationInMs: 42,
      latencyBreakdownInMs: {
        llmGenerationInMs: 20,
        memoryReadInMs: 5,
        memoryWriteInMs: 6,
        toolExecutionInMs: 11
      },
      query: 'Summarize my risk.',
      response: createResponse(),
      sessionId: 'session-1',
      userId: 'user-1'
    });

    expect(snapshot.latencyInMs).toBe(42);
    expect(snapshot.tokenEstimate.total).toBeGreaterThan(0);
    expect(snapshot.traceId).toBeDefined();
    expect(mockClientConstructor).not.toHaveBeenCalled();
    expect(mockRunTreeConstructor).not.toHaveBeenCalled();
  });

  it('returns immediately even when LangSmith run posting hangs', async () => {
    process.env.LANGSMITH_TRACING = 'true';
    process.env.LANGSMITH_API_KEY = 'lsv2_test_key';

    mockRunTreeConstructor.mockImplementation(() => {
      return {
        createChild: jest.fn(),
        end: jest.fn(),
        patchRun: jest.fn().mockResolvedValue(undefined),
        postRun: jest.fn().mockImplementation(() => {
          return new Promise<void>(() => undefined);
        })
      };
    });

    const subject = new AiObservabilityService();

    const result = await Promise.race([
      subject.captureChatSuccess({
        durationInMs: 35,
        latencyBreakdownInMs: {
          llmGenerationInMs: 18,
          memoryReadInMs: 4,
          memoryWriteInMs: 5,
          toolExecutionInMs: 8
        },
        query: 'Show latest market prices for NVDA.',
        response: createResponse(),
        sessionId: 'session-2',
        userId: 'user-2'
      }),
      new Promise<'timeout'>((resolve) => {
        setTimeout(() => resolve('timeout'), 50);
      })
    ]);

    expect(result).not.toBe('timeout');
    expect(mockClientConstructor).toHaveBeenCalledTimes(1);
    expect(mockRunTreeConstructor).toHaveBeenCalledTimes(1);
  });
});
