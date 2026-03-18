# REST API Contracts: Entity Management

**Base Path**: `/api/v1/entity`
**Auth**: All endpoints require `AuthGuard('jwt')` + `HasPermissionGuard`

## Endpoints

### `POST /api/v1/entity`

Create a new entity.

**Permission**: `createEntity`

**Request Body** (`CreateEntityDto`):

```json
{
  "name": "Smith Family Trust",
  "type": "TRUST",
  "taxId": "12-3456789"
}
```

| Field   | Type       | Required | Validation               |
| ------- | ---------- | -------- | ------------------------ |
| `name`  | string     | Yes      | Non-empty, trimmed       |
| `type`  | EntityType | Yes      | Must be valid enum value |
| `taxId` | string     | No       | Trimmed if provided      |

**Response** `201 Created`:

```json
{
  "id": "uuid",
  "name": "Smith Family Trust",
  "type": "TRUST",
  "taxId": "12-3456789",
  "createdAt": "2026-03-15T00:00:00.000Z",
  "updatedAt": "2026-03-15T00:00:00.000Z"
}
```

---

### `GET /api/v1/entity`

List all entities for the authenticated user.

**Permission**: None (auth guard only)

**Query Parameters**:
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `type` | EntityType | No | — | Filter by entity type |

**Response** `200 OK`:

```json
[
  {
    "id": "uuid",
    "name": "Smith Family Trust",
    "type": "TRUST",
    "taxId": "12-3456789",
    "totalValue": 5000000,
    "ownershipsCount": 3,
    "membershipsCount": 2,
    "createdAt": "2026-03-15T00:00:00.000Z"
  }
]
```

---

### `GET /api/v1/entity/:entityId`

Get entity detail with ownership and membership summary.

**Permission**: None (auth guard only)

**Response** `200 OK`:

```json
{
  "id": "uuid",
  "name": "Smith Family Trust",
  "type": "TRUST",
  "taxId": "12-3456789",
  "ownerships": [
    {
      "id": "uuid",
      "accountId": "uuid",
      "accountName": "Schwab Brokerage",
      "ownershipPercent": 100,
      "effectiveDate": "2020-01-01T00:00:00.000Z",
      "allocatedValue": 1500000
    }
  ],
  "memberships": [
    {
      "id": "uuid",
      "partnershipId": "uuid",
      "partnershipName": "Smith Capital Partners LP",
      "ownershipPercent": 60,
      "capitalCommitment": 1000000,
      "capitalContributed": 750000,
      "classType": "Class A LP",
      "allocatedNav": 900000
    }
  ],
  "totalValue": 2400000,
  "createdAt": "2026-03-15T00:00:00.000Z"
}
```

---

### `PUT /api/v1/entity/:entityId`

Update an existing entity.

**Permission**: `updateEntity`

**Request Body** (`UpdateEntityDto`):

```json
{
  "name": "Smith Family Trust (Amended)",
  "taxId": "12-3456789"
}
```

**Response** `200 OK`: Updated entity object.

---

### `DELETE /api/v1/entity/:entityId`

Delete an entity. Fails if entity has active ownerships or memberships.

**Permission**: `deleteEntity`

**Response** `200 OK`: Empty body.
**Error** `409 Conflict`: Entity has active relationships.

---

### `GET /api/v1/entity/:entityId/portfolio`

Get consolidated portfolio view for an entity.

**Permission**: None (auth guard only)

**Query Parameters**:
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `dateRange` | string | No | `max` | Date range filter |

**Response** `200 OK`:

```json
{
  "entityId": "uuid",
  "entityName": "Smith Family Trust",
  "totalValue": 2400000,
  "currency": "USD",
  "accounts": [
    {
      "accountId": "uuid",
      "accountName": "Schwab Brokerage",
      "ownershipPercent": 100,
      "allocatedValue": 1500000
    }
  ],
  "partnerships": [
    {
      "partnershipId": "uuid",
      "partnershipName": "Smith Capital Partners LP",
      "ownershipPercent": 60,
      "allocatedNav": 900000,
      "irr": 0.12,
      "tvpi": 1.3
    }
  ],
  "allocationByStructure": {
    "TRUST": { "value": 2400000, "percentage": 100 }
  },
  "allocationByAssetClass": {
    "EQUITY": { "value": 1500000, "percentage": 62.5 },
    "PRIVATE_EQUITY": { "value": 900000, "percentage": 37.5 }
  }
}
```

---

### `POST /api/v1/entity/:entityId/ownership`

Assign account ownership to an entity.

**Permission**: `updateEntity`

**Request Body** (`CreateOwnershipDto`):

```json
{
  "accountId": "uuid",
  "ownershipPercent": 60,
  "effectiveDate": "2026-01-01",
  "acquisitionDate": "2020-06-15",
  "costBasis": 500000
}
```

**Response** `201 Created`: Ownership record.
**Error** `400 Bad Request`: Total ownership for account would exceed 100%.

---

### `GET /api/v1/entity/:entityId/distributions`

Get distributions received by an entity.

**Permission**: None (auth guard only)

**Query Parameters**:
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `startDate` | ISO date | No | — | Filter start |
| `endDate` | ISO date | No | — | Filter end |
| `groupBy` | `MONTHLY` \| `QUARTERLY` \| `YEARLY` | No | — | Period grouping |

**Response** `200 OK`:

```json
{
  "distributions": [...],
  "summary": {
    "total": 150000,
    "byType": { "CAPITAL_GAIN": 80000, "INCOME": 70000 },
    "byPartnership": { "uuid": 150000 },
    "byPeriod": { "2025-Q4": 40000, "2026-Q1": 110000 }
  }
}
```

---

### `GET /api/v1/entity/:entityId/k-documents`

Get K-1/K-3 documents allocated to this entity.

**Permission**: None (auth guard only)

**Query Parameters**:
| Param | Type | Required | Default |
|-------|------|----------|---------|
| `taxYear` | number | No | — |

**Response** `200 OK`:

```json
[
  {
    "kDocumentId": "uuid",
    "partnershipId": "uuid",
    "partnershipName": "Smith Capital Partners LP",
    "type": "K1",
    "taxYear": 2025,
    "filingStatus": "FINAL",
    "ownershipPercent": 60,
    "allocatedAmounts": {
      "ordinaryIncome": 60000,
      "capitalGainLossLongTerm": 30000,
      "foreignTaxesPaid": 1200
    }
  }
]
```
