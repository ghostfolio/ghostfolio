# Data Model: Single Family Office Platform

**Phase 1 Output** | **Date**: 2026-03-15

## Overview

This document defines 9 new Prisma models and 8 new enums that extend the existing Ghostfolio schema. The design adds an entity/ownership layer above the existing `User → Account → Order` hierarchy, plus partnership, distribution, K-document, and document management.

### Entity Relationship Diagram (Conceptual)

```
User (existing)
 ├── Entity[] ─────────────┬── Ownership[] ──── Account (existing, composite PK)
 │   (trust, LLC, etc.)    ├── PartnershipMembership[] ──── Partnership
 │                         ├── Distribution[] (received)     ├── PartnershipMembership[]
 │                         └── Document[]                    ├── PartnershipAsset[] ── AssetValuation[]
 │                                                           ├── PartnershipValuation[]
 │                                                           ├── Distribution[] (paid)
 │                                                           ├── KDocument[]
 │                                                           └── Document[]
 └── Account[] (existing, unchanged)
      └── Order[] (existing, unchanged)
```

## New Enums

### EntityType

Represents the legal structure of a family office entity.

| Value         | Description                                  |
| ------------- | -------------------------------------------- |
| `INDIVIDUAL`  | Natural person                               |
| `TRUST`       | Revocable or irrevocable trust               |
| `LLC`         | Limited liability company                    |
| `LP`          | Limited partnership (entity acting as an LP) |
| `CORPORATION` | C-Corp or S-Corp                             |
| `FOUNDATION`  | Private foundation                           |
| `ESTATE`      | Estate of a deceased individual              |

### PartnershipType

Represents the legal structure of an investment partnership.

| Value           | Description                                          |
| --------------- | ---------------------------------------------------- |
| `LP`            | Limited partnership                                  |
| `GP`            | General partnership                                  |
| `LLC`           | Limited liability company (operating as partnership) |
| `JOINT_VENTURE` | Joint venture                                        |
| `FUND`          | Investment fund (hedge fund, PE fund, etc.)          |

### DistributionType

Categorizes cash flows from partnerships to entities.

| Value                | Description                   |
| -------------------- | ----------------------------- |
| `INCOME`             | Ordinary income distribution  |
| `RETURN_OF_CAPITAL`  | Return of contributed capital |
| `CAPITAL_GAIN`       | Capital gain distribution     |
| `GUARANTEED_PAYMENT` | Guaranteed payment to partner |
| `DIVIDEND`           | Dividend distribution         |
| `INTEREST`           | Interest income distribution  |

### KDocumentType

Type of tax document.

| Value | Description                  |
| ----- | ---------------------------- |
| `K1`  | Schedule K-1 (Form 1065)     |
| `K3`  | Schedule K-3 (international) |

### KDocumentStatus

Filing lifecycle of a K-document.

| Value       | Description                               |
| ----------- | ----------------------------------------- |
| `DRAFT`     | Initial entry, not yet received from fund |
| `ESTIMATED` | Estimated figures, pre-final K-1          |
| `FINAL`     | Final K-1 received and verified           |

### FamilyOfficeAssetType

Asset classes for partnership-held assets.

| Value             | Description                 |
| ----------------- | --------------------------- |
| `PUBLIC_EQUITY`   | Publicly traded stocks/ETFs |
| `PRIVATE_EQUITY`  | Private company investments |
| `REAL_ESTATE`     | Real property               |
| `HEDGE_FUND`      | Hedge fund allocation       |
| `VENTURE_CAPITAL` | VC fund allocation          |
| `FIXED_INCOME`    | Bonds, notes, fixed income  |
| `COMMODITY`       | Physical commodities        |
| `ART_COLLECTIBLE` | Art, wine, collectibles     |
| `CRYPTOCURRENCY`  | Digital assets              |
| `CASH`            | Cash and equivalents        |
| `OTHER`           | Uncategorized               |

### ValuationSource

How a valuation was determined.

