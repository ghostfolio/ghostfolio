# Data Model: Portfolio Performance Views

**Feature**: 003-portfolio-performance-views
**Date**: 2026-03-16

## Entity Relationship Overview

```
User ─1:N─► Entity ─1:N─► PartnershipMembership ◄─N:1─ Partnership
                │                                          │
                │                                          ├─1:N─► PartnershipAsset (has assetType)
                │                                          ├─1:N─► PartnershipValuation (has nav, date)
                │                                          └─1:N─► KDocument (has K1Data JSON, taxYear)
                │
                └─1:N─► Distribution (has amount, date, type)
```

## Entities

### Entity (existing — no changes)

| Field | Type | Description |
|---|---|---|
| id | String (UUID) | Primary key |
| name | String | Display name (e.g., "Entity #1") |
| type | EntityType enum | INDIVIDUAL, TRUST, LLC, LP, CORPORATION, FOUNDATION, ESTATE |
| taxId | String? | Tax identification number |
| userId | String | Owner user FK |

**Role in feature**: Primary grouping dimension for Portfolio Summary view. Each row = one entity.

### Partnership (existing — no changes)

| Field | Type | Description |
|---|---|---|
| id | String (UUID) | Primary key |
| name | String | Display name (e.g., "Partnership #1") |
| type | PartnershipType enum | LP, GP, LLC, JOINT_VENTURE, FUND |
| inceptionDate | DateTime | Used as date for initial contribution cash flow |
| fiscalYearEnd | String? | Month (e.g., "12" for December) |
| currency | String | Default "USD" |
| userId | String | Owner user FK |

**Role in feature**: Contributes to all three views. Asset class determined by its PartnershipAsset records.

### PartnershipMembership (existing — no changes)

| Field | Type | Description |
|---|---|---|
| id | String (UUID) | Primary key |
| entityId | String | FK → Entity |
| partnershipId | String | FK → Partnership |
| ownershipPercent | Decimal | Ownership percentage (0–100) |
| capitalCommitment | Decimal | Original committed amount |
| capitalContributed | Decimal | Cumulative contributed to date |
| classType | String? | Interest class (e.g., "Class A") |
| effectiveDate | DateTime | Membership start |
| endDate | DateTime? | Null = active |

**Role in feature**: Links entities to partnerships. Provides Original Commitment and capitalized amounts for Portfolio Summary. Unique constraint: `[entityId, partnershipId, effectiveDate]`.

### Distribution (existing — no changes)

| Field | Type | Description |
|---|---|---|
| id | String (UUID) | Primary key |
| partnershipId | String? | FK → Partnership |
| entityId | String | FK → Entity |
| type | DistributionType enum | INCOME, RETURN_OF_CAPITAL, CAPITAL_GAIN, GUARANTEED_PAYMENT, DIVIDEND, INTEREST |
| amount | Decimal | Distribution amount |
| date | DateTime | Distribution date |
| currency | String | Default "USD" |
| taxWithheld | Decimal? | Withheld tax amount |
| notes | String? | Free-text notes |

**Role in feature**: Feeds Distributions column in summaries, cash flow series for XIRR, and per-year distribution totals in Activity view.

### PartnershipAsset (existing — no changes)

| Field | Type | Description |
|---|---|---|
| id | String (UUID) | Primary key |
| partnershipId | String | FK → Partnership |
| assetType | FamilyOfficeAssetType enum | PUBLIC_EQUITY, PRIVATE_EQUITY, REAL_ESTATE, HEDGE_FUND, VENTURE_CAPITAL, FIXED_INCOME, COMMODITY, ART_COLLECTIBLE, CRYPTOCURRENCY, CASH, OTHER |
| name | String | Asset name |
| currentValue | Decimal | Latest value |

**Role in feature**: Determines which asset class a partnership belongs to (majority assetType). Feeds Asset Class Summary grouping.

### PartnershipValuation (existing — no changes)

| Field | Type | Description |
|---|---|---|
| id | String (UUID) | Primary key |
| partnershipId | String | FK → Partnership |
| date | DateTime | Valuation date |
| nav | Decimal | Net asset value |
| source | ValuationSource enum | APPRAISAL, MARKET, MANUAL, NAV_STATEMENT, FUND_ADMIN |

**Role in feature**: Provides "Residual Used" (latest NAV × ownership%) for RVPI and TVPI. Terminal value for XIRR cash flows.

### KDocument (existing — data JSON schema extended)

| Field | Type | Description |
|---|---|---|
| id | String (UUID) | Primary key |
| partnershipId | String | FK → Partnership |
| type | KDocumentType enum | K1, K3 |
| taxYear | Int | Tax year (e.g., 2024) |
| filingStatus | KDocumentStatus enum | DRAFT, ESTIMATED, FINAL |
| data | Json | K1Data or K3Data structured JSON |
| documentFileId | String? | FK → Document |

**Unique constraint**: `[partnershipId, type, taxYear]`

**Role in feature**: Primary data source for Activity view income components and tax basis fields.

## K1Data JSON Schema (extended)

### Existing fields (no changes)

