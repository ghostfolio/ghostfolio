# Tax Metrics — Average-Cost Capital-Gains Calculation Specification

**Owner:** Tharun Swaminathan
**Iteration:** 1 — Design & Data Modelling
**Date:** September 18, 2026

## Objective

This document specifies the average-cost capital-gains method for the Ghostfolio tax extension.

The goal is to define the calculation behavior precisely enough for Iteration 2 backend implementation while keeping Iteration 1 design-only.

The average-cost engine maintains a pooled cost basis for eligible BUY and SELL activities. Unlike FIFO, it does not match a sale to specific acquisition lots. Instead, all eligible acquisitions inside one calculation scope contribute to a shared pool, and each disposal removes a proportional share of that pool.

This is tax analytics software, not personal tax advice. The design does not introduce jurisdiction-specific tax rates, wash-sale rules, holding-period rules, or other country-specific tax treatment.

## Repository Findings

### Ghostfolio already uses average-price behavior in portfolio calculations

Ghostfolio's current portfolio logic already keeps an average investment basis for long positions.

When a BUY is added, the existing investment increases by:

`quantity × unitPrice`

When a SELL occurs while the position is long, the existing investment is reduced using the current average price.

This behavior is conceptually similar to the gross average-cost pool defined in this document.

However, the existing portfolio calculator is performance logic, not a tax engine. The tax calculation should therefore remain separate so tax-specific traceability, error handling, fee treatment, and yearly reporting can be added without changing existing portfolio-performance behavior.

### Existing tests confirm weighted-average behavior

Ghostfolio already has BUY/BUY tests where multiple acquisition prices are combined into one average price.

For example, two purchases of two shares each at 142.90 and 136.60 result in:

```text
gross acquisition value =
    2 × 142.90
    + 2 × 136.60
    = 559.00

quantity = 4

average price =
    559.00 / 4
    = 139.75
```

The current portfolio calculation also keeps activity fees separate from this average price.

### Existing partial-sale behavior

For a long position, Ghostfolio reduces the current investment by the disposed quantity multiplied by the existing average price.

This means a partial sale reduces both quantity and cost basis proportionally and leaves the average unit cost unchanged.

That same principle is appropriate for the average-cost tax method, although the tax implementation should use its own explicitly traceable pool state.

### Activity ordering

`ActivitiesService.getActivities()` uses activity `date` ascending by default and adds activity `id` as a secondary order.

The average-cost engine should use the same deterministic rule:

1. exact activity `date` ascending
2. activity `id` ascending when dates are equal

### Enriched activity data

The enriched `Activity` model contains useful tax inputs such as:

- activity `id`
- exact `date`
- `quantity`
- `feeInAssetProfileCurrency`
- `feeInBaseCurrency`
- `unitPriceInAssetProfileCurrency`
- `value`
- `valueInBaseCurrency`

The tax engine should operate on these enriched activities before they are reduced to the smaller `PortfolioOrder` representation used by the performance calculator.

### Stock-split normalization

Ghostfolio already adjusts investment activities for stock splits.

Historical activity quantity is multiplied by the split ratio and unit price is adjusted inversely, preserving total activity value.

The average-cost engine should reuse this existing normalization instead of implementing a second split system.

### Currency conversion requires care

Ghostfolio already computes activity values in the asset-profile currency and the user's base currency.

These conversions are useful inputs, but tax calculations should not silently treat a missing historical conversion as a valid zero or an exchange rate of one.

The Iteration 2 tax service should preserve explicit conversion failure status when base-currency calculation is unavailable.

## Relationship to the FIFO Specification

The Sep 17 FIFO design and this average-cost design should share the same upstream activity preparation wherever practical.

Both methods should use the same:

- activity filtering
- deterministic transaction ordering
- stock-split normalization
- numeric precision approach
- transaction currency handling
- source activity identifiers
- missing-data validation
- error reporting conventions

The calculation method begins to differ only after eligible BUY and SELL activities have been normalized and grouped.

FIFO keeps separate acquisition lots and consumes the oldest lot first.

Average cost combines acquisitions into one shared cost pool and allocates a proportional share of that pool to every disposal.

The two methods should therefore be separate calculation strategies over a shared normalized input contract.

## Average-Cost Pool Scope

