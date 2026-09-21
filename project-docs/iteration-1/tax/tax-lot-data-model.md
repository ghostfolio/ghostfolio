# Tax Metrics — Tax-Lot Tracking Data Model

**Owner:** Tharun Swaminathan
**Iteration:** 1 — Design & Data Modelling
**Date:** September 21, 2026

## Objective

This document defines the tax-lot tracking data model for the Ghostfolio tax extension.

The goal is to connect the FIFO specification, the average-cost specification, the existing Ghostfolio activity model, and the later yearly-summary/export tasks into one implementation-ready design.

This is still Iteration 1 design work. No Prisma migration, backend service, API endpoint, or UI implementation is added as part of this task.

The main design question is whether calculated tax lots and cost-basis states should become permanent database records or should be derived from the existing Ghostfolio activities whenever a tax calculation is requested.

The recommended design is to keep Ghostfolio activities as the authoritative source data and derive FIFO lots, FIFO matches, and average-cost pool states from those activities.

## Use-Case Alignment

The project use-case diagram identifies the following tax-facing actions:

- record withholding tax on a dividend
- mark a transaction as tax relevant
- choose a cost-basis method
- calculate realized gains
- view realized capital gains
- view tax lots
- view yearly tax summary
- export tax records

These use cases support a source-data-plus-derived-results architecture.

`withholdingTax` and the future tax-relevant flag are source transaction information and therefore belong with, or directly alongside, the existing Ghostfolio activity record.

`Choose cost-basis method` is calculation context rather than transaction identity. A source `Order` must not be permanently tied to FIFO or average cost because the same transaction history may be evaluated under either method.

`View tax lots` does not require tax-lot rows to be permanent database records. The tax backend can derive FIFO lots from ordered source activities and return those lots to the UI.

`Calculate realized gains` is the central tax calculation used by the realized-gains view, tax-lot view, yearly summary, and tax export features. Those downstream features should consume calculation results rather than implement their own cost-basis logic.

## Repository Findings

### `Order` remains the transaction source of truth

Ghostfolio stores portfolio transactions in the Prisma `Order` model.

Important existing fields include:

```text
id
userId
accountId
symbolProfileId
date
type
quantity
unitPrice
fee
currency
createdAt
updatedAt
```

The model already has relations to `User`, optional `Account`, `SymbolProfile`, and `Tag`.

`Order.id` is a UUID and is suitable as the stable source identifier for tax calculation traceability.

### Account relationships are already part of activities

An activity can belong to an account through `accountId` and `accountUserId`. The relationship is optional.

This means tax calculations can preserve account boundaries without introducing a second account identifier.

### Asset identity already exists

Every stored `Order` contains `symbolProfileId` and is related to a `SymbolProfile`.

This should be the stored asset identity used by the tax calculation scope. A symbol string by itself should not be used as the persistent lot key.

### Existing Prisma conventions

The schema generally uses UUID string identifiers, explicit relation fields, indexes for common lookups, cascade deletion for dependent records where appropriate, and compound keys where ownership forms part of identity.

Examples include `AccountBalance`, `TagsOnAccounts`, and `AssetProfileSplit`.

### Stock splits are persistent source data

`AssetProfileSplit` is stored as source data linked to `SymbolProfile`.

Its numerator and denominator are stored exactly, and activities are adjusted at calculation time.

The tax feature should follow the same principle: keep authoritative source information persistent and derive calculation state when practical.

### Historical activities are mutable

Activities can be created, updated, and deleted. These operations emit `PortfolioChangedEvent`.

Changing one historical BUY can alter every later FIFO match or average-cost result in the same calculation scope.

This makes permanently stored calculated tax state vulnerable to becoming stale.

### Common API contracts are plain TypeScript interfaces

Ghostfolio shares contracts through `libs/common/src/lib/interfaces/`.

The existing `Activity` interface extends Prisma `Order` and adds enriched values such as:

