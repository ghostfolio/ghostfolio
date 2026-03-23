# Quickstart: 009-fmv-plaid-drilldown

## Prerequisites

- Docker running (`gf-postgres-dev` on 5434, `gf-redis-dev` on 6379)
- Node.js 20+, npm
- Plaid sandbox credentials (for US4/US5 only; US1-US3 don't need Plaid)

## Setup

```bash
# Checkout branch
git checkout 009-fmv-plaid-drilldown

# Install dependencies (if new packages added)
npm install

# Run Prisma migration (after data model changes)
npx prisma migrate dev

# Generate Prisma client
npx prisma generate

# Start dev
npx nx serve api
npx nx serve client
```

## Environment Variables (for Plaid — US4/US5 only)

Add to `.env`:
```env
# Plaid Integration
ENABLE_FEATURE_PLAID=true
PLAID_CLIENT_ID=<your-sandbox-client-id>
PLAID_SECRET=<your-sandbox-secret>
PLAID_ENV=sandbox
PLAID_ENCRYPTION_KEY=<32-byte-hex-key>
```

Generate encryption key:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Get Plaid sandbox credentials from https://dashboard.plaid.com/developers/keys

## Implementation Order

1. **US1** — Nav restoration (client-only change, no API changes)
2. **US2** — FMV Dashboard page (new Angular components, reuses existing API)
3. **US3** — Asset Drill-Down (wire FMV cards to existing account-detail-dialog)
4. **US4** — Plaid Linking (Prisma migration + NestJS Plaid module + client Link flow)
5. **US5** — Plaid Sync (BullMQ queue + processor + cron + webhooks)

## Verification

### US1 — Nav
1. Login as USER role
2. Verify Analysis dropdown shows Overview, Holdings, Summary, Markets, Watchlist, FIRE, X-Ray
3. Navigate to each — all should render data

### US2 — FMV Dashboard
1. Navigate to `/fmv` or FMV → Dashboard
2. Verify hero total matches sum of account values
3. Verify account cards show name, value, allocation %

### US3 — Drill-Down
1. Click an account card in FMV Dashboard
2. Verify account detail dialog opens with Holdings tab
3. Verify holdings show symbol, quantity, cost basis, value, gain/loss

### US4 — Plaid Link
1. Set `ENABLE_FEATURE_PLAID=true` in .env, restart API
2. Click "Link Account via Plaid" in FMV view
3. Use Plaid sandbox credentials: user_good / pass_good
4. Verify account created with holdings

### US5 — Plaid Sync
1. After initial link, check `lastSyncedAt` on PlaidItem
2. Trigger manual refresh from UI
3. Verify sync job runs and timestamps update