| Value           | Description                      |
| --------------- | -------------------------------- |
| `APPRAISAL`     | Third-party appraisal            |
| `MARKET`        | Market-based pricing             |
| `MANUAL`        | Manual entry by administrator    |
| `NAV_STATEMENT` | Fund administrator NAV statement |
| `FUND_ADMIN`    | Fund administrator report        |

### DocumentType

Categories for uploaded documents.

| Value                    | Description                        |
| ------------------------ | ---------------------------------- |
| `K1`                     | K-1 tax document PDF               |
| `K3`                     | K-3 tax document PDF               |
| `CAPITAL_CALL`           | Capital call notice                |
| `DISTRIBUTION_NOTICE`    | Distribution notice                |
| `NAV_STATEMENT`          | NAV statement                      |
| `APPRAISAL`              | Appraisal report                   |
| `TAX_RETURN`             | Tax return                         |
| `SUBSCRIPTION_AGREEMENT` | Subscription/partnership agreement |
| `OTHER`                  | Other document                     |

## New Models

### Entity

A legal person or structure that can own assets and be a member of partnerships.

| Field       | Type         | Constraints              | Description                          |
| ----------- | ------------ | ------------------------ | ------------------------------------ |
| `id`        | `String`     | PK, UUID, auto-generated | Unique identifier                    |
| `name`      | `String`     | Required, indexed        | Entity display name                  |
| `type`      | `EntityType` | Required, indexed        | Legal structure type                 |
| `taxId`     | `String?`    | Optional                 | Tax identification number (EIN, SSN) |
| `createdAt` | `DateTime`   | Default: now()           | Creation timestamp                   |
| `updatedAt` | `DateTime`   | Auto-updated             | Last modification timestamp          |
| `userId`    | `String`     | FK → User.id, indexed    | Administering user                   |

**Relations**:

- `user` → `User` (many-to-one, cascade delete)
- `ownerships` ← `Ownership[]` (one-to-many)
- `memberships` ← `PartnershipMembership[]` (one-to-many)
- `distributionsReceived` ← `Distribution[]` (one-to-many)
- `documents` ← `Document[]` (one-to-many)

### Partnership

An investment vehicle or legal structure that holds assets and has members.

| Field           | Type              | Constraints              | Description                            |
| --------------- | ----------------- | ------------------------ | -------------------------------------- |
| `id`            | `String`          | PK, UUID, auto-generated | Unique identifier                      |
| `name`          | `String`          | Required, indexed        | Partnership display name               |
| `type`          | `PartnershipType` | Required, indexed        | Legal structure type                   |
| `inceptionDate` | `DateTime`        | Required                 | Date partnership was formed            |
| `fiscalYearEnd` | `Int`             | Default: 12              | Month number (1-12) of fiscal year end |
| `currency`      | `String`          | Required                 | Base currency for NAV reporting        |
| `createdAt`     | `DateTime`        | Default: now()           | Creation timestamp                     |
| `updatedAt`     | `DateTime`        | Auto-updated             | Last modification timestamp            |
| `userId`        | `String`          | FK → User.id, indexed    | Administering user                     |

**Relations**:

- `user` → `User` (many-to-one, cascade delete)
- `members` ← `PartnershipMembership[]` (one-to-many)
- `assets` ← `PartnershipAsset[]` (one-to-many)
- `valuations` ← `PartnershipValuation[]` (one-to-many)
- `distributions` ← `Distribution[]` (one-to-many)
- `kDocuments` ← `KDocument[]` (one-to-many)
- `documents` ← `Document[]` (one-to-many)

### PartnershipMembership

The relationship between an entity and a partnership with ownership details.

