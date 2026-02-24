import { DataSource } from '@prisma/client';

import { AiService } from './ai.service';

const ITERATIONS_SINGLE_TOOL = 30;
const ITERATIONS_MULTI_TOOL = 30;
const SINGLE_TOOL_P95_TARGET_IN_MS = 5_000;
const MULTI_TOOL_P95_TARGET_IN_MS = 15_000;

function percentile(values: number[], p: number) {
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil(p * sorted.length) - 1)
  );

  return sorted[index];
}

function avg(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function createAiServiceForPerformanceTests() {
  const dataProviderService = {
    getQuotes: jest.fn().mockResolvedValue({
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
    })
  };
  const portfolioService = {
    getDetails: jest.fn().mockResolvedValue({
      holdings: {
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
        llmGenerationInMs: 1,
        memoryReadInMs: 1,
        memoryWriteInMs: 1,
        toolExecutionInMs: 1
      },
      latencyInMs: 4,
      tokenEstimate: { input: 10, output: 10, total: 20 },
      traceId: 'perf-trace'
    }),
    recordFeedback: jest.fn().mockResolvedValue(undefined)
  };

  const aiService = new AiService(
    dataProviderService as never,
    portfolioService as never,
    propertyService as never,
    redisCacheService as never,
    aiObservabilityService as never
  );

  jest.spyOn(aiService, 'generateText').mockResolvedValue({
    text: 'Performance test response'
  } as never);

  return aiService;
}

async function measureLatencyInMs(operation: () => Promise<unknown>) {
  const startedAt = performance.now();
  await operation();

  return performance.now() - startedAt;
}

describe('AiService Performance', () => {
  it(`keeps single-tool p95 latency under ${SINGLE_TOOL_P95_TARGET_IN_MS}ms`, async () => {
    const aiService = createAiServiceForPerformanceTests();
    const latencies: number[] = [];

    for (let index = 0; index < ITERATIONS_SINGLE_TOOL; index++) {
      latencies.push(
        await measureLatencyInMs(async () => {
          await aiService.chat({
            languageCode: 'en',
            query: 'Give me a quick portfolio allocation overview',
            sessionId: `perf-single-${index}`,
            userCurrency: 'USD',
            userId: 'perf-user'
          });
        })
      );
    }

    const p95 = percentile(latencies, 0.95);
    const average = avg(latencies);

    console.info(
      JSON.stringify({
        averageInMs: Number(average.toFixed(2)),
        metric: 'single_tool_latency',
        p95InMs: Number(p95.toFixed(2)),
        targetInMs: SINGLE_TOOL_P95_TARGET_IN_MS
      })
    );

    expect(p95).toBeLessThan(SINGLE_TOOL_P95_TARGET_IN_MS);
  });

  it(`keeps multi-step p95 latency under ${MULTI_TOOL_P95_TARGET_IN_MS}ms`, async () => {
    const aiService = createAiServiceForPerformanceTests();
    const latencies: number[] = [];

    for (let index = 0; index < ITERATIONS_MULTI_TOOL; index++) {
      latencies.push(
        await measureLatencyInMs(async () => {
          await aiService.chat({
            languageCode: 'en',
            query:
              'Analyze risk, check AAPL price, rebalance my allocation, and run a stress test',
            sessionId: `perf-multi-${index}`,
            symbols: ['AAPL'],
            userCurrency: 'USD',
            userId: 'perf-user'
          });
        })
      );
    }

    const p95 = percentile(latencies, 0.95);
    const average = avg(latencies);

    console.info(
      JSON.stringify({
        averageInMs: Number(average.toFixed(2)),
        metric: 'multi_step_latency',
        p95InMs: Number(p95.toFixed(2)),
        targetInMs: MULTI_TOOL_P95_TARGET_IN_MS
      })
    );

    expect(p95).toBeLessThan(MULTI_TOOL_P95_TARGET_IN_MS);
  });
});
