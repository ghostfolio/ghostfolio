# REST API Contracts: Distribution & K-Document Management

**Auth**: All endpoints require `AuthGuard('jwt')` + `HasPermissionGuard`

---

## Distribution Endpoints

**Base Path**: `/api/v1/distribution`

### `POST /api/v1/distribution`

Record a new distribution.

**Permission**: `createDistribution`

**Request Body** (`CreateDistributionDto`):

```json
{
  "partnershipId": "uuid",
  "entityId": "uuid",
  "type": "RETURN_OF_CAPITAL",
  "amount": 50000,
  "date": "2026-03-01",
  "currency": "USD",
  "taxWithheld": 5000,
  "notes": "Q4 2025 distribution"
}
```

| Field           | Type             | Required | Validation                                              |
| --------------- | ---------------- | -------- | ------------------------------------------------------- |
| `partnershipId` | string           | No       | Valid partnership UUID owned by user                    |
| `entityId`      | string           | Yes      | Valid entity UUID owned by user                         |
| `type`          | DistributionType | Yes      | Valid enum value                                        |
| `amount`        | number           | Yes      | > 0                                                     |
| `date`          | ISO date         | Yes      | >= partnership inception date (if partnership provided) |
| `currency`      | string           | Yes      | Valid currency code                                     |
| `taxWithheld`   | number           | No       | >= 0, default 0                                         |
| `notes`         | string           | No       | Trimmed if provided                                     |

**Response** `201 Created`: Distribution record.
**Error** `400 Bad Request`: Date before partnership inception.

---

### `GET /api/v1/distribution`

List distributions with filtering and grouping.

**Query Parameters**:
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `entityId` | string | No | — | Filter by receiving entity |
| `partnershipId` | string | No | — | Filter by source partnership |
| `type` | DistributionType | No | — | Filter by type |
| `startDate` | ISO date | No | — | Date range start |
| `endDate` | ISO date | No | — | Date range end |
| `groupBy` | `MONTHLY` \| `QUARTERLY` \| `YEARLY` | No | — | Period grouping |

**Response** `200 OK`:

```json
{
  "distributions": [
    {
      "id": "uuid",
      "partnershipId": "uuid",
      "partnershipName": "Smith Capital Partners LP",
      "entityId": "uuid",
      "entityName": "Smith Family Trust",
      "type": "RETURN_OF_CAPITAL",
      "amount": 50000,
      "date": "2026-03-01T00:00:00.000Z",
      "currency": "USD",
      "taxWithheld": 5000,
      "netAmount": 45000,
      "notes": "Q4 2025 distribution"
    }
  ],
  "summary": {
    "totalGross": 150000,
    "totalTaxWithheld": 15000,
    "totalNet": 135000,
    "byType": {
      "RETURN_OF_CAPITAL": 80000,
      "INCOME": 50000,
      "CAPITAL_GAIN": 20000
    },
    "byPartnership": {
      "uuid": { "name": "Smith Capital Partners LP", "total": 100000 },
      "uuid2": { "name": "Real Estate Fund II", "total": 50000 }
    },
    "byPeriod": {
      "2025-Q4": 40000,
      "2026-Q1": 110000
    }
  }
}
```

---

### `DELETE /api/v1/distribution/:distributionId`

Delete a distribution record.

**Permission**: `deleteDistribution`

**Response** `200 OK`: Empty body.

---

## K-Document Endpoints

**Base Path**: `/api/v1/k-document`

### `POST /api/v1/k-document`

Create a K-1 or K-3 document entry for a partnership tax year.

**Permission**: `createKDocument`

**Request Body** (`CreateKDocumentDto`):

```json
{
  "partnershipId": "uuid",
  "type": "K1",
  "taxYear": 2025,
  "filingStatus": "ESTIMATED",
  "data": {
    "ordinaryIncome": 100000,
    "netRentalIncome": 0,
    "otherRentalIncome": 0,
    "guaranteedPayments": 25000,
    "interestIncome": 5000,
    "dividends": 3000,
    "qualifiedDividends": 2000,
    "royalties": 0,
    "capitalGainLossShortTerm": -2000,
    "capitalGainLossLongTerm": 50000,
    "unrecaptured1250Gain": 0,
    "section1231GainLoss": 0,
    "otherIncome": 0,
    "section179Deduction": 10000,
    "otherDeductions": 5000,
    "selfEmploymentEarnings": 0,
    "foreignTaxesPaid": 2000,
    "alternativeMinimumTaxItems": 0,
    "distributionsCash": 80000,
    "distributionsProperty": 0
  }
}
```

| Field           | Type            | Required | Validation                    |
| --------------- | --------------- | -------- | ----------------------------- |
| `partnershipId` | string          | Yes      | Valid partnership UUID        |
| `type`          | KDocumentType   | Yes      | K1 or K3                      |
| `taxYear`       | number          | Yes      | >= partnership inception year |
| `filingStatus`  | KDocumentStatus | No       | Default DRAFT                 |
| `data`          | K1Data          | Yes      | All numeric fields            |

**Response** `201 Created`: K-document record with allocated amounts preview.
**Error** `409 Conflict`: K-document already exists for this partnership/type/year.

---

### `GET /api/v1/k-document`

List K-documents with filtering.

**Query Parameters**:
| Param | Type | Required | Default |
|-------|------|----------|---------|
| `partnershipId` | string | No | — |
| `taxYear` | number | No | — |
| `type` | KDocumentType | No | — |
| `filingStatus` | KDocumentStatus | No | — |

**Response** `200 OK`:

