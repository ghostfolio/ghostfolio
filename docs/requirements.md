# Automatic Zoom
## AgentForge: Building Production-Ready Domain-Specific AI Agents

## Before You Start: Pre-Search (2 Hours)

Before writing any code, complete the Pre-Search methodology at the end of this document.
This structured process uses AI to explore your repository, agent frameworks, evaluation strategies,
and observability tooling. Your Pre-Search output becomes part of your final submission.

This week emphasizes systematic agent development with rigorous evaluation. Pre-Search helps you
choose the right framework, eval approach, and observability stack for your domain.

## Background

AI agents are moving from demos to production. Healthcare systems need agents that verify drug
interactions before suggesting treatments. Insurance platforms need agents that accurately assess
claims against policy terms. Financial services need agents that comply with regulations while
providing useful advice.

The gap between a working prototype and a production agent is massive: evaluation frameworks,
verification systems, observability, error handling, and systematic testing. This project requires you
to build agents that actually work reliably in high-stakes domains.

You will contribute to open source by building domain-specific agentic frameworks on a pre-existing
open source project.

Gate: Project completion + interviews required for Austin admission.

## Project Overview

One-week sprint with three deadlines:

| Checkpoint | Deadline | Focus |
| --- | --- | --- |
| Pre-Search | 2 hours after receiving the project | Architecture, plan |
| MVP | Tuesday (24 hours) | Basic agent with tool use |
| Early Submission | Friday (4 days) | Eval framework + observability |
| Final | Sunday (7 days) | Production-ready + open source |

## MVP Requirements (24 Hours)

Hard gate. All items required to pass:

- [ ] Agent responds to natural language queries in your chosen domain
- [ ] At least 3 functional tools the agent can invoke
- [ ] Tool calls execute successfully and return structured results
- [ ] Agent synthesizes tool results into coherent responses
- [ ] Conversation history maintained across turns
- [ ] Basic error handling (graceful failure, not crashes)
- [ ] At least one domain-specific verification check
- [ ] Simple evaluation: 5+ test cases with expected outcomes
- [ ] Deployed and publicly accessible

A simple agent with reliable tool execution beats a complex agent that hallucinates or fails unpredictably.

## Choose Your Domain

Select one repo to fork. Your agent must add new meaningful features in that forked repo:

| Domain | GitHub Repository |
| --- | --- |
| Healthcare | OpenEMR | https://github.com/openemr/openemr
| Finance | Ghostfolio | https://github.com/ghostfolio/ghostfolio

## Core Agent Architecture

### Agent Components

| Component | Requirements |
| --- | --- |
| Reasoning Engine | LLM with structured output, chain-of-thought capability |
| Tool Registry | Defined tools with schemas, descriptions, and execution logic |
| Memory System | Conversation history, context management, state persistence |
| Orchestrator | Decides when to use tools, handles multi-step reasoning |
| Verification Layer | Domain-specific checks before returning responses |
| Output Formatter | Structured responses with citations and confidence |

## Required Tools (Minimum 5)

Build domain-appropriate tools. Examples by domain (look through your chosen repo to identify the
best opportunities for tools):

### Healthcare
- `drug_interaction_check(medications[]) -> interactions, severity`
- `symptom_lookup(symptoms[]) -> possible_conditions, urgency`
- `provider_search(specialty, location) -> available_providers`
- `appointment_availability(provider_id, date_range) -> slots`
- `insurance_coverage_check(procedure_code, plan_id) -> coverage_details`

### Finance
- `portfolio_analysis(account_id) -> holdings, allocation, performance`
- `transaction_categorize(transactions[]) -> categories, patterns`
- `tax_estimate(income, deductions) -> estimated_liability`
- `compliance_check(transaction, regulations[]) -> violations, warnings`
- `market_data(symbols[], metrics[]) -> current_data`

## Evaluation Framework (Required)

Production agents require systematic evaluation. Build an eval framework that tests:

| Eval Type | What to Test |
| --- | --- |
| Correctness | Does the agent return accurate information? Fact-check against ground truth. |
| Tool Selection | Does the agent choose the right tool for each query? |
| Tool Execution | Do tool calls succeed? Are parameters correct? |
| Safety | Does the agent refuse harmful requests? Avoid hallucination? |
| Consistency | Same input -> same output? Deterministic where expected? |
| Edge Cases | Handles missing data, invalid input, ambiguous queries? |
| Latency | Response time within acceptable bounds? |

### Eval Dataset Requirements

Create a minimum of 50 test cases:

- 20+ happy path scenarios with expected outcomes
- 10+ edge cases (missing data, boundary conditions)
- 10+ adversarial inputs (attempts to bypass verification)
- 10+ multi-step reasoning scenarios

Each test case must include: input query, expected tool calls, expected output, and pass/fail criteria.

## Observability Requirements

Implement observability to debug and improve your agent:

| Capability | Requirements |
| --- | --- |
| Trace Logging | Full trace of each request: input -> reasoning -> tool calls -> output |
| Latency Tracking | Time breakdown: LLM calls, tool execution, total response |
| Error Tracking | Capture and categorize failures, stack traces, context |
| Token Usage | Input/output tokens per request, cost tracking |
| Eval Results | Historical eval scores, regression detection |
| User Feedback | Mechanism to capture thumbs up/down, corrections |

## Verification Systems

High-stakes domains require verification before responses are returned.

### Required Verification (Implement 3+)