```text
feeInAssetProfileCurrency
feeInBaseCurrency
unitPriceInAssetProfileCurrency
value
valueInBaseCurrency
```

Tax-domain interfaces should follow the same overall style, but the exact shared location should be coordinated with Raniya because Sep 21 is also her shared API/data-contract task.

## Design Decision — Persist Source Data, Derive Tax State

The initial Iteration 2 design is:

```text
Persist:
Ghostfolio source activities and tax-specific source fields

Derive:
FIFO acquisition lots
FIFO lot matches
average-cost pool state
average-cost events
realized-gain records
```

The derived structures are recalculated from source activities whenever tax analytics are requested.

This avoids creating a second source of truth.

## Why Derived State Is Preferred

FIFO and average cost are order-dependent.

Any of the following can change later results:

- BUY quantity
- BUY price
- transaction date
- transaction type
- transaction account
- transaction asset
- transaction currency
- deleting an old transaction
- adding or correcting a stock split
- changing calculation method
- changing reporting/base currency

Persisted calculated rows would require invalidation and rebuilding after those changes.

For this project, deterministic recalculation from source data is safer and smaller.

## What Remains Persisted

The Prisma `Order` remains the authoritative transaction.

Tax-specific source metadata belongs with the source transaction when appropriate. For example, the withholding-tax design adds source information about a dividend.

The Sep 23 tax-relevant design may add another source-level field used for filtering.

Calculated cost basis does not belong directly on `Order`.

## What Is Not Persisted Initially

The first Iteration 2 implementation should not add authoritative Prisma tables for:

```text
TaxLot
TaxLotMatch
AverageCostSnapshot
AverageCostEvent
RealizedGainRecord
```

These are tax calculation structures.

They can be returned by the tax service and consumed by yearly summaries and exports without becoming permanent rows.

## Optional Caching

Derived results may later be cached for performance.

A cache must remain disposable and non-authoritative.

A safe initial invalidation rule is:

```text
activity create/update/delete
→ invalidate the user's tax calculation cache
```

A more targeted scope-level cache can be added later if needed.

## Tax Calculation Method

The tax domain supports:

```text
FIFO
AVERAGE_COST
```

Conceptually:

```ts
export type TaxCalculationMethod = 'FIFO' | 'AVERAGE_COST';
```

The method belongs to the calculation request and calculation result.

It should not be stored on each `Order`, because the same transaction history can be evaluated under either method.

## Default Tax Calculation Scope

The initial project implementation should use this default scope:

```text
userId
+ accountId
+ symbolProfileId
```

This creates one independent cost-basis scope per user, account, and asset.

### Why account-aware scope is the default

Ghostfolio already stores account membership on activities.

Keeping the account boundary gives clear traceability, prevents accidental cross-account lot matching, simplifies recalculation, and still allows yearly summaries to aggregate results across accounts later.

This is an engineering default for this project, not a jurisdiction-specific tax rule.

### Activities without an account

`accountId` is optional.

Activities with no account should form a distinct unassigned scope:

```text
accountId = null → NO_ACCOUNT scope
```

They must not be silently merged into a real account.

### Future extension

A later version could support explicit scope modes such as:

```text
ACCOUNT_ASSET
PORTFOLIO_ASSET
```

The first implementation should use `ACCOUNT_ASSET` only.

## Proposed Tax Scope Contract

```ts
export interface TaxCalculationScope {
  userId: string;
  accountId: string | null;
  symbolProfileId: string;
}
```

A deterministic internal key can be generated from these values.

## Shared Normalized Tax Activity

FIFO and average cost should consume the same normalized activity contract.

Conceptually:

