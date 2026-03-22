# Quickstart: Family Office UI Redesign

**Feature**: 008-fo-ui-redesign
**Branch**: `008-fo-ui-redesign`

## Prerequisites

- Node.js ≥22.18.0
- Docker (for PostgreSQL and Redis)
- At least one parsed K1 document in the database (for testing portfolio analysis integration)

## Setup

```bash
# 1. Start dev infrastructure
docker compose -f docker/docker-compose.dev.yml up -d

# 2. Install dependencies
npm install

# 3. Run database migrations
npx prisma migrate dev

# 4. Seed the database (if fresh)
npx prisma db seed

# 5. Start the API (terminal 1)
npx nx serve api

# 6. Start the client (terminal 2)
npx nx serve client
```

The client runs at http://localhost:4200 and the API at http://localhost:3333.

## Auth Token

Use this token for API testing:
```
3a99343a9f099119cf2c297fe082de12e656e6291cd6a45b4b128f775e0898af4e5141e1c032b1ff64d12efde3c0a31d4c9c1cc1022f64ec9dc4e88dbcc8f318
```

## Verification Workflow

### P1: Portfolio Analysis + K1 Data
1. Navigate to http://localhost:4200/portfolio
2. Verify the analysis page shows family office performance metrics (IRR, TVPI, DPI, RVPI)
3. Verify K1 income summary card shows income categories
4. Verify entity-level breakdown table appears
5. If no K1 data exists, verify the empty state guides to K-1 Import

### P2: Navigation Restructure
1. After login, verify the header shows 5 top-level items: Dashboard, Partnerships, K-1 Center, Analysis, Admin
2. Click "Partnerships" — verify dropdown shows Entities, Partnerships, Distributions, Portfolio Views
3. Click "K-1 Center" — verify dropdown shows K-1 Import, K-1 Documents, Cell Mapping
4. Navigate to a legacy page via URL (e.g., /home/holdings) — verify it still loads

### P3: Dashboard Landing
1. Navigate to http://localhost:4200/ — verify redirect to /family-office
2. Verify dashboard shows AUM, allocations, portfolio metrics, K1 income summary, recent distributions
3. If no data, verify onboarding guide appears

### P4: Legacy Pages
1. Navigate to Admin > Legacy section
2. Verify Overview, Holdings, Summary, Markets, Watchlist, FIRE, X-Ray are all accessible

## API Endpoints for Testing

```bash
# Dashboard data
curl -H "Authorization: Bearer $TOKEN" http://localhost:3333/api/v1/family-office/dashboard

# Portfolio summary (entity-level performance)
curl -H "Authorization: Bearer $TOKEN" http://localhost:3333/api/v1/family-office/portfolio-summary

# Asset class summary
curl -H "Authorization: Bearer $TOKEN" http://localhost:3333/api/v1/family-office/asset-class-summary

# Activity (K1 income ledger)
curl -H "Authorization: Bearer $TOKEN" http://localhost:3333/api/v1/family-office/activity

# Report
curl -H "Authorization: Bearer $TOKEN" "http://localhost:3333/api/v1/family-office/report?period=quarterly&year=2025"
```

## Key Files to Modify

| File | Change |
|---|---|
| `apps/client/src/app/components/header/header.component.html` | Restructure nav to 5 grouped items |
| `apps/client/src/app/components/header/header.component.ts` | Add mat-menu properties for nav groups |
| `apps/client/src/app/pages/portfolio/analysis/analysis-page.component.ts` | Inject FamilyOfficeDataService, fetch K1 data |
| `apps/client/src/app/pages/portfolio/analysis/analysis-page.component.html` | Add FO metrics sections |
| `apps/client/src/app/pages/family-dashboard/dashboard-page.component.ts` | Add portfolio summary + K1 income sections |
| `apps/client/src/app/app.routes.ts` | Change wildcard redirect to `family-office` |
| `libs/ui/src/lib/k1-income-summary/` | NEW: K1 income breakdown card component |
| `libs/ui/src/lib/nav-menu-group/` | NEW: Grouped nav item with mat-menu dropdown |
