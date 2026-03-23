# Research: 009-fmv-plaid-drilldown

**Date**: 2026-03-22

## R1: Admin-Gated Features — Navigation & Permission Analysis

### Decision: Move legacy features out of admin gate in header template

### Rationale
- All 7 legacy features (Overview, Holdings, Summary, Markets, Watchlist, FIRE, X-Ray) are hidden behind `@if (hasPermissionToAccessAdminControl)` in `header.component.html` (desktop L76–107, mobile L338–416)
- `hasPermissionToAccessAdminControl` is only true for ADMIN role (USER lacks `accessAdminControl` permission)
- **API endpoints do NOT require admin permission** — all portfolio endpoints (`/portfolio/details`, `/portfolio/holdings`, `/portfolio/performance`, `/portfolio/investments`, `/portfolio/report`) use JWT auth only, no `@HasPermission` decorator
- Watchlist: USER has `createWatchlistItem`, `deleteWatchlistItem`, `readWatchlist` — fully functional
- FIRE & X-Ray: Use JWT-only portfolio endpoints
- Markets basic view: Does NOT call the `readMarketDataOfMarkets`-gated endpoint; only the premium Markets view does (which requires `readMarketDataOfMarkets`, dynamically granted to Premium subscribers of any role)

### Implementation Approach
- Extract legacy items from the Admin dropdown and add them as standalone nav items visible to all authenticated users
- No API permission changes needed for Overview, Holdings, Summary, Watchlist, FIRE, X-Ray
- Markets basic view works as-is; premium Markets view requires Premium subscription (existing behavior, not a role gate)

### Alternatives Considered
1. **Grant `accessAdminControl` to USER** — Rejected: would also expose Admin Control panel, resource management, and other admin-only features
2. **Create a new permission per feature** — Rejected: Simplicity First; the features already work for any authenticated user, only the nav is gated

---

## R2: FMV Dashboard — Existing Data Pipeline

### Decision: Reuse existing `PortfolioService.getAccountsWithAggregations()` for FMV data

### Rationale
- `getAccountsWithAggregations()` already returns `AccountsResponse` with:
  - `totalValueInBaseCurrency` — aggregate FMV across all accounts
  - `totalBalanceInBaseCurrency` — aggregate cash
  - Per-account: `valueInBaseCurrency`, `balanceInBaseCurrency`, `allocationInPercentage`, `activitiesCount`, platform
- Per-account value computed in `getValueOfAccountsAndPlatforms()`: `valueInBaseCurrency = FX(cashBalance) + Σ(quantity × marketPrice)` per account
- Multi-currency conversion handled by `ExchangeRateDataService.toCurrency()`
- `AccountWithValue` type already has all fields needed: `value`, `valueInBaseCurrency`, `balanceInBaseCurrency`, `allocationInPercentage`, `platform`, `activitiesCount`
- Excluded accounts filtered via `isExcluded` field on Account model

### Implementation Approach
- New Angular page/component at `/fmv` or `/fmv/dashboard` route
- Calls existing `GET /api/v1/account` endpoint (returns `AccountsResponse`)
- Renders hero total (`totalValueInBaseCurrency`) + account cards
- Each account card links to existing account-detail-dialog for drill-down
- No new API endpoints needed — existing data is sufficient

### Alternatives Considered
1. **New dedicated `/api/v1/fmv` endpoint** — Rejected: existing accounts endpoint already provides all needed data; Simplicity First principle
2. **Separate FMV calculation service** — Rejected: duplicates `getValueOfAccountsAndPlatforms()` logic

---

## R3: Asset Drill-Down — Existing Account Detail Pattern

### Decision: Leverage existing account-detail-dialog with enhanced entry point from FMV view

### Rationale
- `AccountDetailDialogComponent` already provides:
  - Holdings tab: `GfHoldingsTableComponent` filtered by `accountId`
  - Activities tab: orders/transactions filtered by account
  - Cash Balances tab: `AccountBalance` history
