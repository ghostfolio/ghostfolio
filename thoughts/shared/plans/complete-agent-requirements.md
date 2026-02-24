# Complete Ghostfolio Finance Agent Requirements

**Status:** Implemented (2026-02-24 local)
**Priority:** High
**Deadline:** Sunday 10:59 PM CT (submission)

## Overview

Complete the remaining technical requirements for the Ghostfolio AI Agent submission to Gauntlet G4.

### Current Completion: 6/10

**Completed:**
- ✅ MVP Agent (5 tools, natural language, tool execution)
- ✅ Redis memory system
- ✅ Verification (confidence, citations, checks)
- ✅ Error handling
- ✅ 10 MVP eval cases
- ✅ Railway deployment
- ✅ Submission docs (presearch, dev log, cost analysis)
- ✅ ADR/docs structure

**Remaining:**
- ❌ Eval dataset: 10 → 50+ test cases
- ❌ LangSmith observability integration

## Requirements Analysis

### 1. Eval Dataset Expansion (40+ new cases)

**Required Breakdown (from docs/requirements.md):**
- 20+ happy path scenarios
- 10+ edge cases (missing data, boundary conditions)
- 10+ adversarial inputs (bypass verification attempts)
- 10+ multi-step reasoning scenarios

**Current State:** 10 cases in `apps/api/src/app/endpoints/ai/evals/mvp-eval.dataset.ts`

**Categories Covered:**
- Happy path: ~6 cases (portfolio overview, risk, market data, multi-tool, rebalance, stress test)
- Edge cases: ~2 cases (tool failure, partial market coverage)
- Adversarial: ~1 case (implicit in fallback scenarios)
- Multi-step: ~2 cases (multi-tool query, memory continuity)

**Gaps to Fill:**
- Happy path: +14 cases
- Edge cases: +8 cases
- Adversarial: +9 cases
- Multi-step: +8 cases

**Available Tools:**
1. `portfolio_analysis` - holdings, allocation, performance
2. `risk_assessment` - concentration risk analysis
3. `market_data_lookup` - current prices, market state
4. `rebalance_plan` - allocation adjustment recommendations
5. `stress_test` - drawdown/impact scenarios

**Test Case Categories to Add:**

*Happy Path (+14):*
- Allocation analysis queries
- Performance comparison requests
- Portfolio health summaries
- Investment guidance questions
- Sector/asset class breakdowns
- Currency impact analysis
- Time-based performance queries
- Benchmark comparisons
- Diversification metrics
- Fee analysis queries
- Dividend/income queries
- Holdings detail requests
- Market context questions
- Goal progress queries

*Edge Cases (+8):*
- Empty portfolio (no holdings)
- Single-symbol portfolio
- Very large portfolio (100+ symbols)
- Multiple accounts with different currencies
- Portfolio with only data issues (no quotes available)
- Zero-value positions
- Historical date queries (backtesting)
- Real-time data unavailable

*Adversarial (+9):*
- SQL injection attempts in queries
- Prompt injection (ignore previous instructions)
- Malicious code generation requests
- Requests for other users' data
- Bypassing rate limits
- Manipulating confidence scores
- Fake verification scenarios
- Exfiltration attempts
- Privilege escalation attempts

*Multi-Step (+8):*
- Compare performance then rebalance
- Stress test then adjust allocation
- Market lookup → portfolio analysis → recommendation
- Risk assessment → stress test → rebalance
- Multi-symbol market data → portfolio impact
- Historical query → trend analysis → forward guidance
- Multi-account aggregation → consolidated analysis
- Portfolio + market + risk comprehensive report

### 2. LangSmith Observability Integration

**Requirements (from docs/requirements.md):**

| Capability | Requirements |
|---|---|
| Trace Logging | Full trace: input → reasoning → tool calls → output |
| Latency Tracking | Time breakdown: LLM calls, tool execution, total response |
| Error Tracking | Capture failures, stack traces, context |
| Token Usage | Input/output tokens per request, cost tracking |
| Eval Results | Historical eval scores, regression detection |
| User Feedback | Thumbs up/down, corrections mechanism |

**Integration Points:**

1. **Package:** `@langchain/langsmith` (already in dependencies?)
2. **Environment:** `LANGCHAIN_TRACING_V2=true`, `LANGCHAIN_API_KEY`
3. **Location:** `apps/api/src/app/endpoints/ai/ai.service.ts`

**Implementation Approach:**

```typescript
// Initialize LangSmith tracer
import { Client } from '@langchain/langsmith';

const langsmithClient = new Client({
  apiKey: process.env.LANGCHAIN_API_KEY,
  apiUrl: process.env.LANGCHAIN_ENDPOINT
});

// Wrap chat execution in trace
async function chatWithTrace(request: AiChatRequest) {
  const trace = langsmithClient.run({
    name: 'ai_agent_chat',
    inputs: { query: request.query, userId: request.userId }
  });

  try {
    // Log LLM calls
    // Log tool execution
    // Log verification checks
    // Log final output

    await trace.end({
      outputs: { answer: response.answer },
      metadata: { latency, tokens, toolCalls }
    });
  } catch (error) {
    await trace.end({ error: error.message });
  }
}
```