```ts
export interface TaxActivity {
  sourceActivityId: string;

  userId: string;
  accountId: string | null;
  symbolProfileId: string;

  date: Date;
  type: 'BUY' | 'SELL';

  sourceCurrency: string;
  assetCurrency: string;
  baseCurrency: string;

  sourceQuantity: Big;
  normalizedQuantity: Big;

  sourceUnitPrice: Big;
  unitPriceAssetCurrency: Big;

  feeAssetCurrency: Big;
  feeBaseCurrency: Big | null;

  grossValueAssetCurrency: Big;
  grossValueBaseCurrency: Big | null;

  baseCurrencyStatus: 'AVAILABLE' | 'UNAVAILABLE';
}
```

This is a design shape, not final shared code.

The public serialization of high-precision values must follow the team's shared API convention.

## Source vs Normalized Values

The model keeps both source and normalized values.

Source values explain what was originally entered or imported.

Normalized values reflect current split adjustment and currency preparation used for calculation.

This makes exports auditable without overwriting source transactions.

## Stock-Split Persistence Rule

Split-adjusted quantity and unit cost should not be written back to `Order`.

They should also not be stored as authoritative fields in permanent tax-lot rows.

Each calculation should reapply Ghostfolio's current `AssetProfileSplit` normalization.

This prevents stale lot data if split history is corrected later.

## FIFO Acquisition Lot Model

Each normalized BUY creates one derived FIFO acquisition lot.

```ts
export interface TaxLot {
  lotId: string;
  sourceActivityId: string;

  scope: TaxCalculationScope;

  acquiredAt: Date;

  sourceQuantity: Big;
  initialQuantity: Big;
  remainingQuantity: Big;

  sourceCurrency: string;
  assetCurrency: string;
  baseCurrency: string;

  sourceUnitPrice: Big;
  unitCostAssetCurrency: Big;

  grossAcquisitionValueAssetCurrency: Big;
  acquisitionFeeAssetCurrency: Big;

  grossAcquisitionValueBaseCurrency: Big | null;
  acquisitionFeeBaseCurrency: Big | null;

  status: TaxLotStatus;
}
```

## FIFO Lot Identifier

One BUY creates one FIFO lot.

The simplest deterministic identity is:

```text
lotId = sourceActivityId
```

A second random UUID is unnecessary for the initial derived model.

## FIFO Lot Status

```ts
export type TaxLotStatus =
  | 'OPEN'
  | 'PARTIALLY_CONSUMED'
  | 'CLOSED';
```

Derived rules:

```text
OPEN
remainingQuantity = initialQuantity

PARTIALLY_CONSUMED
0 < remainingQuantity < initialQuantity

CLOSED
remainingQuantity = 0
```

Status is calculated, not persisted.

## Original vs Remaining Quantity

The lot retains:

```text
sourceQuantity
initialQuantity
remainingQuantity
```

`sourceQuantity` is the original transaction quantity.

`initialQuantity` is the split-normalized lot quantity used for the current calculation.

`remainingQuantity` changes as FIFO sales consume the lot.

Example audit output:

```text
Original transaction quantity: 10
Split-normalized lot quantity: 20
Remaining FIFO quantity: 15
```

## FIFO Cost Fields

Acquisition value and transaction fee stay separate.

Asset-profile currency:

```text
grossAcquisitionValueAssetCurrency
acquisitionFeeAssetCurrency
```

Base currency when available:

```text
grossAcquisitionValueBaseCurrency
acquisitionFeeBaseCurrency
```

This preserves both gross and fee-adjusted analytics.

## FIFO Match Model

A SELL may consume multiple lots. Each consumed slice produces one derived match.

```ts
export interface TaxLotMatch {
  matchId: string;

  lotId: string;
  buyActivityId: string;
  sellActivityId: string;

  acquiredAt: Date;
  realizedAt: Date;

  matchedQuantity: Big;

  grossAcquisitionValueAssetCurrency: Big;
  grossProceedsAssetCurrency: Big;

  buyFeeAllocatedAssetCurrency: Big;
  sellFeeAllocatedAssetCurrency: Big;

  grossRealizedGainAssetCurrency: Big;
  realizedGainAfterActivityFeesAssetCurrency: Big;

  grossAcquisitionValueBaseCurrency: Big | null;
  grossProceedsBaseCurrency: Big | null;

  buyFeeAllocatedBaseCurrency: Big | null;
  sellFeeAllocatedBaseCurrency: Big | null;

  grossRealizedGainBaseCurrency: Big | null;
  realizedGainAfterActivityFeesBaseCurrency: Big | null;
}
```