- Holdings filtering works via `filters: [{ id: accountId, type: 'ACCOUNT' }]` passed to `getHoldings()`
- `PortfolioPosition` interface includes: `quantity`, `investment` (cost basis), `valueInBaseCurrency`, `netPerformance`, `netPerformancePercent`, `assetProfile` (name, symbol, assetClass)
- Clicking a holding row opens position detail with price chart, activity history, dividends, sector/country breakdown
- Sorting already supported in `GfHoldingsTableComponent`

### Implementation Approach
- FMV account cards open existing `AccountDetailDialogComponent` with proper `accountId`
- No new drill-down components needed — existing dialog has all required tabs
- Ensure holdings table columns show: symbol, name, quantity, cost basis (investment), current value, gain/loss

### Alternatives Considered
1. **New dedicated drill-down page** — Rejected: existing dialog already has all required functionality; avoid component duplication
2. **Full-page account detail** — Rejected: dialog pattern is established UX; keep consistent

---

## R4: Plaid SDK Integration — Technology Choice

### Decision: Use `plaid` npm package (v41+) with `@plaid/link-initialize` for Angular client

### Rationale
- **Server**: `plaid` npm package (v41.4.0) — official Node.js SDK
  - `PlaidApi` class with `linkTokenCreate()`, `itemPublicTokenExchange()`, `investmentsHoldingsGet()`, `investmentsTransactionsGet()`
  - Targets API version `2020-09-14`
  - Environments: `PlaidEnvironments.sandbox` (dev) and `.production`
- **Client**: `@plaid/link-initialize` — official framework-agnostic Plaid Link initializer
  - Works in Angular without wrappers
  - `create({ token, onSuccess, onExit, onEvent })` → `{ open, exit }`
  - Returns `public_token` on success for server exchange
- **Products**: `Products.Investments` provides holdings and transactions
- **Webhook support**: `HOLDINGS: DEFAULT_UPDATE` and `INVESTMENTS_TRANSACTIONS: DEFAULT_UPDATE`

### Security
- Access tokens encrypted at rest using AES-256-GCM with `PLAID_ENCRYPTION_KEY` env var
- `itemId` stored as public reference; `accessToken` only used server-side
- Never log access tokens

### Plaid → Ghostfolio Type Mapping
| Plaid `type` | AssetClass | Plaid `subtype` | AssetSubClass |
|---|---|---|---|
| equity | EQUITY | common stock, preferred equity | STOCK |
| etf | EQUITY | etf | ETF |
| mutual fund | EQUITY | mutual fund | MUTUALFUND |
| fixed income | FIXED_INCOME | bond, municipal bond | BOND |
| cash | LIQUIDITY | cash | CASH |
| cryptocurrency | LIQUIDITY | cryptocurrency | CRYPTOCURRENCY |
| derivative | EQUITY | option, warrant | STOCK |
| loan | FIXED_INCOME | — | BOND |
| other/null | ALTERNATIVE_INVESTMENT | private equity fund, LP unit | PRIVATE_EQUITY |

### Alternatives Considered
1. **`ngx-plaid-link` community package** — Rejected: community-maintained, may lag behind Plaid updates; `@plaid/link-initialize` is official
2. **CDN script tag** — Rejected: less type safety, harder to test; npm package preferred
3. **Build custom API client** — Rejected: official SDK is well-maintained and typed

---

## R5: Plaid Sync Queue — Infrastructure Pattern

### Decision: Follow existing BullMQ pattern with new `PLAID_SYNC_QUEUE`

### Rationale
- Existing pattern uses `@nestjs/bull` (Bull 4.x):
  - Queue registered in module: `BullModule.registerQueue({ name: QUEUE_NAME })`
  - Processor class with `@Processor(QUEUE_NAME)` and `@Process({ name: JOB_NAME })` methods
  - Service with `@InjectQueue()` exposing `addJobToQueue()`
  - Rate limiting via `limiter: { duration, max }` option
