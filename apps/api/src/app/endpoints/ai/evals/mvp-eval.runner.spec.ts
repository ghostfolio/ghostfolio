import { DataSource } from '@prisma/client';

import { AiService } from '../ai.service';

import { AI_AGENT_MVP_EVAL_DATASET } from './mvp-eval.dataset';
import { runMvpEvalSuite } from './mvp-eval.runner';
import { AiAgentMvpEvalCase } from './mvp-eval.interfaces';

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
    redisCacheService as never
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
  it('contains at least five baseline MVP eval cases', () => {
    expect(AI_AGENT_MVP_EVAL_DATASET.length).toBeGreaterThanOrEqual(5);
  });

  it('passes the MVP eval suite with at least 80% success rate', async () => {
    const suiteResult = await runMvpEvalSuite({
      aiServiceFactory: (evalCase) => createAiServiceForCase(evalCase),
      cases: AI_AGENT_MVP_EVAL_DATASET
    });

    expect(suiteResult.passRate).toBeGreaterThanOrEqual(0.8);
    expect(
      suiteResult.results
        .filter(({ passed }) => !passed)
        .map(({ failures, id }) => {
          return `${id}: ${failures.join(' | ')}`;
        })
    ).toEqual([]);
  });
});