The calculation operates on one **average-cost pool scope** at a time.

At minimum, different assets must never share the same pool.

The exact grouping rule, including whether activities from multiple accounts are combined, is intentionally not decided in this document.

Account pooling can be jurisdiction-specific and is not defined by the current project requirements.

The final pool key should be decided during the Sep 21 tax-lot/data-model task.

## Eligible Activities

Only the following activity types affect the average-cost pool:

- `BUY`
- `SELL`

The following activity types do not directly change the acquisition cost pool:

- `DIVIDEND`
- `FEE`
- `INTEREST`
- `LIABILITY`

A fee attached directly to a BUY or SELL can participate in fee-adjusted analytics.

A standalone `FEE` activity is not automatically attached to a transaction because the current data model does not identify which trade that fee belongs to.

## Filtering

The initial average-cost implementation should follow the same filtering principles as the FIFO design:

- exclude draft activities
- exclude activities explicitly excluded from analysis
- exclude activities in excluded accounts
- use only BUY and SELL activities
- do not include synthetic cash activities

The Sep 23 tax-relevant flag/filter can later add tax-specific filtering without changing the core pool algorithm.

## Required Input Fields

Each source activity used by the engine should retain:

- activity `id`
- exact activity `date`
- activity `type`
- asset identity
- `quantity`
- transaction currency
- original `unitPrice`
- `unitPriceInAssetProfileCurrency`
- `feeInAssetProfileCurrency`
- `valueInBaseCurrency`
- `feeInBaseCurrency`

The original transaction data should remain available for audit and export even when the calculation uses converted values.

## Deterministic Ordering

Activities are processed in this order:

1. exact activity `date` ascending
2. activity `id` ascending when exact timestamps are equal

The engine must not depend on database insertion order or the order of an input array.

The full source timestamp should be retained when available.

Example:

```text
2026-02-10T09:00:00Z  BUY   id=0001
2026-02-10T09:00:00Z  BUY   id=0002
2026-02-10T09:00:00Z  SELL  id=0003
```

The pool is updated by BUY `0001`, then BUY `0002`, then the SELL.

This matters because average cost changes after each BUY.

## Numeric Precision

Relevant numeric inputs should be converted to `Big` values at the tax-engine boundary.

Intermediate calculations should not use display rounding.

The engine must support fractional quantities because stock splits, cryptocurrencies, and other supported assets can produce non-integer holdings.

Final CSV/PDF display precision and rounding belong to the Sep 24 export task.

## Pool State

For each average-cost scope, the engine maintains a working pool.

A proposed in-memory pool state is:

```text
quantity

grossCostAssetCurrency
acquisitionFeePoolAssetCurrency

grossCostBaseCurrency
acquisitionFeePoolBaseCurrency

averageGrossUnitCostAssetCurrency
averageFeeAdjustedUnitCostAssetCurrency

averageGrossUnitCostBaseCurrency
averageFeeAdjustedUnitCostBaseCurrency

currency
```

The base-currency fields may be unavailable if required historical exchange-rate data is unavailable.

This is calculation state, not necessarily a permanent Prisma model.

Permanent storage decisions belong to the Sep 21 data-model task.

## Meaning of Gross Cost Pool

The gross cost pool represents acquisition value before activity fees.

In asset-profile currency:

```text
grossCostPool =
    sum(adjusted BUY quantity × BUY unit price)
    - gross cost basis previously allocated to SELL activities
```

This pool allows the tax feature to calculate a neutral gross realized gain without assuming that every jurisdiction treats activity fees the same way.

## Meaning of Acquisition Fee Pool

BUY activity fees are tracked separately in an acquisition-fee pool.

For a BUY:

```text
acquisitionFeePool =
    previous acquisitionFeePool
    + buyFee
```

When a SELL occurs, a proportional share of this fee pool is allocated to the disposed quantity.

Keeping the acquisition fee pool separate allows the API and export layer to show both gross gain and fee-adjusted gain without losing the original fee information.

## Average Unit Cost

When pool quantity is greater than zero:

```text
averageGrossUnitCost =
    grossCostPool / quantity
```

A fee-adjusted average can also be derived:

```text
averageFeeAdjustedUnitCost =
    (grossCostPool + acquisitionFeePool) / quantity
```