## FIFO Match Identifier

FIFO matches do not need database UUIDs.

A deterministic match ID can use:

```text
sellActivityId|buyActivityId|matchSequence
```

The exact string format is internal.

The same input history must generate the same match order.

## FIFO Matches Are Recalculated

FIFO matches should not be persisted.

If transaction ordering changes, the match graph can change completely.

Replaying the scope guarantees the correct current answer without maintaining stale match rows.

## Average-Cost Pool Model

Average cost does not preserve individual acquisition lots after the BUY enters the pool.

It maintains one derived state per scope.

```ts
export interface AverageCostPool {
  scope: TaxCalculationScope;

  quantity: Big;

  grossCostAssetCurrency: Big;
  acquisitionFeePoolAssetCurrency: Big;

  grossCostBaseCurrency: Big | null;
  acquisitionFeePoolBaseCurrency: Big | null;

  averageGrossUnitCostAssetCurrency: Big;
  averageFeeAdjustedUnitCostAssetCurrency: Big;

  averageGrossUnitCostBaseCurrency: Big | null;
  averageFeeAdjustedUnitCostBaseCurrency: Big | null;
}
```

## Average-Cost Pool Is Recalculated

The average-cost pool should be rebuilt from ordered activities.

Persisting a snapshot after every transaction would create the same stale-state problem as persistent FIFO matches.

## Average-Cost Event Model

Each BUY or SELL creates a traceable calculation event.

```ts
export interface AverageCostEvent {
  sourceActivityId: string;
  date: Date;
  type: 'BUY' | 'SELL';

  scope: TaxCalculationScope;

  quantityBefore: Big;
  grossCostBefore: Big;
  acquisitionFeePoolBefore: Big;
  averageGrossUnitCostBefore: Big;

  activityQuantity: Big;
  activityGrossValue: Big;
  activityFee: Big;

  quantityAfter: Big;
  grossCostAfter: Big;
  acquisitionFeePoolAfter: Big;
  averageGrossUnitCostAfter: Big;

  realized?: TaxRealizedGainRecord;

  warnings: TaxCalculationWarning[];
  errors: TaxCalculationError[];
}
```

Average-cost events are calculation output, not database rows.

## Common Realized-Gain Record

FIFO and average cost should both produce one common sale-level result shape.

This is important for Sep 22 yearly summaries and Sep 24 exports.

```ts
export interface TaxRealizedGainRecord {
  method: TaxCalculationMethod;

  scope: TaxCalculationScope;

  sellActivityId: string;
  realizedAt: Date;

  quantity: Big;
  matchedQuantity: Big;
  unmatchedQuantity: Big;

  assetCurrency: string;
  baseCurrency: string;

  grossProceedsAssetCurrency: Big;
  grossCostBasisAssetCurrency: Big;
  grossRealizedGainAssetCurrency: Big;

  activityFeesAssetCurrency: Big;
  realizedGainAfterActivityFeesAssetCurrency: Big;

  grossProceedsBaseCurrency: Big | null;
  grossCostBasisBaseCurrency: Big | null;
  grossRealizedGainBaseCurrency: Big | null;

  activityFeesBaseCurrency: Big | null;
  realizedGainAfterActivityFeesBaseCurrency: Big | null;

  traceIds: string[];

  warnings: TaxCalculationWarning[];
  errors: TaxCalculationError[];
}
```

FIFO fills `traceIds` with FIFO match identifiers.

Average cost can use its event/source identifier.

## Tax Use-Case Data Flow

The designed tax feature should follow this logical flow:

