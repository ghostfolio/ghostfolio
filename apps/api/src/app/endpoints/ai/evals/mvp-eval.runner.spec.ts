import { DataSource } from '@prisma/client';

import { AiService } from '../ai.service';

import { AI_AGENT_MVP_EVAL_DATASET } from './mvp-eval.dataset';
import { runMvpEvalSuite } from './mvp-eval.runner';
import {
  AiAgentMvpEvalCase,
  AiAgentMvpEvalCategory
} from './mvp-eval.interfaces';

function createAiServiceForCase(evalCase: AiAgentMvpEvalCase) {
  const dataProviderService = {
    getQuotes: jest.fn()
  };
  const portfolioService = {
    getDetails: jest.fn()
  };
  const propertyService = {
    getByKey: jest.fn()
  };
  const redisCacheService = {
    get: jest.fn(),
    set: jest.fn()
  };
  const aiObservabilityService = {
    captureChatFailure: jest.fn().mockResolvedValue(undefined),
    captureChatSuccess: jest.fn().mockResolvedValue({
      latencyInMs: 10,
      tokenEstimate: { input: 1, output: 1, total: 2 },
      traceId: 'eval-trace'
    }),
    recordFeedback: jest.fn().mockResolvedValue(undefined)
  };

  portfolioService.getDetails.mockResolvedValue({
    holdings:
      evalCase.setup.holdings ??
      ({
        CASH: {
          allocationInPercentage: 1,
          dataSource: DataSource.MANUAL,
          symbol: 'CASH',
          valueInBaseCurrency: 1000
        }
      } as const)
  });

  dataProviderService.getQuotes.mockImplementation(
    async ({
      items
    }: {
      items: { dataSource: DataSource; symbol: string }[];
    }) => {
      if (evalCase.setup.marketDataErrorMessage) {
        throw new Error(evalCase.setup.marketDataErrorMessage);
      }

      const quotesBySymbol = evalCase.setup.quotesBySymbol ?? {};

      return items.reduce<Record<string, (typeof quotesBySymbol)[string]>>(
        (result, { symbol }) => {
          if (quotesBySymbol[symbol]) {
            result[symbol] = quotesBySymbol[symbol];
          }

          return result;
        },
        {}
      );
    }
  );

  redisCacheService.get.mockResolvedValue(
    evalCase.setup.storedMemoryTurns
      ? JSON.stringify({
          turns: evalCase.setup.storedMemoryTurns
        })
      : undefined
  );
  redisCacheService.set.mockResolvedValue(undefined);

  const aiService = new AiService(
    dataProviderService as never,
    portfolioService as never,
    propertyService as never,
    redisCacheService as never,
    aiObservabilityService as never
  );

  if (evalCase.setup.llmThrows) {
    jest.spyOn(aiService, 'generateText').mockRejectedValue(new Error('offline'));
  } else {
    jest.spyOn(aiService, 'generateText').mockResolvedValue({
      text: evalCase.setup.llmText ?? `Eval response for ${evalCase.id}`
    } as never);
  }

  return aiService;
}

describe('AiAgentMvpEvalSuite', () => {
  const originalLangChainTracingV2 = process.env.LANGCHAIN_TRACING_V2;
  const originalLangSmithTracing = process.env.LANGSMITH_TRACING;

  beforeAll(() => {
    process.env.LANGCHAIN_TRACING_V2 = 'false';
    process.env.LANGSMITH_TRACING = 'false';
  });

  afterAll(() => {
    if (originalLangChainTracingV2 === undefined) {
      delete process.env.LANGCHAIN_TRACING_V2;
    } else {
      process.env.LANGCHAIN_TRACING_V2 = originalLangChainTracingV2;
    }

    if (originalLangSmithTracing === undefined) {
      delete process.env.LANGSMITH_TRACING;
    } else {
      process.env.LANGSMITH_TRACING = originalLangSmithTracing;
    }
  });

  it('contains at least fifty eval cases with required category coverage', () => {
    const countsByCategory = AI_AGENT_MVP_EVAL_DATASET.reduce<
      Record<AiAgentMvpEvalCategory, number>
    >(
      (result, { category }) => {
        result[category] += 1;

        return result;
      },
      {
        adversarial: 0,
        edge_case: 0,
        happy_path: 0,
        multi_step: 0
      }
    );

    expect(AI_AGENT_MVP_EVAL_DATASET.length).toBeGreaterThanOrEqual(50);
    expect(countsByCategory.happy_path).toBeGreaterThanOrEqual(20);
    expect(countsByCategory.edge_case).toBeGreaterThanOrEqual(10);
    expect(countsByCategory.adversarial).toBeGreaterThanOrEqual(10);
    expect(countsByCategory.multi_step).toBeGreaterThanOrEqual(10);
  });

  it('passes the MVP eval suite with at least 80% success rate', async () => {
    const suiteResult = await runMvpEvalSuite({
      aiServiceFactory: (evalCase) => createAiServiceForCase(evalCase),
      cases: AI_AGENT_MVP_EVAL_DATASET
    });

    expect(suiteResult.passRate).toBeGreaterThanOrEqual(0.8);
    expect(suiteResult.categorySummaries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          category: 'happy_path',
          total: expect.any(Number)
        }),
        expect.objectContaining({
          category: 'edge_case',
          total: expect.any(Number)
        }),
        expect.objectContaining({
          category: 'adversarial',
          total: expect.any(Number)
        }),
        expect.objectContaining({
          category: 'multi_step',
          total: expect.any(Number)
        })
      ])
    );
    expect(suiteResult.hallucinationRate).toBeLessThanOrEqual(0.05);
    expect(suiteResult.verificationAccuracy).toBeGreaterThanOrEqual(0.9);
    expect(
      suiteResult.results
        .filter(({ passed }) => !passed)
        .map(({ failures, id }) => {
          return `${id}: ${failures.join(' | ')}`;
        })
    ).toEqual([]);
  });
});
