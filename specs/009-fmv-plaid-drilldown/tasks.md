# Tasks: 009-fmv-plaid-drilldown

**Branch**: `009-fmv-plaid-drilldown` | **Date**: 2026-03-22

## Phase 1: Setup

- [X] T-001: Create `.gitignore` / `.dockerignore` verification [P]
- [X] T-002: Add Plaid env vars to environment interface and configuration service (ENABLE_FEATURE_PLAID, PLAID_CLIENT_ID, PLAID_SECRET, PLAID_ENV, PLAID_ENCRYPTION_KEY)

## Phase 2: US1 — Restore Admin-Gated Features (P1)

- [X] T-010: Move legacy menu items out of admin gate in header desktop nav
- [X] T-011: Move legacy menu items out of admin gate in header mobile nav
- [X] T-012: Add "Analysis" nav menu group for legacy items (desktop)
- [X] T-013: Add "Analysis" nav menu group for legacy items (mobile)

## Phase 3: US2 — FMV Dashboard (P1)

- [X] T-020: Create FMV dashboard page component and route
- [X] T-021: Implement FMV hero total display
- [X] T-022: Implement account cards with value, allocation, platform
- [X] T-023: Add FMV nav menu group to header (desktop + mobile)
- [X] T-024: Handle empty state and excluded accounts

## Phase 4: US3 — Asset Drill-Down (P1)

- [X] T-030: Wire FMV account cards to existing account-detail-dialog
- [X] T-031: Verify holdings tab shows cost basis, value, gain/loss per holding

## Phase 5: US4 — Plaid Account Linking (P2)

- [X] T-040: Add PlaidItem model to Prisma schema + Account extensions
- [X] T-041: Run Prisma migration
- [X] T-042: Add PlaidItem shared interface in @ghostfolio/common
- [X] T-043: Install plaid npm package + @plaid/link-initialize
- [X] T-044: Create PlaidModule (module, controller, service) in API
- [X] T-045: Implement encryption service for access tokens
- [X] T-046: Implement link-token creation endpoint
- [X] T-047: Implement exchange-token endpoint (create PlaidItem + Accounts)
- [X] T-048: Implement initial holdings sync on account creation
- [X] T-049: Create Angular PlaidLinkService wrapping @plaid/link-initialize
- [X] T-050: Add "Link Account via Plaid" button to FMV dashboard
- [X] T-051: Implement Plaid items list endpoint
- [X] T-052: Add Plaid status indicators to FMV account cards
- [X] T-053: Implement re-auth (update mode) link-token endpoint
- [X] T-054: Implement delete/disconnect PlaidItem endpoint

## Phase 6: US5 — Plaid Ongoing Sync (P3)

- [X] T-060: Add PLAID_SYNC_QUEUE constant to config.ts
- [X] T-061: Create PlaidSyncModule (module, processor, service)
- [X] T-062: Implement sync processor (fetch holdings + transactions, create Orders)
- [X] T-063: Add manual sync trigger endpoint
- [X] T-064: Add cron job for daily Plaid sync
- [X] T-065: Implement webhook receiver endpoint
- [X] T-066: Add "Refresh" button and last-synced indicator to UI
- [X] T-067: Register PlaidModule and PlaidSyncModule in app.module.ts
