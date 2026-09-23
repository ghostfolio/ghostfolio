# Tax Metrics — Tax-Relevant Transaction Flag and Filtering Specification

**Owner:** Tharun Swaminathan
**Iteration:** 1 — Design & Data Modelling
**Date:** September 23, 2026

## Objective

This document defines how Ghostfolio activities are marked as tax relevant and
how that flag is applied consistently across the tax feature.

The flag lets an investor explicitly exclude a source transaction from tax
analytics without deleting the underlying Ghostfolio activity or removing it
from normal portfolio behavior.

This is Iteration 1 design work only. No Prisma migration, backend filter,
import change, API field, or frontend toggle is implemented as part of this
task.

The design must remain consistent with the previously specified withholding,
FIFO, average-cost, tax-lot, yearly-summary, and future export behavior.

This is tax analytics software, not personal tax advice. The flag does not
attempt to decide whether a transaction is legally taxable in a particular
jurisdiction.

## Repository Findings

### Existing source model

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
tags
```

There is currently no tax-specific inclusion field.

### Existing activity types

Ghostfolio currently supports:

```text
BUY
DIVIDEND
FEE
INTEREST
LIABILITY
SELL
```

The common configuration identifies BUY, DIVIDEND, and SELL as investment
activity types.

The current tax design uses:

- BUY and SELL for capital-gains calculations
- DIVIDEND for dividend/withholding analytics

Standalone FEE, INTEREST, and LIABILITY activities remain outside the current
tax calculations unless a later requirement explicitly defines their treatment.

### Existing Draft behavior

Ghostfolio uses the system Draft tag.

`WHERE_ACTIVITY_NOT_DRAFT` excludes activities carrying that tag.

Future-dated investment activities can automatically receive the Draft tag.

Normal portfolio-calculation activity loading excludes Draft activities unless
the caller explicitly requests them.

### Existing Exclude from Analysis behavior

Ghostfolio already has a system `Exclude from Analysis` tag.

The normal activity query excludes:

- an activity carrying the tag
- activities belonging to an account carrying the tag

when:

```text
withExcludedAccountsAndActivities = false
```

### Existing activity filtering is centralized

`ActivitiesService.getActivities()` already handles:

- user ownership
- date ranges
- account filters
- asset filters
- tag filters
- activity-type filters
- Draft exclusion
- Exclude from Analysis behavior
- deterministic ordering

The default order is:

```text
date ascending
then id ascending
```

The tax feature should reuse this path rather than build a second independent
transaction-query subsystem.

### Existing stock-split preparation

`getActivitiesForPortfolioCalculator()` retrieves activities and then applies
stock-split normalization.

The tax feature should continue to reuse the existing split-normalization
behavior for included source activities.

### Existing synthetic cash activities

Ghostfolio can generate synthetic BUY/SELL activities from account-balance
history.

These synthetic activities are not persisted `Order` rows.

They must not become tax transactions merely because their runtime type is BUY
or SELL.

### Existing DTO path

`CreateOrderDto` and `UpdateOrderDto` are the existing activity input contracts.

A tax-relevance field should use those contracts instead of creating a second
tax-only transaction endpoint.

### Existing update event

`ActivitiesService.updateActivity()` emits `PortfolioChangedEvent`.

Changing tax relevance changes derived tax results, so this existing event is a
useful cache-invalidation integration point if tax caching is added later.

### Existing import path

`ImportDataDto.activities` uses:

```text
CreateOrderDto[]
```

The import service also explicitly destructures and reconstructs activity
objects during validation, dry-run preview, and actual creation.

Therefore adding a database field alone is not enough. Iteration 2 must thread
the new field through the import service deliberately.

### Existing import compatibility

Older Ghostfolio export/import files do not contain a tax-relevance field.

The new field must therefore be optional in import input and have a
backward-compatible default.

## Core Design Decision

Add one persisted boolean source field to `Order`:

```prisma
isTaxRelevant Boolean @default(true)
```

The field is:

- persisted
- non-nullable
- boolean
- defaulted to true
- attached to the source activity
- independent from FIFO vs average cost

## Why Boolean Instead of Nullable

A nullable field would create three states:

```text
true
false
null
```

There is no project requirement for a third "unknown tax relevance" state.

Tax relevance is a user-controlled inclusion choice.

Therefore:

```text
true
```

means:

```text
eligible for tax analytics if every other required filter also passes
```

and:

```text
false
```

means:

```text
explicitly excluded from tax analytics
```

## Why the Default Is True

Before this feature exists, historical eligible Ghostfolio activities are
implicitly available to portfolio/tax calculations unless another exclusion
applies.

Defaulting old records to false would make existing users appear to have no tax
history.

Therefore:

```text
isTaxRelevant = true
```

is the backward-compatible default.

## Migration Behavior

Existing `Order` rows should resolve to:

```text
isTaxRelevant = true
```

after the migration.

The migration must not otherwise change transaction data.

## Tax Relevance Adds to Existing Filters

The new field is an additional tax-domain condition.

It does not replace:

- Draft filtering
- activity Exclude from Analysis
- account Exclude from Analysis
- type filtering
- user ownership
- date filtering

Conceptually:

```text
taxEligible =
    normalGhostfolioEligibility
    AND isTaxRelevant
    AND operationSpecificTypeEligibility
