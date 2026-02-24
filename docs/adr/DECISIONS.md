# Decisions

**Purpose**: Quick-scan table of project decisions. For detailed architecture rationale, see `docs/adr/`.

Last updated: 2026-02-24

| ID | Date | What we decided | Alternatives considered | Why we chose this | What would change our mind | Discussion / Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| D-001 | 2026-02-23 | Domain focus: Finance agent on Ghostfolio | Healthcare agent on OpenEMR | Faster delivery path, existing finance services, clear verification surface | Repo constraints shift, delivery risk profile shifts, domain requirements shift | `docs/requirements.md`, `docs/PRESEARCH.md` |
| D-002 | 2026-02-23 | Agent framework: LangChain | LangGraph, CrewAI, AutoGen, custom | Fast path to tool orchestration, tracing integration, eval support | Workflow complexity grows and state-machine orchestration brings better latency and reliability | `docs/PRESEARCH.md` |
| D-003 | 2026-02-23 | Observability and eval platform: LangSmith | Braintrust, Langfuse, custom telemetry | Integrated traces, datasets, eval loops, quick setup | Cost and trace volume profile shifts, platform limits appear | `docs/requirements.md`, `docs/PRESEARCH.md` |
| D-004 | 2026-02-23 | Delivery workflow: ADR plus RGR | Ad hoc implementation workflow | Better auditability, tighter change control, faster regression detection | Delivery cadence drops or verification burden grows beyond value | `docs/PRESEARCH.md`, `docs/adr/README.md` |
| D-005 | 2026-02-24 | Open source strategy: Multi-platform eval framework release | Single contribution point (LangChain PR only) | Maximize visibility and impact: npm package + LangChain integration + benchmark leaderboards + academic DOI | LangChain contribution accepted early and becomes primary distribution channel | `thoughts/shared/plans/open-source-eval-framework.md`, `docs/requirements.md` |

Architecture-level decision records live in `docs/adr/`.