**Files to Modify:**
- `apps/api/src/app/endpoints/ai/ai.service.ts` - Add tracing to chat method
- `.env.example` - Add LangSmith env vars
- `apps/api/src/app/endpoints/ai/evals/mvp-eval.runner.ts` - Add eval result upload to LangSmith

**Testing:**
- Verify traces appear in LangSmith dashboard
- Check latency breakdown accuracy
- Validate token usage tracking
- Test error capture

## Implementation Plan

### Phase 1: Eval Dataset Expansion (Priority: High)

**Step 1.1:** Design test case template
- Review existing 10 cases structure
- Define patterns for each category
- Create helper functions for setup data

**Step 1.2:** Generate happy path cases (+14)
- Allocation analysis (4 cases)
- Performance queries (3 cases)
- Portfolio health (3 cases)
- Market context (2 cases)
- Benchmarks/diversification (2 cases)

**Step 1.3:** Generate edge case scenarios (+8)
- Empty/edge portfolios (4 cases)
- Data availability issues (2 cases)
- Boundary conditions (2 cases)

**Step 1.4:** Generate adversarial cases (+9)
- Injection attacks (4 cases)
- Data access violations (3 cases)
- System manipulation (2 cases)

**Step 1.5:** Generate multi-step cases (+8)
- 2-3 tool chains (4 cases)
- Complex reasoning (4 cases)

**Step 1.6:** Update eval runner
- Expand dataset import
- Add category-based reporting
- Track pass rates by category

**Step 1.7:** Run and validate
- `npm run test:mvp-eval`
- Fix any failures
- Document results

### Phase 2: LangSmith Integration (Priority: High)

**Step 2.1:** Add dependencies
- Check if `@langchain/langsmith` in package.json
- Add if missing

**Step 2.2:** Configure environment
- Add `LANGCHAIN_TRACING_V2=true` to `.env.example`
- Add `LANGCHAIN_API_KEY` to `.env.example`
- Add setup notes to `docs/LOCAL-TESTING.md`

**Step 2.3:** Initialize tracer in AI service
- Import LangSmith client
- Configure initialization
- Add error handling for missing credentials

**Step 2.4:** Wrap chat execution
- Create trace on request start
- Log LLM calls with latency
- Log tool execution with results
- Log verification checks
- End trace with output

**Step 2.5:** Add metrics tracking
- Token usage (input/output)
- Latency breakdown (LLM, tools, total)
- Success/failure rates
- Tool selection frequencies

**Step 2.6:** Integrate eval results
- Upload eval runs to LangSmith
- Create dataset for regression testing
- Track historical scores

**Step 2.7:** Test and verify
- Run `npm run test:ai` with tracing enabled
- Check LangSmith dashboard for traces
- Verify metrics accuracy
- Test error capture

### Phase 3: Documentation and Validation

**Step 3.1:** Update submission docs
- Update `docs/AI-DEVELOPMENT-LOG.md` with LangSmith
- Update eval count in docs
- Add observability section to architecture doc

**Step 3.2:** Final verification
- Run full test suite
- Check production deployment
- Validate submission checklist

**Step 3.3:** Update tasks tracking
- Mark tickets complete
- Update `Tasks.md`
- Document any lessons learned

## Success Criteria

### Eval Dataset:
- ✅ 50+ test cases total
- ✅ 20+ happy path scenarios
- ✅ 10+ edge cases
- ✅ 10+ adversarial inputs
- ✅ 10+ multi-step scenarios
- ✅ All tests pass (`npm run test:mvp-eval`)
- ✅ Category-specific pass rates tracked

### LangSmith Observability:
- ✅ Traces visible in LangSmith dashboard
- ✅ Full request lifecycle captured (input → reasoning → tools → output)
- ✅ Latency breakdown accurate (LLM, tools, total)
- ✅ Token usage tracked per request
- ✅ Error tracking functional
- ✅ Eval results uploadable
- ✅ Zero performance degradation (<5% overhead)

### Documentation:
- ✅ Env vars documented in `.env.example`
- ✅ Setup instructions in `docs/LOCAL-TESTING.md`
- ✅ Architecture doc updated with observability
- ✅ Submission docs reflect final state

## Estimated Effort

- **Phase 1 (Eval Dataset):** 3-4 hours
- **Phase 2 (LangSmith):** 2-3 hours
- **Phase 3 (Docs/Validation):** 1 hour

**Total:** 6-8 hours

## Risks and Dependencies

**Risks:**
- LangSmith API key not available → Need to obtain or use alternative
- Test case generation takes longer → Focus on high-value categories first
- Performance regression from tracing → Monitor and optimize

**Dependencies:**
- LangSmith account/API key
- Access to LangSmith dashboard
- Railway deployment for production tracing

## Resolved Decisions (2026-02-24)

1. LangSmith key handling is env-gated with compatibility for both `LANGCHAIN_*` and `LANGSMITH_*` variables.
2. LangSmith managed service integration is in place through `langsmith` RunTree traces.
3. Adversarial eval coverage includes prompt-injection, data-exfiltration, confidence manipulation, and privilege escalation attempts.
4. Eval dataset is split across category files for maintainability and merged in `mvp-eval.dataset.ts`.