```

## Filter Precedence

Existing Ghostfolio exclusions remain stronger than tax relevance.

Examples:

```text
Draft = true
isTaxRelevant = true
=> excluded from tax analytics
```

```text
Exclude from Analysis = true
isTaxRelevant = true
=> excluded from tax analytics
```

```text
Excluded account = true
isTaxRelevant = true
=> excluded from tax analytics
```

```text
No other exclusion
isTaxRelevant = false
=> excluded from tax analytics
```

```text
No other exclusion
isTaxRelevant = true
=> eligible if its activity type is relevant to the requested tax operation
```

## Eligibility Matrix

| Draft | Excluded Activity | Excluded Account | Tax Relevant | Result |
| --- | --- | --- | --- | --- |
| No | No | No | True | Eligible |
| No | No | No | False | Excluded |
| Yes | No | No | True | Excluded |
| No | Yes | No | True | Excluded |
| No | No | Yes | True | Excluded |
| Yes | Yes | Yes | False | Excluded |

The tax flag never overrides an existing Ghostfolio exclusion.

## Why Not Reuse Exclude from Analysis

`Exclude from Analysis` affects broader portfolio analytics.

Tax relevance is narrower.

A user may want an activity to continue affecting:

- holdings
- performance
- charts
- portfolio value

while excluding it from tax analytics.

Therefore the existing analysis-exclusion tag is not a substitute for the tax
flag.

## Why Not Use a New Tag

A new system tag is technically possible but is not recommended.

The requirement is a single boolean property of a transaction.

A direct field provides clearer:

- API semantics
- filtering
- import/export behavior
- validation
- frontend toggle behavior

and avoids another system-tag identifier.

## Field Ownership

`isTaxRelevant` belongs to `Order`.

It should not be stored on derived structures such as:

- TaxLot
- TaxLotMatch
- AverageCostEvent
- TaxRealizedGainRecord
- YearlyTaxSummary

Those structures inherit inclusion from their source transactions.

## Activity-Type Behavior

The field is type-agnostic source metadata.

Every `Order` may store it.

However, true does not mean every activity type enters every tax calculation.

### BUY

When otherwise eligible and true:

- enters FIFO acquisition history
- enters average-cost acquisition history

### SELL

When otherwise eligible and true:

- enters FIFO/average-cost state
- may produce a realized-gain record

### DIVIDEND

When otherwise eligible and true:

- creates a DividendRecord
- contributes to yearly dividend/withholding totals

### FEE

The field can be stored.

The current tax design does not automatically attach standalone FEE activities
to a BUY or SELL.

### INTEREST

The field can be stored for future compatibility.

Interest tax analytics are not defined by the current assignment requirements.

### LIABILITY

The field can be stored for consistency.

Liability tax treatment is outside the current scope.

## No Jurisdiction-Specific Inference

The application must not infer legal taxability from activity type alone.

For example, the system must not claim:

```text
every SELL is taxable
every DIVIDEND is taxable
```

The flag controls participation in this project's generic tax analytics only.

## Proposed Prisma Change

Iteration 2 conceptually adds:

```prisma
model Order {
  ...
  isTaxRelevant Boolean @default(true)
  ...
}
```

No separate tax-activity table is required.

## Proposed Create DTO Change

Conceptually:

```ts
@IsBoolean()
@IsOptional()
isTaxRelevant?: boolean;
```

If omitted:

```text
stored value = true
```

## Proposed Update DTO Change

Conceptually:

```ts
@IsBoolean()
@IsOptional()
isTaxRelevant?: boolean;
```

If omitted during an update:

```text
preserve the existing stored value
```

An older client must not accidentally reset the field.

## Create Examples

Omitted:

```json
{
  "type": "BUY"
}
```

Result:

```text
isTaxRelevant = true
```

Explicit false:

```json
{
  "type": "BUY",
  "isTaxRelevant": false
}
```

Result:

```text
isTaxRelevant = false
```

## Update Behavior

Changing the flag must not automatically change:

- date
- quantity
- unit price
- fee
- account
- type
- tags
- other transactions

## No Automatic Cascades

If one historical BUY is switched to false, related SELLs are not automatically
changed.

If one SELL is switched to false, earlier BUYs are not automatically changed.

Automatic cascades would hide user decisions and make audit behavior harder to
explain.

## Cost-Basis Continuity Problem

BUY and SELL activities form stateful history.

A later tax result may require earlier acquisitions and disposals.

Example:

```text
2024 BUY 10   false
2026 SELL 10  true
```

The 2026 SELL may no longer have sufficient eligible acquisition basis.

FIFO should continue to report:

```text
INSUFFICIENT_OPEN_LOTS
```

Average cost should continue to report:

```text
INSUFFICIENT_POOL_QUANTITY
```

The engine must not silently restore the excluded BUY.

## Excluded Historical SELL Problem

Example:

```text
2024 BUY 10   true
2025 SELL 5   false
2026 SELL 5   true
```

If the 2025 SELL is removed from tax state, the engine sees all 10 shares as
still available before the 2026 SELL.

The 2026 calculation may execute even though the tax-state history no longer
matches the full investment history.

This requires an explicit diagnostic.

## Mixed-History Diagnostic

For a tax-relevant SELL, detect otherwise eligible BUY/SELL activities in the
same tax scope that were explicitly marked:

```text
isTaxRelevant = false
```

before or at that SELL date.

Proposed diagnostic:

```text
TAX_SCOPE_HAS_EXCLUDED_INVESTMENT_HISTORY
```

## Completeness Rule

Conservative initial rule:

```text
for each tax-relevant SELL:

if an otherwise eligible BUY or SELL exists
in the same tax scope
with isTaxRelevant = false
and date <= SELL date

then mark the basis-dependent result incomplete
and emit TAX_SCOPE_HAS_EXCLUDED_INVESTMENT_HISTORY
```

This avoids presenting a potentially misleading gain as fully complete.

The engine may still return its included-history calculation for diagnosis, but
yearly summaries and exports must preserve the incomplete status.

## Why the Rule Is Conservative

An excluded historical transaction may not always change every later result.

Determining that safely can require transfer-basis and jurisdiction-specific
rules that are outside this project.

A conservative completeness warning is safer than silently declaring the result
complete.

## Dividend Independence

Dividend analytics do not require cost-basis matching.

Therefore an excluded BUY or SELL does not automatically make an unrelated
tax-relevant dividend incomplete.

Example:

```text
BUY false
DIVIDEND true
```

The dividend may still be included if it passes all other filters.

## Non-Tax-Relevant Dividend

A DIVIDEND with:

```text
isTaxRelevant = false
```

does not contribute to:

- DividendRecord output
- gross dividend tax totals
- withholding totals
- net dividend tax totals
- tax CSV/PDF detail

The original Ghostfolio dividend remains unchanged for non-tax portfolio use.

## Synthetic Cash

Synthetic cash activities are runtime-generated and are not persisted `Order`
transactions.

They must always be excluded from the tax pipeline.

The tax system must not interpret a missing field on a synthetic activity as:

```text
isTaxRelevant = true
```

Only persisted source activities are valid tax-source transactions.

## Recommended Tax Source Loading

Reuse `ActivitiesService.getActivities()` with:

```text
includeDrafts = false
withExcludedAccountsAndActivities = false
```

plus the required date/type context.

Then apply:

```text
isTaxRelevant = true
```

as an additional tax condition.

Where practical, add the boolean to the Prisma query so excluded rows are not
loaded unnecessarily.

## Common Source Set

The tax domain may load these persisted source types:

```text
BUY
SELL
DIVIDEND
```

Then operation-specific logic narrows further.

Capital gains:

```text
BUY
SELL
```

Dividend/withholding:

```text
DIVIDEND
```

## FIFO Interaction

FIFO receives only tax-relevant eligible BUY/SELL activities.

It must:

- preserve date/ID ordering
- create lots only from included BUYs
- consume lots only for included SELLs
- preserve existing insufficient-lot errors
- report mixed-history diagnostics
- never silently use an excluded transaction

## Average-Cost Interaction

Average cost receives the same eligible BUY/SELL source set.

It must:

- build the pool only from included BUYs
- reduce it only for included SELLs
- preserve insufficient-pool errors
- report mixed-history diagnostics
- never silently use an excluded transaction

## Tax-Lot View Interaction

A BUY marked false does not create a tax lot.

If mixed tax relevance makes a scope incomplete, the tax-lot result must expose
that diagnostic rather than presenting the state as fully trustworthy.

## Yearly-Summary Interaction

The Sep 22 yearly-summary flow becomes:

```text
load eligible source history through year end
apply Draft/exclusion filters
apply isTaxRelevant
run FIFO or average cost
create selected-year tax-relevant dividend records
filter realized records to selected year
aggregate
propagate incomplete-history diagnostics
```

The yearly summary must not implement a different tax-relevance rule.

## Export Interaction

Sep 24 exports must consume the same tax calculation result as tax views and
yearly summaries.

The export layer must not independently query all activities and forget the tax
flag.

## Import Contract

Because `ImportDataDto.activities` uses `CreateOrderDto[]`, imports may include:

```json
"isTaxRelevant": true
```

or:

```json
"isTaxRelevant": false
```

Older files may omit the field.

## Import Default

When omitted:

```text
isTaxRelevant = true
```

This preserves old export/import behavior.

## Explicit False During Import

If an imported record contains:

```json
"isTaxRelevant": false
```

the import must preserve false.

The import layer must not overwrite it with the default.

## Import-Service Impact

The current import implementation reconstructs activity objects explicitly.

Iteration 2 must inspect/update at least:

- ImportDataDto/CreateOrderDto handling
- `extendActivitiesWithErrors()`
- dry-run preview construction
- actual activity creation arguments

A Prisma default alone is insufficient for preview correctness.

## Dry-Run Consistency

Old file with omitted field:

```text
dry run = true
real import = true
```

New file with explicit false:

```text
dry run = false
real import = false
```

Dry-run and real import must agree.

## Duplicate Detection

Tax relevance should not become part of existing transaction duplicate identity
in the initial implementation.

Two otherwise identical source transactions should not become different
economic transactions merely because their tax flag differs.

Tax relevance is metadata.

## Read API Behavior

`Activity` extends the Prisma `Order` model.

After the Prisma field exists, enriched activity responses can expose the new
boolean through the existing activity response path.

No separate tax-relevance lookup is needed.

## API Backward Compatibility

Old create clients can omit the field.

Old update clients can omit the field without changing the stored value.

Read responses may contain the additional boolean.

## Frontend Implication

A future activity-editing UI can expose:

```text
Tax relevant
[on/off]
```

The UI should explain that disabling it affects tax analytics only and does not
delete the activity.

For BUY/SELL, the UI should also be able to warn that excluding historical
investment activity can make later tax calculations incomplete.

Shared activity UI changes should be coordinated with Raniya.

## Recalculation Behavior

Changing `isTaxRelevant` can change:

- FIFO lots
- FIFO matches
- average-cost pool state
- realized gains
- yearly summaries
- exports

The affected tax scope must be replayed from the beginning of relevant history.

Do not update only the toggled activity's current result.

## Cache Invalidation

If tax results are cached:

```text
isTaxRelevant changed
=> invalidate affected tax result cache
```

Safe first implementation:

```text
invalidate all tax results for the user
```

Possible later optimization:

```text
userId + accountId + symbolProfileId
```

The existing activity-change event can be used as an integration point.

## Ordering

Filtering does not change the deterministic rule:

```text
date ascending
then id ascending
```

The false activity is absent from the tax state machine.

## Stock Splits

Tax relevance applies to source activities, not `AssetProfileSplit`.

For an included transaction, normal split normalization still applies.

For an excluded transaction, no tax lot/pool state is created from it.

## Account Scope

The Sep 21 scope remains:

```text
userId + accountId + symbolProfileId
```

Tax relevance does not change the scope key.

## Null Account

A persisted activity with:

```text
accountId = null
```

still belongs to the NO_ACCOUNT tax scope when otherwise eligible and true.

## Unsupported Activity Types

For current functionality:

```text
FEE
INTEREST
LIABILITY
```

may store the flag but do not enter the existing capital-gains/dividend tax
engines.

A true value on one of these types is not an error.

## Proposed Diagnostic Codes

New filtering diagnostic:

```text
TAX_SCOPE_HAS_EXCLUDED_INVESTMENT_HISTORY
```

Previously defined calculation errors continue to apply:

```text
INSUFFICIENT_OPEN_LOTS
INSUFFICIENT_POOL_QUANTITY
INVALID_QUANTITY
INVALID_UNIT_PRICE
INVALID_FEE
MISSING_BASE_CURRENCY_CONVERSION
```

The yearly-summary layer should propagate, not rename, underlying errors.

## Diagnostic Severity

`isTaxRelevant = false` is a valid user choice and is not itself an error.

A warning/incomplete state arises only when exclusion can make a requested
basis-dependent result incomplete.

## No Silent Fallback

The system must not respond to incomplete tax history by:

- restoring excluded transactions
- switching cost-basis methods
- assuming zero cost basis
- using portfolio performance average price as tax basis

Explicit source choices must remain explicit.

## Security and Ownership

The flag uses the same activity ownership and update permissions as the source
activity.

There should not be a separate lower-permission endpoint that changes only the
tax flag.

## Iteration 2 Affected Files

Expected existing files include:

```text
prisma/schema.prisma