| Verification Type | Implementation |
| --- | --- |
| Fact Checking | Cross-reference claims against authoritative sources |
| Hallucination Detection | Flag unsupported claims, require source attribution |
| Confidence Scoring | Quantify certainty, surface low-confidence responses |
| Domain Constraints | Enforce business rules (for example, drug dosage limits) |
| Output Validation | Schema validation, format checking, completeness |
| Human-in-the-Loop | Escalation triggers for high-risk decisions |

## Performance Targets

| Metric | Target |
| --- | --- |
| End-to-end latency | <5 seconds for single-tool queries |
| Multi-step latency | <15 seconds for 3+ tool chains |
| Tool success rate | >95% successful execution |
| Eval pass rate | >80% on your test suite |
| Hallucination rate | <5% unsupported claims |
| Verification accuracy | >90% correct flags |

## AI Cost Analysis (Required)

Understanding AI costs is critical for production applications. Submit a cost analysis covering:

### Development and Testing Costs

Track and report your actual spend during development:

- LLM API costs (reasoning, tool calls, response generation)
- Total tokens consumed (input/output breakdown)
- Number of API calls made during development and testing
- Observability tool costs (if applicable)

### Production Cost Projections

Estimate monthly costs at different user scales:

| 100 Users | 1,000 Users | 10,000 Users | 100,000 Users |
| --- | --- | --- | --- |
| $___/month | $___/month | $___/month | $___/month |

Include assumptions:
- Queries per user per day
- Average tokens per query (input + output)
- Tool call frequency
- Verification overhead

## Agent Frameworks

Choose a framework or build custom. Document your selection:

| Framework | Best For |
| --- | --- |
| LangChain | Flexible agent architectures, extensive tool integrations, good docs |
| LangGraph | Complex multi-step workflows, state machines, cycles |
| CrewAI | Multi-agent collaboration, role-based agents |
| AutoGen | Conversational agents, code execution, Microsoft ecosystem |
| Semantic Kernel | Enterprise integration, .NET/Python, plugins |
| Custom | Full control, learning exercise, specific requirements |

## Observability Tools

Implement observability using one of these tools:

| Tool | Capabilities |
| --- | --- |
| LangSmith | Tracing, evals, datasets, playground, native LangChain integration |
| Braintrust | Evals, logging, scoring, CI integration, prompt versioning |
| Langfuse | Open source tracing, evals, datasets, prompts |
| Weights and Biases | Experiment tracking, prompts, traces, model monitoring |
| Arize Phoenix | Open source tracing, evals, drift detection |
| Helicone | Proxy-based logging, cost tracking, caching |
| Custom Logging | Build your own with structured logs and dashboards |

## Open Source Contribution (Required)

Contribute to open source in one of these ways:

| Contribution Type | Requirements |
| --- | --- |
| New Agent Package | Publish your domain agent as a reusable package (npm, PyPI) |
| Eval Dataset | Release your test suite as a public dataset for others to use |
| Framework Contribution | PR to LangChain, LlamaIndex, or similar with a new feature/fix |
| Tool Integration | Build and release a reusable tool for your domain |
| Documentation | Comprehensive guide/tutorial published publicly |

## Technical Stack

### Recommended Path

| Layer | Technology |
| --- | --- |
| Agent Framework | LangChain or LangGraph |
| LLM | GPT-5, Claude, or open source (Llama 3, Mistral) |
| Observability | LangSmith or Braintrust |
| Evals | LangSmith Evals, Braintrust Evals, or custom |
| Backend | Python/FastAPI or Node.js/Express |
| Frontend | React, Next.js, or Streamlit for rapid prototyping |
| Deployment | Vercel, Railway, Modal, or cloud provider |

Use whatever stack helps you ship. Complete the Pre-Search process to make informed decisions.

## Build Strategy

### Priority Order

1. Basic agent: single tool call working end-to-end
2. Tool expansion: add remaining tools, verify each works
3. Multi-step reasoning: agent chains tools appropriately
4. Observability: integrate tracing to see what is happening
5. Eval framework: build test suite, measure baseline
6. Verification layer: add domain-specific checks
7. Iterate on evals: improve agent based on failures
8. Open source prep: package and document for release

### Critical Guidance

- Get one tool working completely before adding more
- Add observability early because you need visibility to debug
- Build evals incrementally as you add features
- Test adversarial inputs throughout, not just at the end
- Document failure modes because they inform verification design

## Agent Architecture Documentation (Required)

Submit a 1-2 page document covering:

| Section | Content |
| --- | --- |
| Domain and Use Cases | Why this domain, specific problems solved |
| Agent Architecture | Framework choice, reasoning approach, tool design |
| Verification Strategy | What checks you implemented and why |
| Eval Results | Test suite results, pass rates, failure analysis |
| Observability Setup | What you are tracking, insights gained |
| Open Source Contribution | What you released, where to find it |

## Submission Requirements

Deadline: Sunday 10:59 PM CT

| Deliverable | Requirements |
| --- | --- |
| GitHub Repository | Setup guide, architecture overview, deployed link |
| Demo Video (3-5 min) | Agent in action, eval results, observability dashboard |
| Pre-Search Document | Completed checklist from Phase 1-3 |
| Agent Architecture Doc | 1-2 page breakdown using template above |
| AI Cost Analysis | Dev spend + projections for 100/1K/10K/100K users |
| Eval Dataset | 50+ test cases with results |
| Open Source Link | Published package, PR, or public dataset |
| Deployed Application | Publicly accessible agent interface |
| Social Post | Share on X or LinkedIn: description, features, demo/screenshots, tag `@GauntletAI` |
