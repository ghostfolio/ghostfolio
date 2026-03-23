# API Contracts: Navigation & FMV Changes

No new API endpoints are needed for the navigation restoration (US1) or FMV Dashboard (US2/US3). These features reuse existing endpoints.

---

## Existing Endpoints Used by FMV Dashboard

### GET /api/v1/account

Already returns `AccountsResponse` — provides all data for the FMV dashboard.

**Response** (unchanged):
```typescript
interface AccountsResponse {
  accounts: AccountWithValue[];
  activitiesCount: number;
  totalBalanceInBaseCurrency: number;
  totalDividendInBaseCurrency: number;
  totalInterestInBaseCurrency: number;
  totalValueInBaseCurrency: number;   // ← The aggregate FMV
}

type AccountWithValue = Account & {
  activitiesCount: number;
  allocationInPercentage: number;
  balanceInBaseCurrency: number;
  dividendInBaseCurrency: number;
  interestInBaseCurrency: number;
  platform?: Platform;
  value: number;
  valueInBaseCurrency: number;        // ← Per-account FMV
};
```

### GET /api/v1/portfolio/holdings?accounts[]=:accountId

Returns `PortfolioPosition[]` for a specific account — used in account drill-down.

**Response** (unchanged):
```typescript
interface PortfolioPosition {
  activitiesCount: number;
  allocationInPercentage: number;
  assetProfile: {
    assetClass: AssetClass;
    assetSubClass: AssetSubClass;
    currency: string;
    dataSource: DataSource;
    name: string;
    symbol: string;
    // ...
  };
  investment: number;                 // ← Cost basis
  marketPrice: number;
  netPerformance: number;             // ← Unrealized gain/loss
  netPerformancePercent: number;      // ← Unrealized gain/loss %
  quantity: number;
  valueInBaseCurrency: number;        // ← Current market value
}
```

### GET /api/v2/portfolio/performance?accounts[]=:accountId&range=max

Returns performance chart data filtered by account — used in account detail.

---

## Client-Side Changes (No API Impact)

### Navigation Structure Change

**Before** (current):
```
FO Dashboard | Partnerships ▼ | Portfolio Views ▼ | K-1 Center ▼ | Analysis ▼ | [Admin ▼ (admin-only)]
                                                                                    ├─ Admin Control
                                                                                    ├─ Accounts
                                                                                    ├─ Resources
                                                                                    ├─ ──────
                                                                                    ├─ Overview
                                                                                    ├─ Holdings
                                                                                    ├─ Summary
                                                                                    ├─ Markets
                                                                                    ├─ Watchlist
                                                                                    ├─ FIRE
                                                                                    └─ X-Ray
```

**After** (proposed):
```
FO Dashboard | FMV ▼ | Partnerships ▼ | Portfolio Views ▼ | K-1 Center ▼ | Analysis ▼ | [Admin ▼ (admin-only)]
               ├─ Dashboard  (new)                                          ├─ Overview
               └─ Accounts   (existing /accounts)                           ├─ Holdings
                                                                            ├─ Summary
                                                                            ├─ Markets
                                                                            ├─ Watchlist
                                                                            ├─ FIRE
                                                                            └─ X-Ray
```

- Legacy items (Overview, Holdings, Summary, Markets, Watchlist, FIRE, X-Ray) move to "Analysis" dropdown — visible to all authenticated users
- New "FMV" dropdown with Dashboard and Accounts
- Admin dropdown retains: Admin Control, Resources, Pricing
