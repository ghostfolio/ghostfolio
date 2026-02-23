# AI Cost Analysis

Date: 2026-02-23  
Project: Ghostfolio Finance Agent MVP  
Scope: development, testing, and monthly production projections

## Pricing Inputs

Primary model routing in MVP:

- 80% `glm-5` (Z.AI)
- 20% `MiniMax-M2.5` (MiniMax)

Reference pricing:

- Z.AI pricing page (`glm-5`): input `$1.00 / 1M tokens`, output `$3.20 / 1M tokens`  
  Source: https://docs.z.ai/guides/getting-started/pricing
- MiniMax pricing page (`MiniMax-M2.5`): input `$0.3 / 1M tokens`, output `$1.2 / 1M tokens`  
  Source: https://www.minimax.io/platform/pricing

Blended effective rates used for projections:

- Input: `$0.86 / 1M` (`0.8 * 1.00 + 0.2 * 0.30`)
- Output: `$2.80 / 1M` (`0.8 * 3.20 + 0.2 * 1.20`)

## Development and Testing Costs

Measured local verification for this MVP used mocked model calls in Jest suites:

- `npm run test:ai` uses mocked `generateText`
- `npm run test:mvp-eval` uses mocked `generateText`

Direct external LLM calls from automated tests:

- API calls: `0`
- Input tokens: `0`
- Output tokens: `0`
- Cost: `$0.00`

Manual smoke estimate for development sessions:

- Assumed live calls: `40`
- Average tokens per call: `2400 input`, `700 output`
- Total estimated tokens: `96,000 input`, `28,000 output`
- Estimated model cost:  
  `96,000/1,000,000 * 0.86 + 28,000/1,000,000 * 2.80 = $0.16`

Observability cost:

- LangSmith tracing integration: planned, current spend in this repository phase: `$0.00`

## Production Cost Projections

Assumptions:

- Average AI queries per user per month: `30` (about `1/day`)
- Average tokens per query: `2400 input`, `700 output`
- Tool call frequency: `1.5 tool calls/query` (portfolio + risk/market mix)
- Verification overhead and retry buffer: `25%`
- Effective cost/query before buffer: `$0.004024`

Monthly projection:

| Users | Queries / Month | Model Cost / Month | With 25% Buffer |
| --- | ---: | ---: | ---: |
| 100 | 3,000 | $12.07 | $15.09 |
| 1,000 | 30,000 | $120.72 | $150.90 |
| 10,000 | 300,000 | $1,207.20 | $1,509.00 |
| 100,000 | 3,000,000 | $12,072.00 | $15,090.00 |

## Sensitivity Range (Model Mix)

Same token assumptions, model-only monthly cost (without 25% buffer):

- 100 users:
  - all `MiniMax-M2.5`: `$4.68`
  - all `glm-5`: `$13.92`
- 100,000 users:
  - all `MiniMax-M2.5`: `$4,680`
  - all `glm-5`: `$13,920`

## Instrumentation Plan for Exact Tracking

1. Add per-request token usage logging at provider response level.
2. Add LangSmith traces for request, tool-call, and verification spans.
3. Export weekly token and cost aggregates into a versioned cost ledger.
4. Set alert thresholds for cost/query drift and high retry rates.