| Field                | Type        | Constraints                  | Description                                           |
| -------------------- | ----------- | ---------------------------- | ----------------------------------------------------- |
| `id`                 | `String`    | PK, UUID, auto-generated     | Unique identifier                                     |
| `entityId`           | `String`    | FK → Entity.id, indexed      | Member entity                                         |
| `partnershipId`      | `String`    | FK → Partnership.id, indexed | Partnership                                           |
| `ownershipPercent`   | `Decimal`   | Required                     | Ownership percentage (0-100)                          |
| `capitalCommitment`  | `Decimal?`  | Optional                     | Total capital committed                               |
| `capitalContributed` | `Decimal?`  | Optional                     | Capital contributed to date                           |
| `classType`          | `String?`   | Optional                     | Class designation (e.g., "Class A LP", "GP Interest") |
| `effectiveDate`      | `DateTime`  | Required                     | Date this membership/percentage took effect           |
| `endDate`            | `DateTime?` | Optional                     | Date membership ended (null = active)                 |
| `createdAt`          | `DateTime`  | Default: now()               | Creation timestamp                                    |
| `updatedAt`          | `DateTime`  | Auto-updated                 | Last modification timestamp                           |

**Relations**:

- `entity` → `Entity` (many-to-one, cascade delete)
- `partnership` → `Partnership` (many-to-one, cascade delete)

**Unique constraint**: `@@unique([entityId, partnershipId, effectiveDate])` — prevents duplicate membership records for the same entity-partnership on the same date.

### Ownership

The relationship between an entity and a directly-owned account.

| Field              | Type        | Constraints                     | Description                          |
| ------------------ | ----------- | ------------------------------- | ------------------------------------ |
| `id`               | `String`    | PK, UUID, auto-generated        | Unique identifier                    |
| `entityId`         | `String`    | FK → Entity.id, indexed         | Owning entity                        |
| `accountId`        | `String`    | FK (composite) → Account.id     | Owned account                        |
| `accountUserId`    | `String`    | FK (composite) → Account.userId | Account's user                       |
| `ownershipPercent` | `Decimal`   | Required                        | Ownership percentage (0-100)         |
| `acquisitionDate`  | `DateTime?` | Optional                        | Date ownership was acquired          |
| `costBasis`        | `Decimal?`  | Optional                        | Cost basis of ownership stake        |
| `effectiveDate`    | `DateTime`  | Required                        | Date this ownership took effect      |
| `endDate`          | `DateTime?` | Optional                        | Date ownership ended (null = active) |
| `createdAt`        | `DateTime`  | Default: now()                  | Creation timestamp                   |
| `updatedAt`        | `DateTime`  | Auto-updated                    | Last modification timestamp          |

**Relations**:

- `entity` → `Entity` (many-to-one, cascade delete)
- `account` → `Account` (many-to-one, cascade delete, composite FK on `[accountId, accountUserId]`)

**Unique constraint**: `@@unique([entityId, accountId, accountUserId, effectiveDate])` — prevents duplicate ownership records for the same entity-account on the same date.

### Distribution

A cash flow from a partnership or investment to a receiving entity.

| Field           | Type               | Constraints                            | Description                 |
| --------------- | ------------------ | -------------------------------------- | --------------------------- |
| `id`            | `String`           | PK, UUID, auto-generated               | Unique identifier           |
| `partnershipId` | `String?`          | FK → Partnership.id, optional, indexed | Source partnership          |
| `entityId`      | `String`           | FK → Entity.id, indexed                | Receiving entity            |
| `type`          | `DistributionType` | Required                               | Distribution category       |
| `amount`        | `Decimal`          | Required                               | Distribution amount         |
| `date`          | `DateTime`         | Required, indexed                      | Distribution date           |
| `currency`      | `String`           | Required                               | Currency of distribution    |
| `taxWithheld`   | `Decimal?`         | Default: 0                             | Tax withheld at source      |
| `notes`         | `String?`          | Optional                               | Free-text notes             |
| `createdAt`     | `DateTime`         | Default: now()                         | Creation timestamp          |
| `updatedAt`     | `DateTime`         | Auto-updated                           | Last modification timestamp |

**Relations**:

- `partnership` → `Partnership?` (many-to-one, optional, cascade delete)
- `entity` → `Entity` (many-to-one, cascade delete)

### KDocument

Structured K-1 or K-3 tax document data for a partnership tax year.

