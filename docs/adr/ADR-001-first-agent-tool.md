# ADR-001: Ghostfolio AI Agent - Portfolio Analysis Tool

**Status**: Proposed
**Date**: 2026-02-23
**Context**: First MVP tool for Ghostfolio AI agent. Need to enable portfolio analysis queries with verified calculations.

---

## Options Considered

### Option A: Extend Existing PortfolioService ✅ (CHOSEN)
- **Description**: Use Ghostfolio's existing `PortfolioService.getPortfolio()` and `PortfolioCalculator`
- **Pros**:
  - Ships fastest (2-4 hours vs 1-2 days)
  - Battle-tested math (TWR, ROI, MWR)
  - No new dependencies
  - Matches PRESEARCH decision
- **Cons**:
  - Limited to existing calculations
  - Can't customize output format easily

### Option B: Build New Calculation Engine ❌ (REJECTED)
- **Description**: Create new portfolio calculation logic from scratch
- **Pros**: Full control over calculations
- **Cons**:
  - 1-2 days implementation
  - High risk of math errors
  - Hard to verify against existing data
  - **Reason**: Reimplementing finance math is unnecessary risk

### Option C: Third-Party Finance API ❌ (REJECTED)
- **Description**: Use external portfolio analysis API (e.g., Yahoo Finance, Alpha Vantage)
- **Pros**: Offloads calculation complexity
- **Cons**:
  - Rate limits
  - API costs
  - Data privacy concerns
  - **Reason**: Ghostfolio already has this data; redundant call

---

## Decision

Extend `PortfolioService` with portfolio analysis tool using existing calculation engines.

---

## Trade-offs / Consequences

- **Positive**:
  - Ships in 4 hours (MVP on track)
  - Verified calculations (matches Ghostfolio UI)
  - Zero API costs for data layer

- **Negative**:
  - Can't easily add custom metrics
  - Tied to Ghostfolio's calculation logic

---

## What Would Change Our Mind

- Existing `PortfolioService` math fails verification checks
- Performance issues with large portfolios (>1000 holdings)
- Requirements need custom metrics not in Ghostfolio

---

## Related

- **Tests**: `apps/api/src/app/endpoints/ai/ai.service.spec.ts`
- **Evals**: `evals/mvp-dataset.ts` (cases: portfolio-1, portfolio-2, portfolio-3)
- **PRESEARCH**: Section 3 (Tool Plan)
- **Supersedes**: None (first ADR)
