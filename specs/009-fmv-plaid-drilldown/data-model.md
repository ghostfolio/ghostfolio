# Data Model: 009-fmv-plaid-drilldown

**Date**: 2026-03-22

## New Entities

### PlaidItem

Represents a Plaid Link connection to a financial institution.

| Field | Type | Constraints | Description |
|---|---|---|---|
| `id` | `String` | PK, UUID, auto-generated | Internal identifier |
| `userId` | `String` | FK → User.id, required | Owning user |
| `itemId` | `String` | Unique, required | Plaid item_id (public reference) |
| `accessToken` | `String` | Required | AES-256-GCM encrypted Plaid access_token |
| `institutionId` | `String?` | Optional | Plaid institution_id (e.g., `ins_3`) |
| `institutionName` | `String?` | Optional | Human-readable institution name (e.g., "Vanguard") |
| `cursor` | `String?` | Optional | Plaid sync cursor for incremental updates |
| `consentExpiresAt` | `DateTime?` | Optional | When Plaid consent expires (for re-auth nudge) |
| `lastSyncedAt` | `DateTime?` | Optional | Timestamp of last successful sync |
| `error` | `String?` | Optional | Last error code from Plaid (e.g., `ITEM_LOGIN_REQUIRED`) |
| `createdAt` | `DateTime` | Auto, default now | Record creation timestamp |
| `updatedAt` | `DateTime` | Auto, @updatedAt | Last update timestamp |

**Relationships**:
- `user: User` — many-to-one (FK: userId → User.id, onDelete: Cascade)
- `accounts: Account[]` — one-to-many (via Account.plaidItemId)

**Indexes**: `userId`, `itemId` (unique)

```prisma
model PlaidItem {
  accounts        Account[]
  accessToken     String
  consentExpiresAt DateTime?
  createdAt       DateTime  @default(now())
  cursor          String?
  error           String?
  id              String    @id @default(uuid())
  institutionId   String?
  institutionName String?
  itemId          String    @unique
  lastSyncedAt    DateTime?
  updatedAt       DateTime  @updatedAt
  user            User      @relation(fields: [userId], onDelete: Cascade, references: [id])
  userId          String

  @@index([userId])
}
```

---

## Modified Entities

### Account (extended)

Two new optional fields added:

| Field | Type | Constraints | Description |
|---|---|---|---|
| `plaidItemId` | `String?` | FK → PlaidItem.id, optional | Link to Plaid connection (null for manual accounts) |
| `plaidAccountId` | `String?` | Optional | Plaid's account_id for API calls |
| `accountType` | `String?` | Optional | Plaid account type (e.g., 'investment', 'depository') |

**New relationship**:
- `plaidItem: PlaidItem?` — many-to-one (FK: plaidItemId → PlaidItem.id)

```prisma
model Account {
  // ... existing fields ...
  accountType    String?
  plaidAccountId String?
  plaidItem      PlaidItem? @relation(fields: [plaidItemId], references: [id])
  plaidItemId    String?
  // ... existing fields ...

  @@index([plaidItemId])
}
```

### User (extended)

New relationship only (no schema field change — Prisma infers from PlaidItem.userId):

```prisma
model User {
  // ... existing fields ...
  plaidItems PlaidItem[]
  // ... existing fields ...
}
```

---

## Unchanged Entities (used as-is)

### SymbolProfile
- Plaid securities map to existing SymbolProfile records
- Match by `symbol` (ticker) first; create MANUAL-type profile if no match
- Fields used: `assetClass`, `assetSubClass`, `symbol`, `name`, `currency`, `dataSource`

### Order
- Plaid investment transactions become Order records
- Fields used: `type` (BUY/SELL/DIVIDEND), `quantity`, `unitPrice`, `currency`, `date`, `accountId`
- New orders created with `isDraft: false`
- Plaid-sourced orders distinguished by `comment` field (e.g., `"plaid-sync:{transactionId}"`) to avoid re-importing

### MarketData
- Current prices from Plaid sync stored as MarketData entries
- Used by `PortfolioCalculator` for FMV computation

### AccountBalance
- Plaid account balance synced via existing `updateAccountBalance()` method
- Creates dated balance snapshots

### Platform
- Plaid institution mapped to Platform record
- Match by name or create new with `name: institutionName`, `url: null`

---

## State Transitions

### PlaidItem Lifecycle

```
[Created] → ACTIVE → PENDING_EXPIRATION → EXPIRED
                ↓                              ↓
              ERROR ← ← ← ← ← ← ← ← ← ← ←
                ↓
           ACTIVE (after re-auth)
```

States tracked via `error` field:
- `error = null` → Active, syncing normally
- `error = 'ITEM_LOGIN_REQUIRED'` → Needs re-authentication
- `error = 'PENDING_EXPIRATION'` → Consent expiring soon
- `error = 'ITEM_REMOVED'` → Item was removed at institution
- `consentExpiresAt < now()` → Expired, needs re-auth

### Order Creation from Plaid

```
Plaid investmentsTransactionsGet
  → For each transaction:
    → Check if Order exists (comment contains plaid transaction ID)
    → If not: Map type → Create Order → Emit PortfolioChangedEvent
```

Plaid transaction type → Order type mapping:
| Plaid `type` | Order `Type` |
|---|---|
| `buy` | `BUY` |
| `sell` | `SELL` |
| `cash` (dividend subtype) | `DIVIDEND` |
| `fee` | `FEE` |
| `transfer` | Ignored (internal movement) |
| `cancel` | Ignored (offsetting entry) |

---

## Validation Rules

1. **PlaidItem.accessToken**: Must be non-empty, encrypted before storage
2. **PlaidItem.itemId**: Must be unique across all users (Plaid guarantees uniqueness)
3. **Account.plaidItemId**: If set, the referenced PlaidItem must belong to the same userId
4. **Account.plaidAccountId**: If set, plaidItemId must also be set
5. **Order from Plaid**: Comment field with `plaid-sync:` prefix acts as idempotency key — prevents duplicate imports on re-sync