The gross average cost is the primary cost-basis value.

The fee-adjusted average is a derived analytics value and must not be presented as universally required tax treatment.

If quantity is zero, both averages are zero.

## BUY Processing

Let the current pool before the BUY contain:

```text
Q = current quantity
C = current gross cost pool
F = current acquisition fee pool
```

For a BUY with:

```text
q = buy quantity
p = buy unit price
f = buy fee
```

the new pool becomes:

```text
Qnew = Q + q
Cnew = C + (q × p)
Fnew = F + f
```

Then:

```text
averageGrossUnitCost =
    Cnew / Qnew

averageFeeAdjustedUnitCost =
    (Cnew + Fnew) / Qnew
```

A BUY creates no realized gain.

## SELL Processing

A SELL reduces the pool proportionally.

Before the SELL, let:

```text
Q = pool quantity
C = gross cost pool
F = acquisition fee pool
```

For a valid SELL quantity `q`:

```text
0 < q <= Q
```

the disposal ratio is:

```text
disposalRatio = q / Q
```

The gross cost basis allocated to the disposal is:

```text
grossCostBasisAllocated =
    C × disposalRatio
```

The BUY-fee amount allocated to the disposal is:

```text
buyFeesAllocated =
    F × disposalRatio
```

After the disposal:

```text
Qnew = Q - q
Cnew = C - grossCostBasisAllocated
Fnew = F - buyFeesAllocated
```

If `Qnew > 0`, the average unit cost should remain unchanged except for insignificant internal precision effects.

If `Qnew = 0`, all pool values must be reset exactly to zero.

## Why a Partial SELL Does Not Change Average Cost

Example before sale:

```text
quantity = 150
gross cost pool = 1800.00
average gross unit cost = 12.00
```

SELL 60 shares.

Allocated basis:

```text
1800.00 × 60 / 150
= 720.00
```

Remaining quantity:

```text
150 - 60
= 90
```

Remaining gross cost pool:

```text
1800.00 - 720.00
= 1080.00
```

Average after sale:

```text
1080.00 / 90
= 12.00
```

The sale reduces quantity and total cost basis by the same proportion.

## Gross Sale Proceeds

For a SELL:

```text
grossProceeds =
    sellQuantity × sellUnitPrice
```

This value remains separate from the cost basis.

## Gross Realized Gain

For one SELL:

```text
grossRealizedGain =
    grossProceeds
    - grossCostBasisAllocated
```

A negative value is a realized loss.

The result is an analytics value and should not be described as a universally taxable gain.

## SELL Activity Fee

A fee attached directly to the SELL is associated with that disposal.

For a fully supported long-position disposal:

```text
sellFeeAllocated = sell.fee
```

For a sale that contains an unsupported unmatched quantity, only the proportional fee associated with the valid long-position portion may be used in a partial result:

```text
sellFeeAllocated =
    sellFee × matchedQuantity / sellQuantity
```

The remaining fee should stay associated with the unsupported portion.

## Fee-Adjusted Realized Gain

The fee-adjusted analytics result is:

```text
realizedGainAfterActivityFees =
    (grossProceeds - sellFeeAllocated)
    - (grossCostBasisAllocated + buyFeesAllocated)
```

This must remain separate from `grossRealizedGain`.

The application should not claim that this formula is the legally taxable amount in every jurisdiction.

## Pool State After a SELL

After every supported SELL, the engine should expose both pre-transaction and post-transaction pool state.

This makes the calculation traceable even though individual BUY lots are not consumed.

A result should be able to answer what quantity and average cost existed before the sale, how much basis and acquisition fee were allocated, and what pool remained afterward.

## Average-Cost Event Output

Each processed BUY or SELL should create a traceable calculation event.

A proposed event shape is:

```text
sourceActivityId
activityDate
activityType
currency

quantityBefore
grossCostPoolBefore
acquisitionFeePoolBefore
averageGrossUnitCostBefore

activityQuantity
activityGrossValue
activityFee

quantityAfter
grossCostPoolAfter
acquisitionFeePoolAfter
averageGrossUnitCostAfter

warnings[]
errors[]
```

For a SELL, additionally include:

```text
matchedQuantity
unmatchedQuantity

grossProceeds
grossCostBasisAllocated
buyFeesAllocated
sellFeeAllocated

grossRealizedGain
realizedGainAfterActivityFees
```