| Field            | Type              | Constraints                  | Description                                        |
| ---------------- | ----------------- | ---------------------------- | -------------------------------------------------- |
| `id`             | `String`          | PK, UUID, auto-generated     | Unique identifier                                  |
| `partnershipId`  | `String`          | FK → Partnership.id, indexed | Associated partnership                             |
| `type`           | `KDocumentType`   | Required                     | K-1 or K-3                                         |
| `taxYear`        | `Int`             | Required, indexed            | Tax year (e.g., 2025)                              |
| `filingStatus`   | `KDocumentStatus` | Default: DRAFT               | Current filing status                              |
| `data`           | `Json`            | Required                     | Structured K-1/K-3 box data (see K1Data interface) |
| `documentFileId` | `String?`         | FK → Document.id, optional   | Linked uploaded PDF                                |
| `createdAt`      | `DateTime`        | Default: now()               | Creation timestamp                                 |
| `updatedAt`      | `DateTime`        | Auto-updated                 | Last modification timestamp                        |

**Relations**:

- `partnership` → `Partnership` (many-to-one, cascade delete)
- `documentFile` → `Document?` (many-to-one, optional)

**Unique constraint**: `@@unique([partnershipId, type, taxYear])` — one K-1 and one K-3 per partnership per tax year.

### PartnershipAsset

An underlying asset held within a partnership.

| Field             | Type                    | Constraints                  | Description                                       |
| ----------------- | ----------------------- | ---------------------------- | ------------------------------------------------- |
| `id`              | `String`                | PK, UUID, auto-generated     | Unique identifier                                 |
| `partnershipId`   | `String`                | FK → Partnership.id, indexed | Owning partnership                                |
| `assetType`       | `FamilyOfficeAssetType` | Required, indexed            | Asset class                                       |
| `name`            | `String`                | Required                     | Asset display name                                |
| `description`     | `String?`               | Optional                     | Detailed description                              |
| `acquisitionDate` | `DateTime?`             | Optional                     | Date acquired                                     |
| `acquisitionCost` | `Decimal?`              | Optional                     | Cost at acquisition                               |
| `currentValue`    | `Decimal?`              | Optional                     | Latest known value                                |
| `currency`        | `String`                | Required                     | Asset currency                                    |
| `metadata`        | `Json?`                 | Optional                     | Flexible metadata (address for real estate, etc.) |
| `createdAt`       | `DateTime`              | Default: now()               | Creation timestamp                                |
| `updatedAt`       | `DateTime`              | Auto-updated                 | Last modification timestamp                       |

**Relations**:

- `partnership` → `Partnership` (many-to-one, cascade delete)
- `valuations` ← `AssetValuation[]` (one-to-many)

### AssetValuation

A point-in-time value assessment of a partnership asset.

| Field                | Type              | Constraints                       | Description                 |
| -------------------- | ----------------- | --------------------------------- | --------------------------- |
| `id`                 | `String`          | PK, UUID, auto-generated          | Unique identifier           |
| `partnershipAssetId` | `String`          | FK → PartnershipAsset.id, indexed | Valued asset                |
| `date`               | `DateTime`        | Required, indexed                 | Valuation date              |
| `value`              | `Decimal`         | Required                          | Assessed value              |
| `source`             | `ValuationSource` | Required                          | How value was determined    |
| `notes`              | `String?`         | Optional                          | Valuation notes             |
| `createdAt`          | `DateTime`        | Default: now()                    | Creation timestamp          |
| `updatedAt`          | `DateTime`        | Auto-updated                      | Last modification timestamp |

**Relations**:

- `partnershipAsset` → `PartnershipAsset` (many-to-one, cascade delete)

**Unique constraint**: `@@unique([partnershipAssetId, date])` — one valuation per asset per date.

### PartnershipValuation

A point-in-time NAV for an entire partnership.

| Field           | Type              | Constraints                  | Description                 |
| --------------- | ----------------- | ---------------------------- | --------------------------- |
| `id`            | `String`          | PK, UUID, auto-generated     | Unique identifier           |
| `partnershipId` | `String`          | FK → Partnership.id, indexed | Valued partnership          |
| `date`          | `DateTime`        | Required, indexed            | Valuation date              |
| `nav`           | `Decimal`         | Required                     | Net Asset Value             |
| `source`        | `ValuationSource` | Required                     | How NAV was determined      |
| `notes`         | `String?`         | Optional                     | Valuation notes             |
| `createdAt`     | `DateTime`        | Default: now()               | Creation timestamp          |
| `updatedAt`     | `DateTime`        | Auto-updated                 | Last modification timestamp |

