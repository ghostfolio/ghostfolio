# Product Requirements Document (PRD)

## Product

Ghostfolio Finance Domain Agent (AgentForge Week 2)

## Document Purpose

Define the scope, requirements, delivery plan, and success criteria for building a production-ready finance-domain AI agent inside the Ghostfolio codebase.

## Background and Context

Ghostfolio is an open-source wealth management platform where users track portfolios, holdings, allocations, performance, and transactions. The current AI capability in this fork is prompt generation for external LLM usage. This project evolves that capability into an in-product finance agent that can reason over user portfolio data, invoke tools, verify outputs, and return trustworthy responses for financial analysis use cases.

This PRD is aligned with AgentForge Week 2 requirements:

- Natural-language finance assistant in Ghostfolio
- Tool-based agent architecture
- Verification layer for high-stakes answers
- Evaluation framework and test dataset
- Observability and cost tracking
- Publicly deployable implementation

## Problem Statement

Users can see raw portfolio metrics but still struggle to:

- Translate portfolio data into actionable and personalized insights
- Detect concentration and risk patterns quickly
- Understand implications of changes before rebalancing
- Trust AI outputs when finance recommendations may impact real money

Current prompt-copy workflows add friction and have no built-in validation, observability, or evaluation guarantees.

## Goals

1. Build a finance-domain agent that answers natural language queries grounded in a user's Ghostfolio data.
2. Implement at least 5 production-grade tools with structured schemas and reliable execution.
3. Enforce domain-specific verification before returning answers.
4. Add robust observability for traces, latency, errors, and token/cost usage.
5. Ship an evaluation framework with at least 50 test cases and measurable pass/fail outputs.
6. Deliver a deployable solution with clear developer and user documentation.

## Non-Goals

- Fully autonomous trading or execution of real trades
- Personalized regulated investment advice or fiduciary recommendations
- Tax filing automation for all jurisdictions
- Replacing existing Ghostfolio analytics UI components

## Target Users

- **Primary:** Retail investors using Ghostfolio to monitor long-term portfolios
- **Secondary:** Power users who need faster risk and allocation insights
- **Tertiary:** Developers/contributors extending Ghostfolio AI functionality

## User Stories

1. As an investor, I want to ask "How concentrated is my portfolio?" and get a quantified, source-backed answer.
2. As an investor, I want to ask "What are my top risk exposures?" and receive clear risk categories and severity.
3. As an investor, I want scenario insights such as "What happens if I reduce tech exposure by 10%?"
4. As a user, I want the agent to say when confidence is low or data is incomplete.
5. As an engineer, I want traces and evals so I can debug tool errors and regressions.

## Product Scope

### In Scope

- Conversational finance assistant integrated with Ghostfolio API/backend
- Stateful multi-turn conversations with user-scoped context
- Minimum 5 finance tools with typed input/output contracts
- Verification checks before final response
- Eval dataset and automated execution/reporting
- Observability instrumentation and cost accounting

### Out of Scope

- Broker account order placement
- Legal/compliance certifications
- Enterprise multi-tenant permission redesign

## Proposed Agent Experience

1. User submits natural-language question in Ghostfolio AI interface.
2. Orchestrator classifies intent and determines needed tools.
3. Agent executes one or more tools with validated parameters.
4. Verification layer checks factual grounding, constraints, and confidence.
5. Response formatter returns:
   - concise answer
   - supporting metrics/citations from tool outputs
   - confidence level and caveats
   - suggested follow-up questions

## Functional Requirements

### FR-1: Natural Language Query Handling

- Accept finance questions in plain language.
- Support queries about performance, diversification, risk, exposure, and trends.
- Preserve conversation history for follow-up questions.

### FR-2: Tool Registry and Execution

Implement at least 5 tools. Recommended v1 tools:

1. `portfolio_analysis(accountOrFilter)`
   - Returns holdings summary, allocation breakdown, concentration metrics.
2. `risk_exposure_analysis(filters)`
   - Returns sector/asset/geography concentration and risk indicators.
3. `performance_diagnostics(range, benchmark)`
   - Returns return, volatility proxy, drawdown indicators, benchmark deltas.
4. `transaction_pattern_analysis(range)`
   - Returns contribution trends, buy/sell frequency, cashflow patterns.
5. `market_context(symbols, metrics)`
   - Returns recent market context signals for assets in portfolio.
6. `compliance_guard(responseDraft)`
   - Flags prohibited language (guarantees, direct financial advice) and forces safe wording.

All tools must:

- Have explicit schema definitions
- Return structured JSON payloads
- Emit success/failure telemetry
- Fail gracefully with actionable error messages

### FR-3: Multi-Step Orchestration

- Agent chooses correct tool chain for query intent.
- Support single-tool and multi-tool queries.
- Resolve conflicts across tool outputs with explicit fallback logic.

### FR-4: Verification Layer (3+ Required)

Minimum verification checks:

1. **Fact grounding check:** every claim must map to tool output fields.
2. **Hallucination guard:** block unsupported claims; require "insufficient data" when needed.
3. **Confidence scoring:** low/medium/high confidence based on data completeness and tool agreement.
4. **Domain constraints:** disallow deterministic financial guarantees and unsafe advice wording.
5. **Output schema validator:** ensure final response payload is structurally valid.