| Field | K-1 Box | Type | Activity Column Mapping |
|---|---|---|---|
| ordinaryIncome | Box 1 | number | Part of "Remaining K-1 Income/Ded." |
| netRentalIncome | Box 2 | number | Part of "Remaining K-1 Income/Ded." |
| otherRentalIncome | Box 3 | number | Part of "Remaining K-1 Income/Ded." |
| guaranteedPayments | Box 4 | number | Part of "Remaining K-1 Income/Ded." |
| interestIncome | Box 5 | number | "Interest" column |
| dividends | Box 6a | number | "Dividends" column |
| qualifiedDividends | Box 6b | number | (sub-detail of dividends) |
| royalties | Box 7 | number | Part of "Remaining K-1 Income/Ded." |
| capitalGainLossShortTerm | Box 8 | number | Part of "Cap Gains" |
| capitalGainLossLongTerm | Box 9a | number | Part of "Cap Gains" |
| unrecaptured1250Gain | Box 9b | number | Part of "Cap Gains" |
| section1231GainLoss | Box 9c | number | Part of "Cap Gains" |
| otherIncome | Box 11 | number | Part of "Remaining K-1 Income/Ded." |
| section179Deduction | Box 12 | number | Part of "Remaining K-1 Income/Ded." (negative) |
| otherDeductions | Box 13 | number | Part of "Remaining K-1 Income/Ded." (negative) |
| selfEmploymentEarnings | Box 14 | number | Part of "Remaining K-1 Income/Ded." |
| foreignTaxesPaid | Box 16 | number | Part of "Remaining K-1 Income/Ded." (negative) |
| alternativeMinimumTaxItems | Box 17 | number | (informational) |
| distributionsCash | Box 19a | number | Part of "Distributions" |
| distributionsProperty | Box 19b | number | Part of "Distributions" |

### New fields (added for tax basis tracking)

| Field | Source | Type | Description |
|---|---|---|---|
| beginningTaxBasis | Prior year ending or manual | number? | Beginning of year tax basis |
| endingTaxBasis | Computed or manual | number? | End of year tax basis |
| endingGLBalance | General ledger | number? | Ending GL balance per books |
| k1CapitalAccount | K-1 Schedule L | number? | Ending K-1 capital account |
| otherAdjustments | K-1 Box 18c etc. | number? | Other basis adjustments |
| activityNotes | Manual entry | string? | Per-year notes (e.g., "AJE Completed") |

All new fields are optional (`?`) to maintain backward compatibility with existing K-1 documents.

## Derived/Computed Fields

These are computed at query time and not stored:

### Summary View Computations (per entity or per asset class)

| Metric | Formula | Notes |
|---|---|---|
| Original Commitment | Σ membership.capitalCommitment | Across active memberships in scope |
| Paid-In (ABS) | Σ membership.capitalContributed | Absolute value of contributions |
| % Called | Paid-In ÷ Original Commitment × 100 | Percentage; "N/A" if commitment = 0 |
| Unfunded Commitment | Original Commitment − Paid-In | Can be 0 |
| Distributions | Σ distribution.amount | All distributions in scope |
| Residual Used | Σ (latestValuation.nav × membership.ownershipPercent / 100) | Per-partnership NAV allocated by ownership |
| DPI | Distributions ÷ Paid-In | Decimal multiple; 0 if Paid-In = 0 |
| RVPI | Residual Used ÷ Paid-In | Decimal multiple; 0 if Paid-In = 0 |
| TVPI | (Distributions + Residual Used) ÷ Paid-In | Decimal multiple; 0 if Paid-In = 0 |
| IRR (XIRR) | Newton-Raphson on merged cash flows | null → "N/A" if < 2 cash flows |

### Activity View Computations (per row)

| Field | Formula |
|---|---|
| Capital Gains | shortTerm + longTerm + unrecaptured1250Gain + section1231GainLoss |
| Remaining K-1 Income/Ded. | ordinaryIncome + netRentalIncome + otherRentalIncome + guaranteedPayments + royalties + otherIncome + selfEmploymentEarnings − section179Deduction − otherDeductions − foreignTaxesPaid |
| Total Income | Interest + Dividends + Capital Gains + Remaining K-1 Income/Ded. |
| Book-to-Tax Adj | endingGLBalance − endingTaxBasis |
| K-1 Capital vs Tax Basis Diff | k1CapitalAccount − endingTaxBasis |
| Excess Distribution | max(0, Distributions − (beginningTaxBasis + Contributions + Total Income + otherAdjustments)) |
| Negative Basis? | endingTaxBasis < 0 → "YES" |
| Δ Ending Basis vs Prior Year | endingTaxBasis − beginningTaxBasis |

## State Transitions

### KDocument Filing Status

```
DRAFT → ESTIMATED → FINAL
```

Each transition may update the K1Data values (including the new tax basis fields). The Activity view always shows the latest data regardless of filing status.

## Validation Rules

| Rule | Scope | Description |
|---|---|---|
| capitalCommitment ≥ 0 | PartnershipMembership | Commitment cannot be negative |
| capitalContributed ≥ 0 | PartnershipMembership | Contributed cannot be negative |
| capitalContributed ≤ capitalCommitment | PartnershipMembership | Cannot contribute more than committed |
| ownershipPercent ∈ (0, 100] | PartnershipMembership | Must be positive percentage |
| distribution.amount > 0 | Distribution | Distributions are positive flows |
| taxYear ∈ [1900, current+1] | KDocument | Reasonable year range |
| nav ≥ 0 | PartnershipValuation | NAV cannot be negative |
| Σ ownershipPercent per partnership ≤ 100 | PartnershipMembership | Total ownership cannot exceed 100% |

## FamilyOfficeAssetType → Display Label Mapping

| Enum Value | Display Label |
|---|---|
| REAL_ESTATE | Real Estate |
| VENTURE_CAPITAL | Venture Capital |
| PRIVATE_EQUITY | Private Equity |
| HEDGE_FUND | Hedge Fund |
| FIXED_INCOME | Credit |
| COMMODITY | Natural Resources |
| OTHER | Other |
| PUBLIC_EQUITY | Public Equity |
| ART_COLLECTIBLE | Art & Collectibles |
| CRYPTOCURRENCY | Cryptocurrency |
| CASH | Cash |

Note: "Co-Investment" and "Infrastructure" from the spec map to PRIVATE_EQUITY and OTHER respectively until dedicated enum values are added.