**Relations**:

- `partnership` → `Partnership` (many-to-one, cascade delete)

**Unique constraint**: `@@unique([partnershipId, date])` — one NAV per partnership per date.

### Document

A file (PDF, etc.) associated with an entity, partnership, or K-document.

| Field           | Type           | Constraints                            | Description                       |
| --------------- | -------------- | -------------------------------------- | --------------------------------- |
| `id`            | `String`       | PK, UUID, auto-generated               | Unique identifier                 |
| `entityId`      | `String?`      | FK → Entity.id, optional, indexed      | Associated entity                 |
| `partnershipId` | `String?`      | FK → Partnership.id, optional, indexed | Associated partnership            |
| `type`          | `DocumentType` | Required                               | Document category                 |
| `name`          | `String`       | Required                               | Display name / filename           |
| `filePath`      | `String`       | Required                               | Filesystem path to file           |
| `fileSize`      | `Int?`         | Optional                               | File size in bytes                |
| `mimeType`      | `String?`      | Optional                               | MIME type (e.g., application/pdf) |
| `taxYear`       | `Int?`         | Optional                               | Associated tax year               |
| `createdAt`     | `DateTime`     | Default: now()                         | Creation timestamp                |
| `updatedAt`     | `DateTime`     | Auto-updated                           | Last modification timestamp       |

**Relations**:

- `entity` → `Entity?` (many-to-one, optional, cascade delete)
- `partnership` → `Partnership?` (many-to-one, optional, cascade delete)
- `kDocuments` ← `KDocument[]` (one-to-many, back-reference)

## Modifications to Existing Models

### Account (existing)

Add one optional back-reference — no column changes, no migration impact on existing data:

| New Field    | Type          | Description                         |
| ------------ | ------------- | ----------------------------------- |
| `ownerships` | `Ownership[]` | Back-reference to ownership records |

### User (existing)

Add two optional back-references — no column changes, no migration impact:

| New Field      | Type            | Description                            |
| -------------- | --------------- | -------------------------------------- |
| `entities`     | `Entity[]`      | Entities administered by this user     |
| `partnerships` | `Partnership[]` | Partnerships administered by this user |

## Application-Layer Types

### K1Data (TypeScript interface, stored as JSON)

```typescript
interface K1Data {
  ordinaryIncome: number; // Box 1
  netRentalIncome: number; // Box 2
  otherRentalIncome: number; // Box 3
  guaranteedPayments: number; // Box 4
  interestIncome: number; // Box 5
  dividends: number; // Box 6a
  qualifiedDividends: number; // Box 6b
  royalties: number; // Box 7
  capitalGainLossShortTerm: number; // Box 8
  capitalGainLossLongTerm: number; // Box 9a
  unrecaptured1250Gain: number; // Box 9b
  section1231GainLoss: number; // Box 9c
  otherIncome: number; // Box 11
  section179Deduction: number; // Box 12
  otherDeductions: number; // Box 13
  selfEmploymentEarnings: number; // Box 14
  foreignTaxesPaid: number; // Box 16
  alternativeMinimumTaxItems: number; // Box 17
  distributionsCash: number; // Box 19a
  distributionsProperty: number; // Box 19b
}
```

## Validation Rules

1. **Ownership percentage**: `0 < ownershipPercent <= 100`. Sum of active ownership percentages for a single account must not exceed 100.
2. **Partnership membership percentage**: `0 < ownershipPercent <= 100`. Sum of active membership percentages for a single partnership must not exceed 100.
3. **Distribution date**: Must be >= partnership inception date.
4. **K-document tax year**: Must be >= year of partnership inception date.
5. **Partnership fiscal year end**: Must be 1-12.
6. **Entity deletion**: Blocked if entity has any active ownerships or memberships (endDate is null).
7. **Partnership deletion**: Cascades to all memberships, assets, valuations, distributions, K-documents, and documents.
