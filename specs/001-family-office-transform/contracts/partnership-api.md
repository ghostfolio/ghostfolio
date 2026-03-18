# REST API Contracts: Partnership Management

**Base Path**: `/api/v1/partnership`
**Auth**: All endpoints require `AuthGuard('jwt')` + `HasPermissionGuard`

## Endpoints

### `POST /api/v1/partnership`

Create a new partnership.

**Permission**: `createPartnership`

**Request Body** (`CreatePartnershipDto`):

```json
{
  "name": "Smith Capital Partners LP",
  "type": "LP",
  "inceptionDate": "2020-01-15",
  "fiscalYearEnd": 12,
  "currency": "USD"
}
```

| Field           | Type            | Required | Validation          |
| --------------- | --------------- | -------- | ------------------- |
| `name`          | string          | Yes      | Non-empty, trimmed  |
| `type`          | PartnershipType | Yes      | Valid enum          |
| `inceptionDate` | ISO date        | Yes      | Must be in the past |
| `fiscalYearEnd` | number          | No       | 1-12, default 12    |
| `currency`      | string          | Yes      | Valid currency code |

**Response** `201 Created`: Partnership object.

---

### `GET /api/v1/partnership`

List all partnerships for the authenticated user.

**Response** `200 OK`:

```json
[
  {
    "id": "uuid",
    "name": "Smith Capital Partners LP",
    "type": "LP",
    "inceptionDate": "2020-01-15T00:00:00.000Z",
    "currency": "USD",
    "latestNav": 5000000,
    "latestNavDate": "2025-12-31T00:00:00.000Z",
    "membersCount": 3,
    "assetsCount": 5
  }
]
```

---

### `GET /api/v1/partnership/:partnershipId`

Get partnership detail with members, assets, and latest valuation.

**Response** `200 OK`:

```json
{
  "id": "uuid",
  "name": "Smith Capital Partners LP",
  "type": "LP",
  "inceptionDate": "2020-01-15T00:00:00.000Z",
  "fiscalYearEnd": 12,
  "currency": "USD",
  "latestValuation": {
    "date": "2025-12-31",
    "nav": 5000000,
    "source": "NAV_STATEMENT"
  },
  "members": [
    {
      "id": "uuid",
      "entityId": "uuid",
      "entityName": "Smith Family Trust",
      "ownershipPercent": 60,
      "capitalCommitment": 3000000,
      "capitalContributed": 2500000,
      "classType": "Class A LP",
      "allocatedNav": 3000000,
      "effectiveDate": "2020-01-15T00:00:00.000Z"
    }
  ],
  "assets": [
    {
      "id": "uuid",
      "name": "123 Main Street",
      "assetType": "REAL_ESTATE",
      "currentValue": 2000000,
      "acquisitionCost": 1500000,
      "currency": "USD"
    }
  ],
  "totalCommitment": 5000000,
  "totalContributed": 4000000
}
```

---

### `PUT /api/v1/partnership/:partnershipId`

Update partnership details.

**Permission**: `updatePartnership`

**Request Body** (`UpdatePartnershipDto`):

```json
{
  "name": "Smith Capital Partners LP (Series A)",
  "fiscalYearEnd": 3
}
```

**Response** `200 OK`: Updated partnership object.

---

### `DELETE /api/v1/partnership/:partnershipId`

Delete a partnership and cascade to all related data.

**Permission**: `deletePartnership`

**Response** `200 OK`: Empty body.

---

### `POST /api/v1/partnership/:partnershipId/member`

Add a member entity to the partnership.

**Permission**: `updatePartnership`

**Request Body** (`CreatePartnershipMembershipDto`):

```json
{
  "entityId": "uuid",
  "ownershipPercent": 25,
  "capitalCommitment": 1250000,
  "capitalContributed": 1000000,
  "classType": "Class A LP",
  "effectiveDate": "2020-01-15"
}
```