```text
Stored source activity data
    |
    +-- withholding tax
    +-- tax-relevant metadata
    |
    v
Normalize eligible tax activities
    |
    v
Select cost-basis method
    |
    +--> FIFO
    |
    +--> AVERAGE_COST
    |
    v
Calculate realized gains
    |
    +--> realized capital-gains view
    +--> tax-lot view
    +--> yearly tax summary
    +--> CSV/PDF tax export
```

The views and exports consume tax calculation output. They do not become independent calculation engines.

## Yearly-Summary Support

The Sep 22 yearly summary can aggregate `TaxRealizedGainRecord[]` without needing to know the internal cost-basis algorithm.

Each record already provides:

```text
method
realizedAt
scope
sellActivityId
proceeds
cost basis
realized gain
fees
currency values
```

The project summary can group realized records by the year of `realizedAt`.

This is an analytics grouping rule, not a jurisdiction-specific filing rule.

## Export Support

The data model supports two export levels.

### Sale-level rows

```text
method
account
asset
sell date
quantity
gross proceeds
cost basis
gross realized gain
fees
fee-adjusted realized gain
currency
```

### Method-specific trace detail

FIFO can expose:

```text
buy activity ID
buy date
sell activity ID
sell date
matched quantity
lot cost basis
lot gain
```

Average cost can expose:

```text
pool quantity before
average cost before
basis allocated
pool quantity after
average cost after
```

No persistent result table is required for either export.

## Base-Currency Availability

Base-currency values should be nullable in tax calculation structures.

This lets the tax domain distinguish a true numeric zero from unavailable historical conversion data.

A missing conversion should produce a warning/error while still allowing asset-currency calculations.

## Tax Calculation Diagnostics

A lightweight tax-specific diagnostic contract is recommended.

```ts
export interface TaxCalculationWarning {
  code: string;
  sourceActivityId?: string;
  message?: string;
}

export interface TaxCalculationError {
  code: string;
  sourceActivityId?: string;
  message?: string;
}
```

Possible codes include:

```text
MISSING_BASE_CURRENCY_CONVERSION
INSUFFICIENT_OPEN_LOTS
INSUFFICIENT_POOL_QUANTITY
INVALID_QUANTITY
INVALID_UNIT_PRICE
INVALID_FEE
```

The final shared response style should follow Raniya's API conventions.

## Activity Deletion Behavior

Source activities remain authoritative.

When a BUY or SELL is deleted, no tax-lot row needs manual deletion.

The next tax calculation rebuilds the affected scope without that transaction.

This automatically handles downstream changes to FIFO, average cost, and realized gains.

## Activity Update Behavior

Editing an activity should trigger recalculation rather than in-place tax-state mutation.

Fields that can affect tax results include:

```text
date
type
quantity
unitPrice
fee
account
asset
currency
```

If an edit moves a transaction between scopes, both the old and new scopes are affected.

For the first implementation, recalculating all tax scopes for the user is a safe fallback.

Targeted invalidation can be added later if performance requires it.

## Historical Recalculation Rule

Recalculation should start from the beginning of the affected scope's history.

Do not recalculate only the changed transaction.

A historical change can alter every later cost-basis result.

## Source Activity Deletion and Prisma Relations

Because `TaxLot` and `TaxLotMatch` are not persisted initially, no new `Order` relation is required for the first tax-lot tracker.

This avoids extra child records and cascade behavior.

If persistent results are introduced later, source BUY and SELL relations would need explicit foreign keys and separate named Prisma relations.

## Rejected Initial Persistence Design

An alternative is to create permanent Prisma tables such as:

```text
TaxLot
TaxLotMatch
AverageCostSnapshot
```

That is not recommended for the first implementation.

Reasons:

- historical edits can make stored calculations stale
- split corrections require rebuilding stored values
- method changes require separate state
- base-currency changes can invalidate stored conversions
- deletion becomes more complex
- duplicated source-of-truth risk increases
- Iteration 2 implementation becomes much larger

