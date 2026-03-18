# API Contracts: K-1 Import

**Phase 1 Output** | **Date**: 2026-03-18

## Base Path

All endpoints under `/api/v1/k1-import/`

## Authentication

All endpoints require JWT authentication (`AuthGuard('jwt')`) and appropriate permissions via `HasPermissionGuard`.

---

## Endpoints

### POST /api/v1/k1-import/upload

Upload a K-1 PDF and initiate extraction.

**Permission**: `createKDocument`

**Request**: `multipart/form-data`

| Field           | Type     | Required | Description                          |
| --------------- | -------- | -------- | ------------------------------------ |
| `file`          | File     | Yes      | PDF file (max 25 MB, MIME: application/pdf) |
| `partnershipId` | `string` | Yes      | Target partnership UUID              |
| `taxYear`       | `number` | Yes      | Tax year for this K-1               |

**Response**: `201 Created`

```json
{
  "id": "uuid",
  "partnershipId": "uuid",
  "status": "PROCESSING",
  "taxYear": 2025,
  "fileName": "K1-Smith-Capital-2025.pdf",
  "fileSize": 245760,
  "extractionMethod": "pdf-parse",
  "createdAt": "2026-03-18T00:00:00.000Z"
}
```

**Errors**:

| Status | Condition                              |
| ------ | -------------------------------------- |
| 400    | File is not a valid PDF                |
| 400    | File exceeds 25 MB size limit          |
| 400    | Partnership not found or not owned by user |
| 400    | Partnership has no active members      |
| 400    | Tax year < partnership inception year  |

---

### GET /api/v1/k1-import/:id

Get the current state of an import session, including extraction results.

**Permission**: `readKDocument`

**Response**: `200 OK`

```json
{
  "id": "uuid",
  "partnershipId": "uuid",
  "status": "EXTRACTED",
  "taxYear": 2025,
  "fileName": "K1-Smith-Capital-2025.pdf",
  "fileSize": 245760,
  "extractionMethod": "pdf-parse",
  "rawExtraction": {
    "metadata": {
      "partnershipName": "Smith Capital Partners LP",
      "partnershipEin": "12-3456789",
      "partnerName": "Smith Family Trust",
      "partnerEin": "98-7654321",
      "taxYear": 2025,
      "isAmended": false,
      "isFinal": true
    },
    "fields": [
      {
        "boxNumber": "1",
        "label": "Ordinary business income (loss)",
        "customLabel": null,
        "rawValue": "$52,340",
        "numericValue": 52340,
        "confidence": 0.95,
        "confidenceLevel": "HIGH",
        "isUserEdited": false
      }
    ],
    "overallConfidence": 0.92,
    "method": "pdf-parse",
    "pagesProcessed": 2
  },
  "verifiedData": null,
  "documentId": "uuid",
  "kDocumentId": null,
  "errorMessage": null,
  "createdAt": "2026-03-18T00:00:00.000Z",
  "updatedAt": "2026-03-18T00:00:05.000Z"
}
```

**Errors**:

| Status | Condition                           |
| ------ | ----------------------------------- |
| 404    | Import session not found            |
| 403    | Import session belongs to different user |

---

### PUT /api/v1/k1-import/:id/verify

Submit user-verified/edited extraction data. Transitions status from EXTRACTED to VERIFIED.

**Permission**: `updateKDocument`

**Request**: `application/json`

```json
{
  "taxYear": 2025,
  "fields": [
    {
      "boxNumber": "1",
      "label": "Ordinary business income (loss)",
      "customLabel": null,
      "rawValue": "$52,340",
      "numericValue": 52340,
      "confidence": 0.95,
      "confidenceLevel": "HIGH",
      "isUserEdited": false
    },
    {
      "boxNumber": "11",
      "label": "Other income (loss)",
      "customLabel": "Section 1256 contracts",
      "rawValue": "$8,200",
      "numericValue": 8200,
      "confidence": 0.72,
      "confidenceLevel": "MEDIUM",
      "isUserEdited": true
    }
  ]
}
```

**Response**: `200 OK` — Updated import session with status `VERIFIED`

**Errors**:

| Status | Condition                                       |
| ------ | ----------------------------------------------- |
| 400    | Import session is not in EXTRACTED status        |
| 400    | Fields array is empty                            |
| 404    | Import session not found                         |

---

### POST /api/v1/k1-import/:id/confirm

Confirm verified data and trigger automatic model object creation (KDocument, Distributions, Document linkage).

**Permission**: `createKDocument`

**Request**: `application/json`

```json
{
  "filingStatus": "DRAFT",
  "existingKDocumentAction": null
}
```

| Field                     | Type                          | Required | Description                              |
| ------------------------- | ----------------------------- | -------- | ---------------------------------------- |
| `filingStatus`            | `"DRAFT" \| "ESTIMATED" \| "FINAL"` | Yes      | Status for the created/updated KDocument |
| `existingKDocumentAction` | `"UPDATE" \| "CREATE_NEW" \| null`   | No       | Action if KDocument already exists       |

