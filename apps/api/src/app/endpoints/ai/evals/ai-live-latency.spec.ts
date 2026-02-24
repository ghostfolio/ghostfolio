import { DataSource } from '@prisma/client';

import { AiService } from '../ai.service';

const DEFAULT_BENCHMARK_ITERATIONS = 3;
const DEFAULT_ALLOWED_FAILURES = 1;
const LIVE_SINGLE_TOOL_TARGET_IN_MS = 5_000;
const LIVE_MULTI_STEP_TARGET_IN_MS = 15_000;

function hasLiveProviderKey() {
  return Boolean(
    process.env.z_ai_glm_api_key ||
      process.env.Z_AI_GLM_API_KEY ||
      process.env.minimax_api_key ||
      process.env.MINIMAX_API_KEY
  );
}

function parseIntegerEnv(name: string, fallback: number) {
  const parsed = Number.parseInt(process.env[name] ?? '', 10);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function percentile(values: number[], quantile: number) {
  const sortedValues = [...values].sort((a, b) => a - b);

  if (sortedValues.length === 0) {
    return 0;
  }

  const index = Math.min(
    sortedValues.length - 1,
    Math.ceil(sortedValues.length * quantile) - 1
  );

  return sortedValues[index];
}

function createLiveBenchmarkSubject() {
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
        },
        NVDA: {
          currency: 'USD',
          marketPrice: 905.7,
          marketState: 'REGULAR'
        }
      };
    })
  };
  const portfolioService = {
    getDetails: jest.fn().mockResolvedValue({
      holdings: {
        AAPL: {
          allocationInPercentage: 0.52,
          dataSource: DataSource.YAHOO,
          symbol: 'AAPL',
          valueInBaseCurrency: 5200
        },
        MSFT: {
          allocationInPercentage: 0.28,
          dataSource: DataSource.YAHOO,
          symbol: 'MSFT',
          valueInBaseCurrency: 2800
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
        llmGenerationInMs: 0,
        memoryReadInMs: 0,
        memoryWriteInMs: 0,
        toolExecutionInMs: 0
      },
      latencyInMs: 0,
      tokenEstimate: {
        input: 0,
        output: 0,
        total: 0
      },
      traceId: 'live-benchmark'
    }),
    recordLlmInvocation: jest.fn().mockResolvedValue(undefined),
    recordFeedback: jest.fn().mockResolvedValue(undefined)
  };

  return new AiService(
    dataProviderService as never,
    portfolioService as never,
    propertyService as never,
    redisCacheService as never,
    aiObservabilityService as never
  );
}

async function runLiveBenchmark({
  query,
  sessionPrefix,
  subject
}: {
  query: string;
  sessionPrefix: string;
  subject: AiService;
}) {
  const iterations = parseIntegerEnv(
    'AI_LIVE_BENCHMARK_ITERATIONS',
    DEFAULT_BENCHMARK_ITERATIONS
  );
  const allowedFailures = parseIntegerEnv(
    'AI_LIVE_BENCHMARK_MAX_FAILURES',
    DEFAULT_ALLOWED_FAILURES
  );
  const durationsInMs: number[] = [];
  let failures = 0;

  for (let index = 0; index < iterations; index++) {
    const startedAt = Date.now();

    try {
      const response = await subject.chat({
        languageCode: 'en',
        query,
        sessionId: `${sessionPrefix}-${index}`,
        userCurrency: 'USD',
        userId: 'live-benchmark-user'
      });

      if (response.answer.trim().length === 0) {
        failures += 1;
      }
    } catch {
      failures += 1;
    } finally {
      durationsInMs.push(Date.now() - startedAt);
    }
  }

  const averageInMs =
    durationsInMs.reduce((sum, duration) => sum + duration, 0) /
    durationsInMs.length;

  expect(failures).toBeLessThanOrEqual(allowedFailures);

  return {
    averageInMs,
    failures,
    iterations,
    p95InMs: percentile(durationsInMs, 0.95)
  };
}

const shouldRunLiveBenchmark =
  process.env.AI_LIVE_BENCHMARK === 'true' && hasLiveProviderKey();
const describeLiveBenchmark = shouldRunLiveBenchmark ? describe : describe.skip;

describeLiveBenchmark('AiService Live Latency Benchmark', () => {
  jest.setTimeout(120_000);

  it('captures single-tool live latency metrics', async () => {
    const benchmarkResult = await runLiveBenchmark({
      query: 'Give me a quick portfolio allocation overview',
      sessionPrefix: 'live-single-tool',
      subject: createLiveBenchmarkSubject()
    });
    const shouldEnforceTargets =
      process.env.AI_LIVE_BENCHMARK_ENFORCE_TARGETS === 'true';

    console.info(
      JSON.stringify({
        averageInMs: Number(benchmarkResult.averageInMs.toFixed(2)),
        failures: benchmarkResult.failures,
        iterations: benchmarkResult.iterations,
        metric: 'single_tool_live_latency',
        p95InMs: benchmarkResult.p95InMs,
        targetInMs: LIVE_SINGLE_TOOL_TARGET_IN_MS
      })
    );

    if (shouldEnforceTargets) {
      expect(benchmarkResult.p95InMs).toBeLessThanOrEqual(
        LIVE_SINGLE_TOOL_TARGET_IN_MS
      );
    }
  });

  it('captures multi-step live latency metrics', async () => {
    const benchmarkResult = await runLiveBenchmark({
      query:
        'Rebalance my portfolio, run a stress test, and give market prices for AAPL and MSFT',
      sessionPrefix: 'live-multi-step',
      subject: createLiveBenchmarkSubject()
    });
    const shouldEnforceTargets =
      process.env.AI_LIVE_BENCHMARK_ENFORCE_TARGETS === 'true';

    console.info(
      JSON.stringify({
        averageInMs: Number(benchmarkResult.averageInMs.toFixed(2)),
        failures: benchmarkResult.failures,
        iterations: benchmarkResult.iterations,
        metric: 'multi_step_live_latency',
        p95InMs: benchmarkResult.p95InMs,
        targetInMs: LIVE_MULTI_STEP_TARGET_IN_MS
      })
    );

    if (shouldEnforceTargets) {
      expect(benchmarkResult.p95InMs).toBeLessThanOrEqual(
        LIVE_MULTI_STEP_TARGET_IN_MS
      );
    }
  });
});