libs/common/src/lib/dtos/create-order.dto.ts
libs/common/src/lib/dtos/update-order.dto.ts

apps/api/src/app/activities/activities.service.ts
apps/api/src/app/activities/activities.controller.ts

apps/api/src/app/import/import-data.dto.ts
apps/api/src/app/import/import.service.ts

libs/common/src/lib/interfaces/activities.interface.ts
```

New tax-domain filtering/calculation files will also be involved.

## Smallest Safe Implementation Direction

Iteration 2 should:

1. add `isTaxRelevant` to `Order`
2. add optional boolean input to existing create/update contracts
3. preserve true as the compatibility default
4. thread the value through import and dry-run preview
5. reuse existing Draft and Exclude from Analysis behavior
6. apply tax relevance as an additional tax-domain condition
7. make FIFO, average cost, tax lots, summaries, and exports consume the same
   source pipeline
8. add mixed-history diagnostics
9. avoid changing normal portfolio-analysis semantics

## Planned Iteration 2 Tests

### Migration and create

Verify:

- existing rows resolve true
- omitted create field stores true
- explicit true stores true
- explicit false stores false

### Update

Verify:

- true can change to false
- false can change to true
- omitted update field preserves value
- normal change event is emitted

### Existing filter interaction

Verify:

- true normal activity is eligible
- false normal activity is excluded
- Draft + true is excluded
- activity Exclude from Analysis + true is excluded
- excluded account + true is excluded
- synthetic cash never enters tax source data

### Type behavior

Verify:

- true BUY enters capital-gains history
- false BUY does not
- true SELL enters capital-gains history
- false SELL does not produce realized gain
- true DIVIDEND creates a dividend tax record
- false DIVIDEND does not
- true standalone FEE does not automatically attach to a trade
- true INTEREST/LIABILITY do not enter current calculations

### FIFO continuity

Verify:

- excluded BUY before relevant SELL produces expected insufficient/mixed-history
  diagnostics
- excluded SELL before relevant SELL produces mixed-history diagnostic
- excluded transactions are never silently restored

### Average-cost continuity

Verify:

- excluded BUY changes pool input
- excluded SELL before relevant SELL produces mixed-history diagnostic
- insufficient pool behavior remains deterministic

### Import

Verify:

- old import without field succeeds and resolves true
- import true preserves true
- import false preserves false
- dry-run matches real import
- duplicate detection does not use the flag as economic identity

### Yearly summary

Verify:

- false dividend is absent from yearly tax totals
- mixed investment history propagates incomplete status
- summary uses only results from the common tax-filtered pipeline

### Regression

Verify:

- Draft behavior is unchanged
- Exclude from Analysis behavior is unchanged
- account exclusion behavior is unchanged
- normal portfolio calculator output is unchanged solely by adding a default
  true field

## Acceptance Criteria

The Sep 23 design is complete when:

- field name, type, nullability, and default are defined
- backward compatibility is defined
- create/update behavior is defined
- import and dry-run behavior are defined
- Draft interaction is defined
- activity exclusion interaction is defined
- account exclusion interaction is defined
- synthetic cash behavior is defined
- BUY/SELL/DIVIDEND behavior is defined
- unsupported type behavior is defined
- FIFO behavior is defined
- average-cost behavior is defined
- tax-lot behavior is defined
- yearly-summary behavior is defined
- export behavior is defined
- mixed historical BUY/SELL risk is addressed
- completeness diagnostics are defined
- recalculation/cache impact is identified
- deterministic ordering remains intact
- stock-split interaction is defined
- ownership/security is defined
- Iteration 2 tests are identified
- normal Ghostfolio analysis behavior remains unchanged
- no jurisdiction-specific tax rule is invented

## Final Design Decisions

```text
Field:
Order.isTaxRelevant