Persistence can be reconsidered later if an actual auditing or performance requirement appears.

## If Persistence Is Added Later

A future persistent model should follow existing Prisma conventions.

A possible direction could include:

```text
TaxLot
- id UUID
- userId
- accountId
- symbolProfileId
- sourceActivityId
- createdAt
- updatedAt
```

This is illustrative only and is not the approved initial schema.

## Cost-Basis Method Storage Decision

The selected cost-basis method is part of the tax calculation context.

It must not be persisted on individual `Order` transactions because the same activity history may be evaluated under either FIFO or average cost.

For the initial implementation, the method may be passed with each tax calculation request and returned with:

- calculation result metadata
- yearly-summary metadata
- export metadata

If the product later needs the investor's selected method to persist between sessions, it should be stored as a user-level tax preference rather than as transaction-level data.

This keeps the source transaction independent from the calculation strategy while still supporting the project's `Choose cost-basis method` use case.

## Method Isolation

A single calculation run uses exactly one cost-basis method.

```text
calculateTax(method = FIFO)
```

or:

```text
calculateTax(method = AVERAGE_COST)
```

FIFO and average-cost state must never be mixed in one run.

## Calculation Result Envelope

A conceptual result envelope is:

```ts
export interface TaxCalculationResult {
  method: TaxCalculationMethod;
  calculatedAt: Date;
  baseCurrency: string;

  scopes: TaxScopeResult[];

  warnings: TaxCalculationWarning[];
  errors: TaxCalculationError[];
}
```

## Scope Result

```ts
export interface TaxScopeResult {
  scope: TaxCalculationScope;

  realizedGains: TaxRealizedGainRecord[];

  fifoLots?: TaxLot[];
  fifoMatches?: TaxLotMatch[];

  averageCostPool?: AverageCostPool;
  averageCostEvents?: AverageCostEvent[];

  warnings: TaxCalculationWarning[];
  errors: TaxCalculationError[];
}
```

Only fields for the selected method should be populated.

## Traceability Requirements

Every output must trace back to Ghostfolio source activities.

At minimum:

- each FIFO lot references its BUY
- each FIFO match references BUY and SELL
- each average-cost event references its source activity
- each realized record references its SELL
- each result identifies method and calculation scope

This provides explainability without duplicating source transaction records.

## Deterministic Recalculation

The same:

```text
source activities
stock-split data
base currency
cost-basis method
scope rule
```

must produce the same tax result.

Activity ordering remains:

```text
date ascending
then id ascending
```

## Data Ownership

The tax domain owns:

- FIFO lot calculation structures
- FIFO match structures
- average-cost pool structures
- average-cost events
- realized tax analytics records
- tax calculation diagnostics

The Activities domain continues to own transaction source data.

Shared architecture/integration owns the final cross-feature API/data-layer placement.

## Suggested Iteration 2 Service Boundary

A dedicated tax backend area remains the recommended direction.

For example:

```text
apps/api/src/app/tax/
```

Possible internal responsibilities:

```text
tax-activity-normalizer
fifo-capital-gains
average-cost-capital-gains
tax-lot-tracker
tax-calculation
```

These names are recommendations only.

The final structure must align with Raniya's shared architecture conventions before implementation.

## Suggested Shared Interface Location

If tax contracts cross API/frontend boundaries, they may fit under:

```text
libs/common/src/lib/interfaces/
```

This matches the existing shared-interface pattern.

Do not create shared interface files until the shared API/data-contract conventions are confirmed with Raniya.

## Iteration 2 Calculation Flow

Conceptually:

```text
1. load eligible Ghostfolio activities
2. apply existing exclusion/draft filtering
3. enrich currency values
4. apply current stock-split normalization
5. map to normalized TaxActivity objects
6. sort by exact date then ID
7. group by user + account + asset
8. select FIFO or AVERAGE_COST
9. replay each scope from the beginning
10. produce method-specific trace state
11. produce common realized-gain records
12. return results to API/summary/export consumers
```

