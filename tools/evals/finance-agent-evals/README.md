# @ghostfolio/finance-agent-evals

Framework-agnostic evaluation dataset and runner for finance AI agents.

## Contents

- 53 deterministic eval cases from Ghostfolio AI MVP
- Category split:
  - 22 `happy_path`
  - 11 `edge_case`
  - 10 `adversarial`
  - 10 `multi_step`
- Reusable eval runner with category summaries
- Type definitions for JavaScript and TypeScript consumers

## Install

```bash
npm install @ghostfolio/finance-agent-evals
```

## Usage

```ts
import {
  FINANCE_AGENT_EVAL_DATASET,
  runFinanceAgentEvalSuite
} from '@ghostfolio/finance-agent-evals';

const result = await runFinanceAgentEvalSuite({
  execute: async (evalCase) => {
    const response = await myAgent.chat({
      query: evalCase.input.query,
      sessionId: evalCase.input.sessionId
    });

    return {
      answer: response.answer,
      citations: response.citations,
      confidence: response.confidence,
      memory: response.memory,
      toolCalls: response.toolCalls,
      verification: response.verification
    };
  }
});

console.log(result.passRate, result.categorySummaries);
```

## Dataset Export

This package dataset is generated from:

`apps/api/src/app/endpoints/ai/evals/mvp-eval.dataset.ts`

Exported artifact:

`datasets/ghostfolio-finance-agent-evals.v1.json`

## Scripts

```bash
npm run check
npm run pack:dry-run
```

## License

Apache-2.0