Base-currency equivalents should be included when reliable historical conversion data is available.

## Source-Transaction Traceability

Unlike FIFO, average cost does not assign a sale to specific BUY activities.

Traceability should therefore come from the ordered event history and pool-state transitions.

Every event references its source activity ID.

Given the ordered event sequence, the application can reconstruct which BUYs increased the pool, the pool state before a SELL, the basis removed by that SELL, and the pool state after it.

The engine should not invent fake lot matches for average cost.

## Asset-Profile Currency

The primary average-cost pool should use the asset-profile currency.

For BUY activities, use:

- `unitPriceInAssetProfileCurrency`
- `feeInAssetProfileCurrency`

This provides a consistent currency for the pooled acquisition basis of one asset.

## Base-Currency Pool

A second independent cost pool can be maintained in the user's base currency.

For a BUY:

```text
grossCostBaseCurrencyNew =
    grossCostBaseCurrencyOld
    + buy.valueInBaseCurrency
```

and:

```text
acquisitionFeePoolBaseCurrencyNew =
    acquisitionFeePoolBaseCurrencyOld
    + buy.feeInBaseCurrency
```

For a SELL, use the same disposal ratio:

```text
grossCostBasisAllocatedBase =
    grossCostPoolBase × disposalRatio

buyFeesAllocatedBase =
    acquisitionFeePoolBase × disposalRatio
```

Gross proceeds in base currency come from the SELL transaction's own transaction-date conversion.

This means acquisition basis reflects BUY-date exchange rates while proceeds reflect the SELL-date exchange rate.

The resulting base-currency realized gain therefore includes the effect of currency movement.

This is useful analytics but should not automatically be labeled as a jurisdiction-specific taxable amount.

## Historical FX Availability

Tax calculations should distinguish between a true numeric zero, a missing historical conversion, and a successful conversion.

The tax service should not silently substitute `FX = 1` for missing historical data.

It should also avoid treating an unavailable conversion as a valid zero simply because a shared API representation uses a numeric fallback.

If base-currency conversion is unavailable:

- asset-profile-currency average cost can still be calculated
- affected base-currency pool values should be unavailable
- the activity/event should contain a traceable conversion warning or error

The exact shared API contract for preserving conversion availability should be coordinated with Raniya because changing shared activity response semantics can affect other features.

## Stock Splits

Average-cost processing should reuse Ghostfolio's existing split normalization.

For an activity before a split:

```text
adjustedQuantity =
    originalQuantity × numerator / denominator

adjustedUnitPrice =
    originalUnitPrice × denominator / numerator
```

Total acquisition value remains unchanged.

For the average-cost pool, a split therefore changes the effective units but not the total cost basis.

Example:

Before 2:1 split:

```text
quantity = 10
gross cost pool = 1000.00
average cost = 100.00
```

After normalization:

```text
quantity = 20
gross cost pool = 1000.00
average cost = 50.00
```

The engine should not adjust provider market data a second time.

## Example 1 — Two BUYs Followed by a Partial SELL

Activities:

```text
BUY #1: quantity 100, unitPrice 10.00, fee 2.00
BUY #2: quantity 50, unitPrice 16.00, fee 1.00
SELL #3: quantity 60, unitPrice 20.00, fee 3.00
```

After both BUYs:

```text
quantity = 150
gross cost pool = 1800.00
acquisition fee pool = 3.00
average gross unit cost = 12.00
average fee-adjusted unit cost = 12.02
```

For the SELL:

```text
disposal ratio = 60 / 150 = 0.4

gross cost basis allocated = 1800.00 × 0.4 = 720.00
buy fees allocated = 3.00 × 0.4 = 1.20
gross proceeds = 60 × 20.00 = 1200.00

gross realized gain = 1200.00 - 720.00 = 480.00

fee-adjusted realized gain =
    (1200.00 - 3.00)
    - (720.00 + 1.20)
    = 475.80
```

Remaining pool:

```text
quantity = 90
gross cost pool = 1080.00
acquisition fee pool = 1.80
average gross unit cost = 12.00
average fee-adjusted unit cost = 12.02
```

The average does not change after the partial SELL.