**Response** `201 Created`: Membership record.
**Error** `400 Bad Request`: Total membership percentages would exceed 100%.

---

### `PUT /api/v1/partnership/:partnershipId/member/:membershipId`

Update a membership (e.g., change percentage, add contribution).

**Permission**: `updatePartnership`

**Response** `200 OK`: Updated membership record.

---

### `POST /api/v1/partnership/:partnershipId/valuation`

Record a NAV statement for the partnership.

**Permission**: `updatePartnership`

**Request Body** (`CreatePartnershipValuationDto`):

```json
{
  "date": "2025-12-31",
  "nav": 5000000,
  "source": "NAV_STATEMENT",
  "notes": "Q4 2025 fund admin statement"
}
```

**Response** `201 Created`: Valuation record.
**Error** `409 Conflict`: Valuation already exists for this date.

---

### `GET /api/v1/partnership/:partnershipId/valuations`

Get valuation history for a partnership.

**Query Parameters**:
| Param | Type | Required | Default |
|-------|------|----------|---------|
| `startDate` | ISO date | No | — |
| `endDate` | ISO date | No | — |

**Response** `200 OK`:

```json
[
  {
    "id": "uuid",
    "date": "2025-12-31",
    "nav": 5000000,
    "source": "NAV_STATEMENT"
  },
  {
    "id": "uuid",
    "date": "2025-09-30",
    "nav": 4800000,
    "source": "NAV_STATEMENT"
  }
]
```

---

### `POST /api/v1/partnership/:partnershipId/asset`

Add an underlying asset to the partnership.

**Permission**: `updatePartnership`

**Request Body** (`CreatePartnershipAssetDto`):

```json
{
  "name": "123 Main Street",
  "assetType": "REAL_ESTATE",
  "description": "4-unit multifamily in Austin, TX",
  "acquisitionDate": "2021-06-01",
  "acquisitionCost": 1500000,
  "currentValue": 2000000,
  "currency": "USD",
  "metadata": { "address": "123 Main St, Austin, TX 78701", "units": 4 }
}
```

**Response** `201 Created`: Partnership asset record.

---

### `POST /api/v1/partnership/:partnershipId/asset/:assetId/valuation`

Record a valuation for a partnership asset.

**Permission**: `updatePartnership`

**Request Body**:

```json
{
  "date": "2025-12-31",
  "value": 2200000,
  "source": "APPRAISAL",
  "notes": "Annual appraisal by Jones & Co."
}
```

**Response** `201 Created`: Asset valuation record.

---

### `GET /api/v1/partnership/:partnershipId/performance`

Get partnership performance metrics with optional benchmark comparison.

**Query Parameters**:
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `periodicity` | `MONTHLY` \| `QUARTERLY` \| `YEARLY` | No | `QUARTERLY` | Return period size |
| `benchmarks` | string (comma-separated) | No | — | Benchmark IDs (e.g., `SP500,REAL_ESTATE`) |
| `startDate` | ISO date | No | inception | Date range start |
| `endDate` | ISO date | No | latest | Date range end |

**Response** `200 OK`:

```json
{
  "partnershipId": "uuid",
  "partnershipName": "Smith Capital Partners LP",
  "metrics": {
    "irr": 0.12,
    "tvpi": 1.3,
    "dpi": 0.4,
    "rvpi": 0.9
  },
  "periods": [
    {
      "periodStart": "2025-10-01",
      "periodEnd": "2025-12-31",
      "returnPercent": 0.042,
      "startNav": 4800000,
      "endNav": 5000000,
      "contributions": 0,
      "distributions": 50000
    }
  ],
  "benchmarkComparisons": [
    {
      "id": "SP500",
      "name": "S&P 500",
      "periods": [
        {
          "periodStart": "2025-10-01",
          "periodEnd": "2025-12-31",
          "returnPercent": 0.038
        }
      ],
      "cumulativeReturn": 0.45,
      "excessReturn": 0.05
    }
  ]
}
```