Type:
Boolean

Nullable:
No

Default:
true

True:
eligible for tax analytics if all other filters and type rules pass

False:
explicitly excluded from tax analytics

Draft:
still excluded

Activity Exclude from Analysis:
still excluded

Excluded account:
still excluded

BUY/SELL:
flag controls participation in cost-basis history

DIVIDEND:
flag controls participation in dividend/withholding tax analytics

FEE/INTEREST/LIABILITY:
flag stored, but current tax engines do not consume these types

Synthetic cash:
always excluded from tax source data

Old rows/imports:
default true

Update omitted field:
preserve current value

Automatic cascade:
none

Mixed excluded investment history:
emit diagnostic and mark affected basis-dependent result incomplete

Ordering:
date ascending, then id ascending after filtering

Stock splits:
reuse existing normalization for included activities

Yearly summaries:
consume the same tax-filtered calculation result

Exports:
consume the same tax-filtered calculation result
```

## Cross-Member Coordination Note

This task is primarily within Tharun's tax ownership.

Implementation can still touch shared areas:

- shared Order/activity contracts
- import/export DTOs
- activity editing UI
- cache invalidation
- React migration/component architecture

Coordinate shared API/UI changes with Raniya before implementation.

Do not alter Arthur's performance calculations or Sesha's risk filtering
semantics for this tax flag.

## Out of Scope

The Sep 23 task does not implement:

- Prisma migration
- API changes
- UI toggle
- FIFO/average-cost engine code
- yearly-summary service
- exports
- transfer-basis rules
- short-sale rules
- wash-sale/superficial-loss rules
- legal classification of taxable transactions

## Next Task

The next scheduled tax task is September 24:

**Specify the CSV/PDF tax export format.**

That design should use the same tax-relevant source set and consume the existing
YearlyTaxSummary, DividendRecord, TaxRealizedGainRecord, FIFO trace data, and
average-cost trace data so exported numbers reconcile with the tax views.
