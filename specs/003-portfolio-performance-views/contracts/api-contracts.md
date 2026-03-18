# API Contracts: Portfolio Performance Views

**Feature**: 003-portfolio-performance-views
**Date**: 2026-03-16
**Base URL**: `/api/v1/family-office`

## Endpoints

### GET /api/v1/family-office/portfolio-summary

Returns entity-level rollup metrics for the Portfolio Summary view.

**Authentication**: JWT required, `permissions.readEntity` required
**Query Parameters**:

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| valuationYear | number | No | Current year | Year-end through which metrics are computed |

**Response** `200 OK`: `IPortfolioSummary`

```typescript
interface IPortfolioSummary {
  valuationYear: number;
  entities: IEntityPerformanceRow[];
  totals: IPerformanceRow;
}

interface IEntityPerformanceRow extends IPerformanceRow {
  entityId: string;
  entityName: string;
}

interface IPerformanceRow {
  originalCommitment: number;
  percentCalled: number | null;     // null when commitment = 0
  unfundedCommitment: number;
  paidIn: number;
  distributions: number;
  residualUsed: number;
  dpi: number;
  rvpi: number;
  tvpi: number;
  irr: number | null;               // null when XIRR cannot be computed
}
```

**Error Responses**:
- `401 Unauthorized` — Missing or invalid JWT
- `403 Forbidden` — Insufficient permissions

---

### GET /api/v1/family-office/asset-class-summary

Returns asset-class-level rollup metrics for the Asset Class Summary view.

**Authentication**: JWT required, `permissions.readEntity` required
**Query Parameters**:

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| valuationYear | number | No | Current year | Year-end through which metrics are computed |

**Response** `200 OK`: `IAssetClassSummary`

```typescript
interface IAssetClassSummary {
  valuationYear: number;
  assetClasses: IAssetClassPerformanceRow[];
  totals: IPerformanceRow;
}

interface IAssetClassPerformanceRow extends IPerformanceRow {
  assetClass: string;               // FamilyOfficeAssetType enum value
  assetClassLabel: string;          // Display name (e.g., "Real Estate")
}
```

**Error Responses**:
- `401 Unauthorized` — Missing or invalid JWT
- `403 Forbidden` — Insufficient permissions

---

### GET /api/v1/family-office/activity

Returns detailed activity rows for the Activity Detail view.

**Authentication**: JWT required, `permissions.readEntity` required
**Query Parameters**:

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| entityId | string | No | All entities | Filter to a specific entity |
| partnershipId | string | No | All partnerships | Filter to a specific partnership |
| year | number | No | All years | Filter to a specific tax year |
| skip | number | No | 0 | Pagination offset |
| take | number | No | 50 | Pagination limit (max 200) |

**Response** `200 OK`: `IActivityDetail`

```typescript
interface IActivityDetail {
  rows: IActivityRow[];
  totalCount: number;               // For pagination
  filters: {
    entities: { id: string; name: string }[];
    partnerships: { id: string; name: string }[];
    years: number[];
  };
}

interface IActivityRow {
  year: number;
  entityId: string;
  entityName: string;
  partnershipId: string;
  partnershipName: string;

  // Basis & Contributions
  beginningBasis: number;
  contributions: number;

  // Income Components (from K1Data)
  interest: number;
  dividends: number;
  capitalGains: number;
  remainingK1IncomeDed: number;
  totalIncome: number;              // Computed: sum of above 4

  // Outflows
  distributions: number;
  otherAdjustments: number;

  // Balances
  endingTaxBasis: number;
  endingGLBalance: number | null;   // null if not entered
  bookToTaxAdj: number | null;      // null if GL balance not available
  endingK1CapitalAccount: number | null;
  k1CapitalVsTaxBasisDiff: number | null;

  // Flags
  excessDistribution: number;
  negativeBasis: boolean;
  deltaEndingBasis: number;

  // Metadata
  notes: string | null;
}
```

**Error Responses**:
- `401 Unauthorized` — Missing or invalid JWT
- `403 Forbidden` — Insufficient permissions
- `400 Bad Request` — Invalid filter parameters

---

## Shared Types

These interfaces are added to `@ghostfolio/common` (`libs/common/src/lib/interfaces/family-office.interface.ts`):

```typescript
// Re-exported from the interfaces barrel
export {
  IPortfolioSummary,
  IEntityPerformanceRow,
  IPerformanceRow,
  IAssetClassSummary,
  IAssetClassPerformanceRow,
  IActivityDetail,
  IActivityRow
};
```

## Client Service Methods

Added to `FamilyOfficeDataService` (`apps/client/src/app/services/family-office-data.service.ts`):

```typescript
fetchPortfolioSummary(params?: { valuationYear?: number }): Observable<IPortfolioSummary>
// GET /api/v1/family-office/portfolio-summary

fetchAssetClassSummary(params?: { valuationYear?: number }): Observable<IAssetClassSummary>
// GET /api/v1/family-office/asset-class-summary

fetchActivity(params?: {
  entityId?: string;
  partnershipId?: string;
  year?: number;
  skip?: number;
  take?: number;
}): Observable<IActivityDetail>
// GET /api/v1/family-office/activity
```

## Number Format Conventions

All monetary values in API responses are raw numbers (no formatting). The client applies formatting:

| Type | Format | Example |
|---|---|---|
| Monetary (positive) | Comma-separated | 1,000,000 |
| Monetary (negative) | Parenthetical | (355,885) |
| Monetary (zero) | Dash | - |
| Ratio (DPI/RVPI/TVPI) | 2 decimal places | 2.00 |
| Percentage (% Called) | Whole percent | 100% |
| IRR | Percentage with 2 decimals | 12.34% |
| IRR (unavailable) | Text | N/A |
