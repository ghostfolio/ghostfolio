const { DataSource } = require('@prisma/client');

const {
  AiService
} = require('../../apps/api/src/app/endpoints/ai/ai.service.ts');
const {
  AI_AGENT_MVP_EVAL_DATASET
} = require('../../apps/api/src/app/endpoints/ai/evals/mvp-eval.dataset.ts');
const {
  runMvpEvalSuite
} = require('../../apps/api/src/app/endpoints/ai/evals/mvp-eval.runner.ts');

function createAiServiceForCase(evalCase) {
  const dataProviderService = {
    getQuotes: async ({ items }) => {
      if (evalCase.setup.marketDataErrorMessage) {
        throw new Error(evalCase.setup.marketDataErrorMessage);
      }

      const quotesBySymbol = evalCase.setup.quotesBySymbol ?? {};

      return items.reduce((result, { symbol }) => {
        if (quotesBySymbol[symbol]) {
          result[symbol] = quotesBySymbol[symbol];
        }

        return result;
      }, {});
    }
  };

  const portfolioService = {
    getDetails: async () => ({
      holdings:
        evalCase.setup.holdings ??
        {
          CASH: {
            allocationInPercentage: 1,
            dataSource: DataSource.MANUAL,
            symbol: 'CASH',
            valueInBaseCurrency: 1000
          }
        }
    })
  };

  const propertyService = {
    getByKey: async () => undefined
  };

  const redisCacheService = {
    get: async () => {
      if (evalCase.setup.storedMemoryTurns) {
        return JSON.stringify({
          turns: evalCase.setup.storedMemoryTurns
        });
      }

      return undefined;
    },
    set: async () => undefined
  };

  const aiObservabilityService = {
    captureChatFailure: async () => undefined,
    captureChatSuccess: async () => ({
      latencyInMs: 10,
      tokenEstimate: { input: 1, output: 1, total: 2 },
      traceId: 'langsmith-eval-trace'
    }),
    recordFeedback: async () => undefined
  };

  const aiService = new AiService(
    dataProviderService,
    portfolioService,
    propertyService,
    redisCacheService,
    aiObservabilityService
  );

  if (evalCase.setup.llmThrows) {
    aiService.generateText = async () => {
      throw new Error('offline');
    };
  } else {
    aiService.generateText = async () => ({
      text: evalCase.setup.llmText ?? `Eval response for ${evalCase.id}`
    });
  }

  return aiService;
}

function printSummary({ failedRows, label, passed, total }) {
  const passRate = total > 0 ? (passed / total) * 100 : 0;
  const header = `${label}: ${passed}/${total} passed (${passRate.toFixed(1)}%)`;

  console.log(header);

  if (failedRows.length > 0) {
    console.log(`${label} failures:`);
    for (const row of failedRows) {
      console.log(`- ${row}`);
    }
  }
}

async function main() {
  const investmentCases = AI_AGENT_MVP_EVAL_DATASET.filter(({ input }) => {
    const query = input.query.toLowerCase();

    return (
      query.includes('invest') ||
      query.includes('allocat') ||
      query.includes('rebalanc') ||
      query.includes('buy') ||
      query.includes('trim')
    );
  });

  const suiteResult = await runMvpEvalSuite({
    aiServiceFactory: (evalCase) => createAiServiceForCase(evalCase),
    cases: AI_AGENT_MVP_EVAL_DATASET
  });

  const investmentResults = suiteResult.results.filter(({ id }) => {
    return investmentCases.some((evalCase) => evalCase.id === id);
  });
  const investmentPassed = investmentResults.filter(({ passed }) => passed).length;
  const investmentFailedRows = investmentResults
    .filter(({ passed }) => !passed)
    .map(({ failures, id }) => `${id}: ${failures.join(' | ')}`);

  const overallFailedRows = suiteResult.results
    .filter(({ passed }) => !passed)
    .map(({ failures, id }) => `${id}: ${failures.join(' | ')}`);

  printSummary({
    failedRows: overallFailedRows,
    label: 'Overall suite',
    passed: suiteResult.passed,
    total: suiteResult.total
  });
  printSummary({
    failedRows: investmentFailedRows,
    label: 'Investment relevance subset',
    passed: investmentPassed,
    total: investmentResults.length
  });

  const keyDetected =
    process.env.LANGSMITH_API_KEY || process.env.LANGCHAIN_API_KEY;
  const tracingEnabled =
    process.env.LANGSMITH_TRACING === 'true' ||
    process.env.LANGCHAIN_TRACING_V2 === 'true';

  console.log(
    `LangSmith capture: key=${keyDetected ? 'set' : 'empty'}, tracing=${tracingEnabled ? 'enabled' : 'disabled'}`
  );

  if (overallFailedRows.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