- Two queues already exist:
  - `DATA_GATHERING_QUEUE` — rate limited 1 job/4sec, 12 attempts with exponential backoff
  - `PORTFOLIO_SNAPSHOT_COMPUTATION_QUEUE` — custom lock duration
- Cron scheduling via `@nestjs/schedule` `@Cron()` decorator in `CronService`
- Feature flag pattern: `ENABLE_FEATURE_PLAID: bool({ default: false })`

### Implementation Approach
- New queue constant: `PLAID_SYNC_QUEUE = 'PLAID_SYNC_QUEUE'` in `libs/common/src/lib/config.ts`
- New module: `PlaidSyncModule` registering queue, processor, service
- Processor handles: `SYNC_INVESTMENTS` job (fetch holdings + transactions from Plaid, create/update Orders + SymbolProfiles)
- Cron: Daily sync at configurable time, guarded by `ENABLE_FEATURE_PLAID` flag
- On-demand: User-triggered refresh via API endpoint → enqueue job
- Rate limit: respect Plaid's rate limits (100 req/min production)

### Alternatives Considered
1. **Direct API calls without queue** — Rejected: queue provides retry logic, rate limiting, and non-blocking execution
2. **Separate microservice** — Rejected: massive overkill; Simplicity First; existing monorepo queue pattern works

---

## R6: Environment Variables — Plaid Configuration

### Decision: Add 5 new env vars following existing pattern

### Variables
| Variable | Type | Default | Purpose |
|---|---|---|---|
| `PLAID_CLIENT_ID` | string | `''` | Plaid API client ID |
| `PLAID_SECRET` | string | `''` | Plaid API secret |
| `PLAID_ENV` | string | `'sandbox'` | Plaid environment (sandbox/production) |
| `PLAID_ENCRYPTION_KEY` | string | `''` | 32-byte hex key for AES-256-GCM encryption of access tokens |
| `ENABLE_FEATURE_PLAID` | boolean | `false` | Feature flag to enable/disable Plaid integration |

### Implementation
1. Add to `Environment` interface in `apps/api/src/services/interfaces/environment.interface.ts`
2. Add to `cleanEnv()` validation in `apps/api/src/services/configuration/configuration.service.ts`
3. Access via `this.configurationService.get('PLAID_CLIENT_ID')`

---

## R7: Markets Page Permission — USER Role Access

### Decision: Markets basic view works for USER; premium Markets remains subscription-gated

### Rationale
- Two Markets views exist:
  - Basic `GfHomeMarketComponent` at `/home/markets` — does NOT call `readMarketDataOfMarkets`-gated endpoint
  - Premium `GfHomeMarketsPremiumComponent` at `/home/markets-premium` — calls `GET /market-data/markets` requiring `readMarketDataOfMarkets`
- `readMarketDataOfMarkets` is dynamically granted to Premium subscribers of ANY role (USER or ADMIN)
- The home page component (`home-page.component.ts` L80–87) already auto-switches between basic and premium based on permission
- No permission change needed — the routing already handles the correct view per subscription level

### Alternatives Considered
1. **Grant `readMarketData` to USER** — Rejected: `readMarketData` is admin-level (edit asset profiles); would be over-permissioning
2. **Remove Markets entirely for USER** — Rejected: basic view works and provides value

---

## R8: Account Type Storage

### Decision: Add optional `accountType` string field to Account model

### Rationale
- Plaid returns `account.type` (e.g., 'investment', 'depository', 'credit', 'loan') and `account.subtype` (e.g., '401k', 'brokerage', 'ira', 'checking')
- Currently, Account model has no `accountType` field
- Storing as a simple string field (not an enum) avoids frequent enum migrations as Plaid adds new account types
- Field is optional — manually-created accounts don't need it

### Alternatives Considered
1. **Prisma enum** — Rejected: Plaid adds new types over time; enum requires migration for each; string is more flexible
2. **Metadata JSON field** — Rejected: harder to query and filter; dedicated field is clearer
3. **Ignore account type** — Rejected: useful for filtering and display in FMV dashboard