### FR-5: Response Formatting

Final response must include:

- direct answer
- rationale and key numbers
- sources (tool names and key data points)
- confidence score
- disclaimer where relevant

### FR-6: Error Handling

- Tool failures must not crash request.
- User gets transparent fallback messages.
- Partial responses allowed if at least one relevant tool succeeds.

## Non-Functional Requirements

- **Latency:** <5s single-tool, <15s multi-tool target.
- **Reliability:** >95% tool execution success.
- **Safety:** <5% unsupported claim rate in evaluation.
- **Security/Privacy:** user-scoped access only; no cross-user data leakage.
- **Determinism:** stable outputs for same test case within accepted tolerance.
- **Maintainability:** modular tool interfaces and testable orchestration logic.

## Architecture Requirements

### Core Components

- Reasoning engine (LLM with structured output)
- Tool registry with typed schemas
- Orchestrator for tool planning/execution
- Memory layer for short conversation history and user context
- Verification layer before response emission
- Response formatter with confidence and citations

### Ghostfolio Integration Notes

- Reuse existing portfolio and analytics services where possible.
- Extend current AI endpoint pattern into conversational agent endpoints.
- Enforce existing auth/permission model for all agent calls.
- Keep an internal boundary between data retrieval tools and LLM reasoning.

## API and Data Contracts

### Proposed API Endpoints (v1)

- `POST /api/v1/ai-agent/chat`
  - Input: `sessionId`, `message`, optional filters
  - Output: agent response object with confidence, citations, tool trace ids
- `GET /api/v1/ai-agent/session/:id`
  - Returns recent history and metadata
- `POST /api/v1/ai-agent/evals/run`
  - Triggers eval run and stores report

### Response Contract (High-Level)

- `answer: string`
- `confidence: "low" | "medium" | "high"`
- `citations: Array<{ tool: string; keys: string[] }>`
- `warnings: string[]`
- `traceId: string`
- `latencyMs: number`

## Evaluation Plan (Required)

Minimum 50 test cases:

- 20+ happy path
- 10+ edge cases
- 10+ adversarial prompts
- 10+ multi-step reasoning cases

Each test case includes:

- user query
- expected tool calls
- expected output constraints
- pass/fail criteria
- safety/compliance expectations

Tracked metrics:

- correctness
- tool selection accuracy
- tool execution success
- safety pass rate
- consistency score
- latency percentiles

## Observability Plan (Required)

Implement logging and dashboards for:

- end-to-end request traces (input -> tool calls -> output)
- latency breakdown (LLM/tool/total)
- token usage and estimated cost
- tool and verification errors
- evaluation history and regression trends
- optional user feedback (thumbs up/down)

## Cost Analysis Requirements

Track development costs:

- LLM requests and total token usage
- tool-call related overhead
- observability stack cost

Project monthly cost scenarios:

- 100 users
- 1,000 users
- 10,000 users
- 100,000 users

Include assumptions for:

- queries per user/day
- average tokens per query
- average tool calls/query
- verification overhead/query

## Rollout Plan

### Milestone 1 (24h MVP)

- Basic agent endpoint live
- 3 working tools minimum
- structured tool execution
- simple conversation memory
- 5+ basic eval tests
- one verification check active

### Milestone 2 (Early Submission)

- Expand to 5+ tools
- observability instrumentation complete
- 50-case eval dataset baseline run
- 3+ verification checks implemented

### Milestone 3 (Final)

- production hardening and error handling
- improved pass rates based on eval feedback
- cost report and documentation
- open-source contribution artifact prepared

## Dependencies

- Existing Ghostfolio portfolio and market data services
- LLM provider configuration and API key management
- Persistence for sessions/evals/traces (existing DB patterns)
- Optional external observability platform or custom logs

## Risks and Mitigations

1. **Hallucinated claims**
   - Mitigation: strict grounding checks and mandatory citations.
2. **Latency spikes with multi-tool chains**
   - Mitigation: cap tool fan-out, cache stable data, optimize prompt size.
3. **Tool schema drift**
   - Mitigation: schema versioning and contract tests.
4. **Ambiguous user intent**
   - Mitigation: clarifying questions and conservative fallback responses.
5. **Cost overruns**
   - Mitigation: token budgeting, prompt compression, usage monitoring.

## Success Metrics

- Eval pass rate >= 80%
- Tool execution success >= 95%
- Hallucination/unsupported claim rate <= 5%
- Verification accuracy >= 90%
- P95 latency <= 5s (single-tool), <= 15s (multi-step)

## Acceptance Criteria

The PRD is considered fulfilled when:

1. Agent supports natural language finance queries with conversation memory.
2. At least 5 tools execute reliably with structured outputs.
3. Verification layer performs at least 3 checks before responses.
4. 50+ eval suite exists, runs, and reports pass/fail metrics.
5. Observability captures traces, latency, errors, and token/cost usage.
6. Deployment is publicly accessible and documented.
7. Open-source contribution artifact is published (dataset, package, docs, or integration).

## Open Questions

1. Should v1 ship with a strict "analysis only" mode, then add recommendation mode later?
2. Which observability stack should be default for this fork (Langfuse vs custom logging)?
3. Should session memory persist in database or cache only for MVP?
4. What confidence thresholds should trigger automatic "human review recommended" messaging?