## Test Requirements

### Scope tests

Verify:

- different users never share a scope
- different assets never share a scope
- different accounts never share a scope
- null-account activities use their own unassigned scope

### FIFO lot tests

Verify:

- one BUY creates one lot
- lot ID traces to source BUY ID
- partial sale changes remaining quantity
- closed lot has zero remaining quantity
- status transitions OPEN → PARTIALLY_CONSUMED → CLOSED
- every match references source BUY and SELL

### Average-cost state tests

Verify:

- each event references a source activity
- BUY changes quantity and pooled cost
- partial SELL preserves average unit cost
- full close resets pool state
- no fake lot links are created

### Recalculation tests

Verify:

- unchanged inputs reproduce identical results
- editing an early BUY updates later results
- deleting a historical BUY rebuilds later results
- changing activity order changes results deterministically
- adding/correcting a split updates normalized tax state
- changing method does not reuse state from the other method

### Currency tests

Verify:

- zero remains distinguishable from missing conversion
- missing base conversion does not block asset-currency results
- BUY basis and SELL proceeds use their own historical conversion data

## Acceptance Criteria

This design is complete when:

- `Order` remains the authoritative transaction source
- persistent vs derived tax state is decided
- FIFO lot structure is defined
- FIFO status is defined
- source, initial, and remaining quantities are distinguished
- FIFO match structure is defined
- FIFO match persistence behavior is defined
- average-cost pool structure is defined
- average-cost event structure is defined
- average-cost persistence behavior is defined
- source BUY/SELL traceability is defined
- account treatment is defined
- calculation scope is defined
- split behavior is defined
- asset/base currency fields are defined
- missing FX is represented safely
- method storage behavior is defined
- activity update/delete behavior is defined
- recalculation strategy is defined
- yearly-summary support is defined
- export support is defined
- shared-contract impact is identified
- Iteration 2 tests are identified
- no jurisdiction-specific tax rule is invented

## Final Design Decisions

```text
Authoritative source:
Ghostfolio Order activities

FIFO lots:
derived, not persisted

FIFO matches:
derived, not persisted

Average-cost pools:
derived, not persisted

Average-cost events:
derived, not persisted

Realized-gain records:
derived, not persisted

Default matching/pool scope:
user + account + asset

Null account:
separate NO_ACCOUNT scope

Cost-basis method:
part of calculation context, not stored on Order; may later be saved as a user-level preference

Stock splits:
re-applied from current AssetProfileSplit source data

Historical source edit/delete:
replay affected scope from the beginning

Base-currency unavailable:
nullable calculation value + warning/error

Yearly summaries:
aggregate common realized-gain records

Exports:
consume common realized records plus method-specific trace detail
```

This keeps tax tracking traceable without creating a second persistent source of truth.

## Cross-Member Coordination Note

This design touches shared architecture.

Raniya's Sep 21 task is to define shared API conventions and data-layer contracts.

Before Iteration 2 implementation, coordinate these items with her:

- public tax interface location
- serialization of high-precision numeric values
- shared error/warning response shape
- tax endpoint/service boundaries
- ownership of any calculation cache

The tax calculation rules and tax-domain structures remain Tharun's feature ownership.

## Out of Scope

This Sep 21 task does not implement:

- Prisma tax-lot tables
- FIFO engine code
- average-cost engine code
- tax result caching
- yearly-summary calculations
- tax-relevant filtering
- CSV/PDF generation
- React tax-lot screens
- jurisdiction-specific pooling rules
- short-sale tax logic
- wash-sale or superficial-loss rules

## Next Task

The next scheduled tax task is September 22:

**Design the yearly tax summary data structure.**

That design should consume the common realized-gain records defined here and combine them with dividend/withholding information while keeping every yearly total traceable to source transactions.