## Example 2 — New BUY After a Partial SELL

Start from the remaining pool in Example 1:

```text
quantity = 90
gross cost pool = 1080.00
acquisition fee pool = 1.80
```

New BUY:

```text
quantity = 30
unitPrice = 18.00
fee = 0.60
```

New state:

```text
quantity = 120
gross cost pool = 1620.00
acquisition fee pool = 2.40
average gross unit cost = 13.50
average fee-adjusted unit cost = 13.52
```

A new BUY changes the weighted average because it adds both quantity and cost to the pool.

## Example 3 — Full Position Close

Starting pool:

```text
quantity = 120
gross cost pool = 1620.00
acquisition fee pool = 2.40
```

SELL:

```text
quantity = 120
unitPrice = 15.00
fee = 1.20
```

Result:

```text
disposal ratio = 1
gross cost basis allocated = 1620.00
buy fees allocated = 2.40
gross proceeds = 1800.00
gross realized gain = 180.00

fee-adjusted gain =
    (1800.00 - 1.20)
    - (1620.00 + 2.40)
    = 176.40
```

After the sale:

```text
quantity = 0
gross cost pool = 0
acquisition fee pool = 0
average gross unit cost = 0
average fee-adjusted unit cost = 0
```

A later BUY starts a new average-cost cycle.

## Example 4 — Stock Split Followed by SELL

Original BUY:

```text
10 shares at 100.00
fee = 5.00
```

After a 2:1 split normalization:

```text
20 shares at 50.00
gross cost pool = 1000.00
acquisition fee pool = 5.00
```

SELL:

```text
5 shares at 60.00
fee = 1.00
```

Result:

```text
disposal ratio = 5 / 20 = 0.25
gross cost basis allocated = 250.00
allocated acquisition fee = 1.25
gross proceeds = 300.00
gross gain = 50.00

fee-adjusted gain =
    (300.00 - 1.00)
    - (250.00 + 1.25)
    = 47.75
```

Remaining pool:

```text
quantity = 15
gross cost pool = 750.00
acquisition fee pool = 3.75
average gross unit cost = 50.00
```

## Zero and Boundary Cases

### Zero quantity

A BUY or SELL with quantity equal to zero should not change the pool.

For tax calculations, treat it as invalid or ignore it with a clear validation warning rather than creating a zero-size event that appears to have tax meaning.

### Negative quantity

Negative quantity is invalid input for the long-position average-cost engine.

### Zero unit price

A zero unit price can represent a zero-cost acquisition and should not automatically be rejected.

Any future rules for gifts, awards, or other special zero-cost acquisitions are outside this generic analytics specification.

### Negative unit price

Negative unit price is invalid.

### Zero fee

A zero fee is valid.

### Negative fee

A negative fee is invalid for this engine.

## SELL With Insufficient Pool Quantity

A SELL where:

```text
sellQuantity > poolQuantity
```

means the long-position average-cost engine does not have enough acquisition quantity to support the full disposal.

The engine must not create a negative quantity or negative cost pool.

For the supported long portion:

```text
matchedQuantity = poolQuantity
unmatchedQuantity = sellQuantity - poolQuantity
```

The matched long portion may be calculated using the current pool, but the result must be marked with:

```text
error = INSUFFICIENT_POOL_QUANTITY
```

The unmatched portion must not be presented as a valid average-cost gain.

Because the unmatched portion represents short-position behavior, subsequent results in the same scope should be considered incomplete until short-position tax handling is explicitly designed.

The engine should surface this state instead of silently restarting a positive pool on the next BUY.

## SELL Before Any BUY

A SELL before any valid BUY is an insufficient-pool condition.

Ghostfolio's performance calculator can represent short positions, but short-sale tax treatment is outside this long-position average-cost design.

No short-sale tax rules should be invented.

## Pool Reconciliation Rules

For a valid long-only pool:

```text
total adjusted BUY quantity
- total supported SELL quantity
= current pool quantity
```

For every supported SELL:

```text
grossCostPoolBefore
- grossCostBasisAllocated
= grossCostPoolAfter
```

and:

```text
acquisitionFeePoolBefore
- buyFeesAllocated
= acquisitionFeePoolAfter
```

For a fully closed pool:

```text
quantity = 0
gross cost pool = 0
acquisition fee pool = 0
```

