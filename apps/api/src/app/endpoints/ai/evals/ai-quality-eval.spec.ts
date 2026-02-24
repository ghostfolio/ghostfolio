import { DataSource } from '@prisma/client';

import { AiService } from '../ai.service';

function createSubject({
  llmText
}: {
  llmText: string;
}) {
  const dataProviderService = {
    getQuotes: jest.fn().mockImplementation(async () => {
      return {
        AAPL: {
          currency: 'USD',
          marketPrice: 212.34,
          marketState: 'REGULAR'
        },
        MSFT: {
          currency: 'USD',
          marketPrice: 451.2,
          marketState: 'REGULAR'
        }
      };
    })
  };
  const portfolioService = {
    getDetails: jest.fn().mockResolvedValue({
      holdings: {
        AAPL: {
          allocationInPercentage: 0.62,
          dataSource: DataSource.YAHOO,
          symbol: 'AAPL',
          valueInBaseCurrency: 6200
        },
        MSFT: {
          allocationInPercentage: 0.23,
          dataSource: DataSource.YAHOO,
          symbol: 'MSFT',
          valueInBaseCurrency: 2300
        },
        BND: {
          allocationInPercentage: 0.15,
          dataSource: DataSource.YAHOO,
          symbol: 'BND',
          valueInBaseCurrency: 1500
        }
      }
    })
  };
  const propertyService = {
    getByKey: jest.fn()
  };
  const redisCacheService = {
    get: jest.fn().mockResolvedValue(undefined),
    set: jest.fn().mockResolvedValue(undefined)
  };
  const aiObservabilityService = {
    captureChatFailure: jest.fn().mockResolvedValue(undefined),
    captureChatSuccess: jest.fn().mockResolvedValue({
      latencyBreakdownInMs: {
        llmGenerationInMs: 10,
        memoryReadInMs: 1,
        memoryWriteInMs: 1,
        toolExecutionInMs: 4
      },
      latencyInMs: 20,
      tokenEstimate: {
        input: 12,
        output: 32,
        total: 44
      },
      traceId: 'quality-eval-trace'
    }),
    recordLlmInvocation: jest.fn().mockResolvedValue(undefined),
    recordFeedback: jest.fn().mockResolvedValue(undefined)
  };

  const subject = new AiService(
    dataProviderService as never,
    portfolioService as never,
    propertyService as never,
    redisCacheService as never,
    aiObservabilityService as never
  );

  jest.spyOn(subject, 'generateText').mockResolvedValue({
    text: llmText
  } as never);

  return subject;
}

describe('AiReplyQualityEval', () => {
  it('falls back to deterministic response when model text is a disclaimer', async () => {
    const subject = createSubject({
      llmText:
        'As an AI, I cannot provide financial advice. Please consult a financial advisor.'
    });

    const response = await subject.chat({
      languageCode: 'en',
      query: 'I want to invest new cash and rebalance concentration risk',
      sessionId: 'quality-eval-fallback',
      userCurrency: 'USD',
      userId: 'quality-user'
    });

    expect(response.answer).toContain('Next-step allocation:');
    expect(response.answer).toContain('Largest long allocations:');
    expect(response.answer).not.toContain('As an AI');
    expect(response.verification).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          check: 'response_quality',
          status: 'passed'
        })
      ])
    );
  });

  it('keeps high-quality generated response when guidance is concrete', async () => {
    const generatedText =
      'Trim AAPL by 5% and allocate the next 1000 USD to MSFT and BND. This lowers top-position concentration and keeps portfolio risk balanced.';
    const subject = createSubject({
      llmText: generatedText
    });

    const response = await subject.chat({
      languageCode: 'en',
      query: 'How should I rebalance and invest next month?',
      sessionId: 'quality-eval-generated',
      userCurrency: 'USD',
      userId: 'quality-user'
    });

    expect(response.answer).toBe(generatedText);
    expect(response.verification).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          check: 'response_quality',
          status: 'passed'
        })
      ])
    );
  });

  it('adds quantitative evidence when model output is too short for market+risk query', async () => {
    const subject = createSubject({
      llmText: 'Looks strong overall.'
    });

    const response = await subject.chat({
      languageCode: 'en',
      query: 'Analyze my risk and latest market price for AAPL',
      sessionId: 'quality-eval-numeric',
      userCurrency: 'USD',
      userId: 'quality-user'
    });

    expect(response.answer).toContain('Market snapshot:');
    expect(response.answer).toMatch(/\d/);
    expect(response.verification).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          check: 'response_quality',
          status: 'passed'
        })
      ])
    );
  });
});