```json
[
  {
    "id": "uuid",
    "partnershipId": "uuid",
    "partnershipName": "Smith Capital Partners LP",
    "type": "K1",
    "taxYear": 2025,
    "filingStatus": "ESTIMATED",
    "data": { ... },
    "documentFileId": null,
    "allocations": [
      {
        "entityId": "uuid",
        "entityName": "Smith Family Trust",
        "ownershipPercent": 60,
        "allocatedAmounts": {
          "ordinaryIncome": 60000,
          "capitalGainLossLongTerm": 30000,
          "foreignTaxesPaid": 1200
        }
      }
    ],
    "createdAt": "2026-03-15T00:00:00.000Z",
    "updatedAt": "2026-03-15T00:00:00.000Z"
  }
]
```

---

### `PUT /api/v1/k-document/:kDocumentId`

Update K-document data and/or status.

**Permission**: `updateKDocument`

**Request Body**:

```json
{
  "filingStatus": "FINAL",
  "data": {
    "ordinaryIncome": 105000,
    "capitalGainLossLongTerm": 48000
  }
}
```

Partial updates to `data` are merged with existing data (spread operator).

**Response** `200 OK`: Updated K-document with recalculated allocations.

---

### `POST /api/v1/k-document/:kDocumentId/link-document`

Link an uploaded document file to a K-document record.

**Permission**: `updateKDocument`

**Request Body**:

```json
{
  "documentId": "uuid"
}
```

**Response** `200 OK`: Updated K-document.

---

## Document Upload Endpoints

**Base Path**: `/api/v1/upload`

### `POST /api/v1/upload`

Upload a document file (PDF, etc.).

**Permission**: `uploadDocument`

**Request**: `multipart/form-data`
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | File | Yes | The document file |
| `type` | DocumentType | Yes | Document category |
| `name` | string | No | Display name (defaults to filename) |
| `entityId` | string | No | Associated entity |
| `partnershipId` | string | No | Associated partnership |
| `taxYear` | number | No | Associated tax year |

**Response** `201 Created`:

```json
{
  "id": "uuid",
  "name": "Smith_Capital_K1_2025.pdf",
  "type": "K1",
  "filePath": "/uploads/2026/03/uuid.pdf",
  "fileSize": 245000,
  "mimeType": "application/pdf",
  "taxYear": 2025,
  "partnershipId": "uuid",
  "createdAt": "2026-03-15T00:00:00.000Z"
}
```

---

### `GET /api/v1/upload/:documentId/download`

Download a document file.

**Response** `200 OK`: File stream with appropriate Content-Type and Content-Disposition headers.

---

## Family Office Dashboard & Reporting Endpoints

**Base Path**: `/api/v1/family-office`

### `GET /api/v1/family-office/dashboard`

Get consolidated family office dashboard data.

**Response** `200 OK`:

```json
{
  "totalAum": 15000000,
  "currency": "USD",
  "entitiesCount": 3,
  "partnershipsCount": 5,
  "allocationByEntity": [
    {
      "entityId": "uuid",
      "entityName": "Smith Family Trust",
      "value": 8000000,
      "percentage": 53.3
    }
  ],
  "allocationByAssetClass": [
    { "assetClass": "EQUITY", "value": 5000000, "percentage": 33.3 },
    { "assetClass": "REAL_ESTATE", "value": 4000000, "percentage": 26.7 },
    { "assetClass": "PRIVATE_EQUITY", "value": 3000000, "percentage": 20.0 },
    { "assetClass": "FIXED_INCOME", "value": 2000000, "percentage": 13.3 },
    { "assetClass": "CASH", "value": 1000000, "percentage": 6.7 }
  ],
  "allocationByStructure": [
    { "structureType": "TRUST", "value": 8000000, "percentage": 53.3 },
    { "structureType": "LLC", "value": 4000000, "percentage": 26.7 },
    { "structureType": "INDIVIDUAL", "value": 3000000, "percentage": 20.0 }
  ],
  "recentDistributions": [
    {
      "id": "uuid",
      "partnershipName": "Smith Capital LP",
      "amount": 50000,
      "date": "2026-03-01",
      "type": "INCOME"
    }
  ],
  "kDocumentStatus": {
    "taxYear": 2025,
    "total": 5,
    "draft": 1,
    "estimated": 2,
    "final": 2
  }
}
```

---

### `GET /api/v1/family-office/report`

Generate a consolidated periodic report.

**Query Parameters**:
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `entityId` | string | No | — | Scope to one entity (omit for family-wide) |
| `period` | `MONTHLY` \| `QUARTERLY` \| `YEARLY` | Yes | — | Report period type |
| `year` | number | Yes | — | Report year |
| `periodNumber` | number | Yes for MONTHLY/QUARTERLY | — | Month (1-12) or quarter (1-4) |
| `benchmarks` | string (comma-separated) | No | — | Benchmark IDs for comparison |

**Response** `200 OK`:

```json
{
  "reportTitle": "Q4 2025 Family Office Report",
  "period": { "start": "2025-10-01", "end": "2025-12-31" },
  "entity": null,
  "summary": {
    "totalValueStart": 14000000,
    "totalValueEnd": 15000000,
    "periodChange": 1000000,
    "periodChangePercent": 0.0714,
    "ytdChangePercent": 0.12
  },
  "assetAllocation": { ... },
  "partnershipPerformance": [
    {
      "partnershipId": "uuid",
      "partnershipName": "Smith Capital Partners LP",
      "periodReturn": 0.042,
      "irr": 0.12,
      "tvpi": 1.3,
      "dpi": 0.4
    }
  ],
  "distributionSummary": {
    "periodTotal": 75000,
    "byType": { "INCOME": 45000, "CAPITAL_GAIN": 30000 }
  },
  "benchmarkComparisons": [
    {
      "id": "SP500",
      "name": "S&P 500",
      "periodReturn": 0.038,
      "ytdReturn": 0.10
    }
  ]
}
```