**Response**: `201 Created`

```json
{
  "importSession": {
    "id": "uuid",
    "status": "CONFIRMED"
  },
  "kDocument": {
    "id": "uuid",
    "partnershipId": "uuid",
    "type": "K1",
    "taxYear": 2025,
    "filingStatus": "DRAFT",
    "data": { "ordinaryIncome": 52340, "..." : "..." }
  },
  "distributions": [
    {
      "id": "uuid",
      "entityId": "uuid",
      "partnershipId": "uuid",
      "type": "RETURN_OF_CAPITAL",
      "amount": 60000,
      "date": "2025-12-31T00:00:00.000Z"
    }
  ],
  "allocations": [
    {
      "entityId": "uuid",
      "entityName": "Smith Family Trust",
      "ownershipPercent": 60,
      "allocatedValues": { "ordinaryIncome": 31404, "..." : "..." }
    }
  ],
  "document": {
    "id": "uuid",
    "type": "K1",
    "name": "K1-Smith-Capital-2025.pdf"
  }
}
```

**Errors**:

| Status | Condition                                                     |
| ------ | ------------------------------------------------------------- |
| 400    | Import session is not in VERIFIED status                       |
| 400    | Partnership has no active members                              |
| 409    | KDocument already exists for this partnership/year and no action specified |

---

### POST /api/v1/k1-import/:id/cancel

Cancel an import session. No model objects are created.

**Permission**: `updateKDocument`

**Response**: `200 OK` — Updated import session with status `CANCELLED`

**Errors**:

| Status | Condition                                     |
| ------ | --------------------------------------------- |
| 400    | Import session is already CONFIRMED or CANCELLED |
| 404    | Import session not found                       |

---

### GET /api/v1/k1-import/history

List import sessions for a partnership, ordered by creation date descending.

**Permission**: `readKDocument`

**Query Parameters**:

| Param           | Type     | Required | Description                    |
| --------------- | -------- | -------- | ------------------------------ |
| `partnershipId` | `string` | Yes      | Partnership UUID               |
| `taxYear`       | `number` | No       | Filter by tax year             |

**Response**: `200 OK` — Array of import session summaries

```json
[
  {
    "id": "uuid",
    "partnershipId": "uuid",
    "status": "CONFIRMED",
    "taxYear": 2025,
    "fileName": "K1-Smith-Capital-2025.pdf",
    "extractionMethod": "pdf-parse",
    "kDocumentId": "uuid",
    "createdAt": "2026-03-18T00:00:00.000Z"
  }
]
```

---

### POST /api/v1/k1-import/:id/reprocess

Re-run extraction on a previously uploaded PDF using the current cell mapping configuration.

**Permission**: `updateKDocument`

**Response**: `200 OK` — New import session with status `PROCESSING` (original session unchanged)

**Errors**:

| Status | Condition                                   |
| ------ | ------------------------------------------- |
| 400    | Original import session has no stored document |
| 404    | Import session not found                     |

---

## Cell Mapping Endpoints

### GET /api/v1/cell-mapping

Get cell mappings for a partnership (with global defaults for unmapped boxes).

**Permission**: `readKDocument`

**Query Parameters**:

| Param           | Type     | Required | Description                              |
| --------------- | -------- | -------- | ---------------------------------------- |
| `partnershipId` | `string` | No       | Partnership UUID (omit for global defaults) |

**Response**: `200 OK`

```json
[
  {
    "id": "uuid",
    "partnershipId": null,
    "boxNumber": "1",
    "label": "Ordinary business income (loss)",
    "description": "IRS Schedule K-1 Box 1",
    "isCustom": false,
    "sortOrder": 1
  }
]
```

---

### PUT /api/v1/cell-mapping

Update or create cell mappings for a partnership.

**Permission**: `updateKDocument`

**Request**: `application/json`

```json
{
  "partnershipId": "uuid",
  "mappings": [
    {
      "boxNumber": "11",
      "label": "Section 1256 contracts",
      "description": "Custom label for Box 11",
      "isCustom": false
    },
    {
      "boxNumber": "20-Z",
      "label": "Qualified Business Income (Section 199A)",
      "description": "Custom additional box",
      "isCustom": true
    }
  ]
}
```

**Response**: `200 OK` — Updated mappings array

---

### DELETE /api/v1/cell-mapping/reset

Reset a partnership's cell mappings to IRS defaults (deletes all custom mappings for the partnership).

**Permission**: `updateKDocument`

**Query Parameters**:

| Param           | Type     | Required | Description        |
| --------------- | -------- | -------- | ------------------ |
| `partnershipId` | `string` | Yes      | Partnership UUID   |

**Response**: `200 OK`