The implementation should force exact zero when the remaining quantity is effectively zero so tiny numeric residuals do not leak into later cycles.

## Average-Cost Invariants

For any partial SELL where the pool remains open:

```text
averageGrossUnitCostBefore
=
averageGrossUnitCostAfter
```

subject only to internal arbitrary-precision representation.

A BUY may change average cost.

A SELL should not.

This is one of the most important numeric assertions for Iteration 2 tests.

## Realized vs Unrealized Values

A realized gain is produced only by a supported SELL.

The remaining cost pool represents the basis of the open position.

The pool itself is not an unrealized gain.

Calculating market value or unrealized gain on the remaining position is outside this tax calculation and should continue to belong to portfolio/performance analytics.

## Proposed Sale Result

A SELL result should contain at least:

```text
sellActivityId
sellDate
currency

poolQuantityBefore
averageGrossUnitCostBefore

sellQuantity
matchedQuantity
unmatchedQuantity

grossProceeds
grossCostBasisAllocated
buyFeesAllocated
sellFeeAllocated

grossRealizedGain
realizedGainAfterActivityFees

poolQuantityAfter
grossCostPoolAfter
acquisitionFeePoolAfter
averageGrossUnitCostAfter

warnings[]
errors[]
```

Base-currency equivalents should be returned when reliable conversion data is available.

## Comparison With FIFO

Consider:

```text
BUY 100 @ 10
BUY 50 @ 16
SELL 60 @ 20
```

Average cost:

```text
average unit cost = 12.00
cost basis for 60 = 720.00
gross realized gain = 480.00
```

FIFO:

```text
first 60 shares come from the 10.00 lot
cost basis = 600.00
gross realized gain = 600.00
```

The same transaction history can therefore produce different realized gains depending on the selected cost-basis method.

The API and export layer must clearly identify which method produced a result.

The application must never mix FIFO and average-cost state inside the same calculation run.

## Method Selection

A future tax calculation request should explicitly select a method, for example:

```text
FIFO
AVERAGE_COST
```

The selected method determines the state machine used for cost basis.

The normalized transaction input can remain shared.

The exact API contract for selecting the method belongs to later architecture and integration work.

## Planned Iteration 2 Tests

The average-cost engine should include exact numeric assertions for:

- one BUY followed by one full SELL
- multiple BUYs producing a weighted average
- partial SELL leaving average cost unchanged
- multiple sequential partial SELLs
- a BUY after a partial SELL recalculating the weighted average
- full position close resetting every pool value to zero
- new BUY after a fully closed cycle
- zero acquisition fees
- non-zero BUY and SELL fees
- zero-cost acquisition
- fractional quantities
- same timestamp with deterministic activity-ID ordering
- normal stock split
- reverse stock split
- multiple stock splits
- missing base-currency conversion
- SELL quantity greater than pool quantity
- SELL before any BUY
- separate assets never sharing a pool
- separate average-cost scopes never sharing a pool

Tests should verify exact expected numeric results and state transitions, not only that the calculation executes.

## Suggested Shared Tax Input Layer

FIFO and average cost repeat several preparation steps.

A later Iteration 2 implementation may benefit from a shared tax input normalization layer that:

1. retrieves enriched activities
2. applies existing Ghostfolio activity filters
3. applies stock-split normalization
4. preserves exact timestamps and source IDs
5. validates numeric inputs
6. provides reliable asset/base-currency conversion state
7. sorts activities deterministically
8. groups activities by the selected tax calculation scope

FIFO and average cost can then operate as separate calculation strategies over that normalized data.

This is a recommendation only.

Because this would be a shared backend boundary, the exact structure should be coordinated with Raniya before implementation.

## Implementation Boundary — Iteration 2

The average-cost engine should be implemented as tax-domain business logic.

It should not directly change the existing ROAI portfolio calculator.

Although Ghostfolio already uses average-price concepts, that calculator serves portfolio performance and contains behavior that is outside the tax feature.

A candidate future structure is:

```text
apps/api/src/app/tax/
```

with separate services or strategy classes for:

```text
FIFO
AVERAGE_COST
```

This path is not final until the shared architecture is coordinated with Raniya.

## Likely Relevant Existing Files

