# API Contracts: Plaid Integration

**Base URL**: `/api/v1/plaid`  
**Auth**: JWT Bearer token (all endpoints)  
**Feature Gate**: `ENABLE_FEATURE_PLAID` must be `true`

---

## POST /api/v1/plaid/link-token

Create a Plaid Link token for the client to open the Link modal.

**Permission**: Any authenticated user

**Request**: Empty body

**Response** `200 OK`:
```typescript
interface CreateLinkTokenResponse {
  linkToken: string;
  expiration: string; // ISO 8601 datetime
}
```

**Errors**:
- `403` — Plaid feature disabled
- `500` — Plaid API error

---

## POST /api/v1/plaid/exchange-token

Exchange a Plaid public token for an access token, create PlaidItem and Account(s).

**Permission**: Any authenticated user

**Request**:
```typescript
interface ExchangeTokenRequest {
  publicToken: string;
  institutionId: string;
  institutionName: string;
  accounts: {
    id: string;       // Plaid account_id
    name: string;     // Account display name
    type: string;     // e.g., 'investment'
    subtype: string;  // e.g., 'brokerage'
    mask: string;     // Last 4 digits (e.g., '1234')
  }[];
}
```

**Response** `201 Created`:
```typescript
interface ExchangeTokenResponse {
  plaidItemId: string;
  accounts: {
    accountId: string;   // Ghostfolio account ID
    plaidAccountId: string;
    name: string;
  }[];
}
```

**Errors**:
- `400` — Invalid or expired public token
- `403` — Plaid feature disabled
- `409` — Institution already linked (duplicate itemId)

---

## POST /api/v1/plaid/sync/:plaidItemId

Trigger an on-demand sync for a specific Plaid item.

**Permission**: Any authenticated user (must own the PlaidItem)

**Request**: Empty body

**Response** `202 Accepted`:
```typescript
interface SyncResponse {
  jobId: string;
  message: string; // "Sync job enqueued"
}
```

**Errors**:
- `403` — Not owner of PlaidItem, or Plaid feature disabled
- `404` — PlaidItem not found
- `409` — Sync already in progress

---

## GET /api/v1/plaid/items

List all PlaidItems for the current user.

**Permission**: Any authenticated user

**Response** `200 OK`:
```typescript
interface PlaidItemsResponse {
  items: {
    id: string;
    institutionId: string | null;
    institutionName: string | null;
    lastSyncedAt: string | null; // ISO 8601
    error: string | null;
    consentExpiresAt: string | null;
    accountCount: number;
    createdAt: string;
  }[];
}
```

---

## POST /api/v1/plaid/link-token/update/:plaidItemId

Create a Link token in update mode for re-authentication.

**Permission**: Any authenticated user (must own the PlaidItem)

**Request**: Empty body

**Response** `200 OK`:
```typescript
interface CreateLinkTokenResponse {
  linkToken: string;
  expiration: string;
}
```

**Errors**:
- `403` — Not owner, or Plaid feature disabled
- `404` — PlaidItem not found

---

## DELETE /api/v1/plaid/items/:plaidItemId

Disconnect a Plaid item (marks as disconnected, preserves data).

**Permission**: Any authenticated user (must own the PlaidItem)

**Response** `200 OK`:
```typescript
interface DeletePlaidItemResponse {
  message: string; // "Plaid connection disconnected"
}
```

**Errors**:
- `403` — Not owner, or Plaid feature disabled
- `404` — PlaidItem not found

---

## POST /api/v1/plaid/webhook

Receive webhooks from Plaid (no JWT — verified via Plaid webhook verification).

**Authentication**: Plaid webhook verification (JWT in request body, verified against Plaid public keys)

**Request**: Plaid webhook payload
```typescript
interface PlaidWebhookPayload {
  webhook_type: 'HOLDINGS' | 'INVESTMENTS_TRANSACTIONS' | 'ITEM';
  webhook_code: string;
  item_id: string;
  error?: object;
}
```

**Response** `200 OK`: Empty (acknowledge receipt)

**Behavior**:
- `HOLDINGS:DEFAULT_UPDATE` → Enqueue sync job for the item
- `INVESTMENTS_TRANSACTIONS:DEFAULT_UPDATE` → Enqueue sync job for the item
- `ITEM:PENDING_EXPIRATION` → Update PlaidItem.error and consentExpiresAt
- `ITEM:ERROR` → Update PlaidItem.error field