The Iteration 2 implementation is likely to reuse or interact with:

```text
apps/api/src/app/activities/activities.service.ts
apps/api/src/app/portfolio/calculator/portfolio-calculator.ts
apps/api/src/app/portfolio/calculator/roai/portfolio-calculator.ts
apps/api/src/services/asset-profile-split/asset-profile-split.helper.ts
apps/api/src/services/exchange-rate-data/exchange-rate-data.service.ts
libs/common/src/lib/interfaces/activities.interface.ts
```

Existing BUY/BUY and partial-SELL portfolio-calculator tests are useful reference cases, but dedicated tax-engine tests should be added rather than changing those tests into tax tests.

## Cross-Feature Impact

The current performance calculator belongs to the shared portfolio-performance path.

Changing its formulas for this tax feature could affect Arthur's performance charts and other existing Ghostfolio behavior.

The average-cost tax implementation should therefore avoid modifying existing performance semantics.

Any change to shared `Activity` response fields, currency-conversion semantics, or common API contracts should be coordinated with Raniya because those areas cross team feature boundaries.

## Acceptance Criteria

This specification is complete when:

- the average-cost pool inputs are defined
- deterministic activity ordering is defined
- BUY pool updates are defined
- weighted-average calculation is defined
- SELL proportional cost-basis removal is defined
- partial SELL behavior is defined
- full-close reset behavior is defined
- BUY-after-SELL behavior is defined
- gross and fee-adjusted values remain separate
- attached BUY and SELL fee treatment is defined
- standalone fee behavior is defined
- asset-profile currency behavior is defined
- base-currency pool behavior is defined
- missing historical FX behavior is defined
- stock splits reuse Ghostfolio's existing normalization
- fractional quantities are supported
- zero and invalid inputs are addressed
- insufficient-pool handling is defined
- short-sale tax treatment is explicitly outside scope
- source activity traceability is defined
- realized and unrealized values are kept separate
- reconciliation invariants are defined
- FIFO and average cost remain separate methods
- Iteration 2 tests are identified
- no jurisdiction-specific tax rules are invented
- existing portfolio-performance behavior remains unchanged

## Open Questions for Later Iteration 1 Tasks

### Sep 21 — Tax-Lot / Tax-State Data Model

Decide:

- final FIFO lot persistence model
- whether average-cost pool snapshots require persistence
- whether tax calculation results are stored or recalculated
- final pool/matching scope, including account treatment
- shared transaction-to-tax-result relationships
- method identifier storage and API representation

### Sep 22 — Yearly Tax Summary

Decide how average-cost realized results are grouped into yearly summaries and how the summary identifies the selected cost-basis method.

### Sep 23 — Tax-Relevant Filtering

Define the explicit tax-relevant transaction flag and how it interacts with existing Ghostfolio filtering.

### Sep 24 — CSV/PDF Export

Define display precision, final export rounding, average-cost pool fields exposed to users, realized-gain fields, and method identification in exported reports.

## Out of Scope

This Sep 18 task does not define or implement:

- permanent Prisma tax-state models
- FIFO lot matching
- yearly tax summaries
- tax-relevant filtering
- React/UI work
- export formatting
- jurisdiction-specific tax rates
- holding-period classifications
- wash-sale or superficial-loss rules
- short-sale tax calculations
- account pooling rules not specified by the project
- corporate-action handling beyond Ghostfolio's existing stock-split support

## Design Decision Summary

The average-cost method uses one pooled basis per calculation scope.

BUY:

```text
quantity increases
gross cost pool increases by BUY value
acquisition fee pool increases by BUY fee
average cost is recalculated
```

SELL:

```text
quantity decreases
gross cost pool decreases proportionally
acquisition fee pool decreases proportionally
average cost remains unchanged while the pool stays open
realized gain is calculated from proceeds minus allocated basis
```

A fully closed position resets the pool to zero.

The tax engine should preserve gross and fee-adjusted results separately, maintain source-activity traceability, reuse Ghostfolio's split and activity patterns, and remain separate from the existing performance calculator.

## Next Task

The next scheduled tax task is September 21:

**Design the tax-lot data model.**

That task should connect the FIFO lot structure, average-cost pool state, transaction traceability, and future yearly-summary/export requirements into an implementation-ready backend data model.
