# Tax Metrics — FIFO Capital-Gains Calculation Specification

**Owner:** Tharun Swaminathan
**Iteration:** 1 — Design & Data Modelling
**Date:** September 17, 2026

## Objective

This document specifies the FIFO (First-In, First-Out) capital-gains method for the Ghostfolio tax extension. The goal is to define deterministic, traceable calculation behavior for Iteration 2 without changing production code during Iteration 1.

The FIFO engine calculates realized gains from BUY and SELL activities and keeps each sale traceable to the acquisition lots it consumes.

This is tax analytics software, not personal tax advice. The design does not introduce jurisdiction-specific tax rates, wash-sale rules, holding-period rules, or similar country-specific treatment.

## Repository Findings

### Activity ordering

`ActivitiesService.getActivities()` already retrieves activities by `date` ascending and adds `id` as a secondary sort key. The FIFO engine should reuse that deterministic ordering:

1. exact activity `date` ascending
2. activity `id` ascending when dates are equal

### Existing performance calculation is not FIFO

Ghostfolio's current portfolio calculator uses an average investment basis for SELL activities. It reduces investment proportionally and calculates sell performance against an average price.

The tax FIFO engine should therefore be a separate tax-domain calculation. It should not replace or modify the existing ROAI performance behavior.

### Use enriched Activity records

The enriched `Activity` object contains source identifiers and transaction values such as:

- `feeInAssetProfileCurrency`
- `feeInBaseCurrency`
- `unitPriceInAssetProfileCurrency`
- `value`
- `valueInBaseCurrency`

The portfolio calculator later converts activities into a smaller `PortfolioOrder` representation that does not retain the activity `id` or full source timestamp. FIFO should therefore operate on enriched `Activity` records before that conversion.

### Stock-split handling

Ghostfolio already adjusts investment activities for stock splits. Activities before a split have quantity multiplied by the split ratio and unit price divided by the same ratio, preserving total value.

FIFO should reuse this existing normalization instead of implementing a second split formula.

### Currency conversion

`ActivitiesService` already calculates transaction-date values in the asset-profile currency and the user's base currency. FIFO should reuse those values where practical.

## Scope

The FIFO algorithm operates on one **lot-matching scope** at a time. Activities from different assets must never be matched together.

The caller is responsible for grouping activities into the correct lot-matching scope before running FIFO.

Whether lots are pooled across accounts is intentionally not decided here because that can depend on later tax-lot requirements and jurisdiction-specific assumptions. The final scope key belongs to the Sep 21 tax-lot design.

## Eligible Activities

Only:

- `BUY`
- `SELL`

participate in FIFO lot matching.

The following do not create or consume acquisition lots:

- `DIVIDEND`
- `FEE`
- `INTEREST`
- `LIABILITY`

A fee attached directly to a BUY or SELL can be allocated during the calculation. A standalone `FEE` activity is not automatically attached to a trade because the current data model does not identify which trade it belongs to.

## Filtering

The initial FIFO implementation should follow Ghostfolio's existing default filtering:

- exclude draft activities
- exclude activities explicitly excluded from analysis
- exclude activities in excluded accounts
- include only BUY and SELL
- do not include synthetic cash activities

The Sep 23 tax-relevant flag/filter can add another layer later without changing the core FIFO algorithm.

## Required Inputs

Each FIFO activity should retain:

- activity `id`
- exact activity `date`
- activity `type`
- asset identity
- `quantity`
- transaction currency
- `unitPriceInAssetProfileCurrency`
- `feeInAssetProfileCurrency`
- `valueInBaseCurrency`
- `feeInBaseCurrency`

Original transaction currency and unit price should also remain available for audit/export use.

## Deterministic Ordering

Process activities by:

1. exact `date` ascending
2. `id` ascending for equal timestamps

Do not rely on database return order or array insertion order.

Example:

```text
2026-01-10T10:00:00Z  BUY   id=0001
2026-01-10T10:00:00Z  BUY   id=0002
2026-01-10T12:00:00Z  SELL  id=0003
```

The SELL consumes lot `0001` before lot `0002`.

## Numeric Precision

Convert relevant numeric inputs to `Big` values at the tax-engine boundary.

Do not round intermediate calculations. Fractional quantities must remain supported because stock splits and some assets can produce non-integer quantities.

Display/export rounding belongs to the Sep 24 export specification.

## Working Acquisition Lot

Each BUY creates one working FIFO lot containing at least:

```text
sourceActivityId
acquiredAt
initialQuantity
remainingQuantity
unitCostAssetCurrency
grossAcquisitionValueAssetCurrency
buyFeeAssetCurrency
grossAcquisitionValueBaseCurrency
buyFeeBaseCurrency
currency
```

`sourceActivityId` points to the original Ghostfolio BUY.

`remainingQuantity` begins equal to `initialQuantity` and decreases as SELL activities consume the lot.

This is an in-memory FIFO structure. Permanent tax-lot persistence is a separate Sep 21 task.

## BUY Processing

For a BUY:

1. validate the activity
2. create a new acquisition lot
3. append it to the end of the open-lot queue
4. do not calculate realized gain

A BUY never consumes an older BUY lot.

## SELL Processing

For a SELL:

```text
quantityToMatch = sell.quantity
```

While `quantityToMatch > 0`:

1. take the oldest open lot
2. compute `matchedQuantity = min(quantityToMatch, lot.remainingQuantity)`
3. create a FIFO match record
4. subtract the matched quantity from the lot
5. subtract the matched quantity from the sale
6. remove the lot when its remaining quantity reaches zero
7. continue with the next oldest lot if needed

Stop when the full sale is matched or no open lots remain.

## Partial-Lot Consumption

Example:

```text
BUY 10
SELL 4
```

The lot remains open with:

```text
remainingQuantity = 6
```

A later SELL consumes those 6 before any newer lot.

## Sale Across Multiple Lots

Example:

```text
BUY 100
BUY 50
SELL 120
```

FIFO matches:

```text
100 from BUY #1
20 from BUY #2
```

BUY #2 remains open with 30.

Each consumption must be returned as a separate trace record.

## FIFO Match Output

Each matched BUY/SELL slice should expose data similar to:

```text
buyActivityId
sellActivityId
buyDate
sellDate
matchedQuantity

grossAcquisitionValueAssetCurrency
grossProceedsAssetCurrency
buyFeeAllocatedAssetCurrency
sellFeeAllocatedAssetCurrency
grossRealizedGainAssetCurrency
realizedGainAfterActivityFeesAssetCurrency

grossAcquisitionValueBaseCurrency
grossProceedsBaseCurrency
buyFeeAllocatedBaseCurrency
sellFeeAllocatedBaseCurrency
grossRealizedGainBaseCurrency
realizedGainAfterActivityFeesBaseCurrency
```

This is calculation output, not necessarily a persisted Prisma model.

## Gross Cost Basis

For one matched slice:

```text
grossAcquisitionValue = matchedQuantity × buyUnitPrice
```

For a SELL spanning multiple lots:

```text
grossCostBasis = sum(grossAcquisitionValue of each match)
```

## Gross Sale Proceeds

For one matched slice:

```text
grossProceeds = matchedQuantity × sellUnitPrice
```

For a fully matched sale:

```text
grossSaleProceeds = sellQuantity × sellUnitPrice
```

## Gross Realized Gain

For each match:

```text
grossRealizedGain = grossProceeds - grossAcquisitionValue
```

For the complete sale:

```text
grossRealizedGainForSale = sum(match.grossRealizedGain)
```

A negative value is a realized loss.

This is an analytics value and should not be labeled as universally "taxable gain."

## Activity-Fee Treatment

Fees should remain visible separately from gross basis/proceeds while also allowing a fee-adjusted analytics result.

### BUY fee allocation

```text
buyFeeAllocated =
    buyFee × matchedQuantity / originalBuyQuantity
```

When the final remaining portion of a BUY lot is consumed, assign any tiny remaining fee-allocation balance to that final match so allocations sum exactly to the original fee.

### SELL fee allocation

```text
sellFeeAllocated =
    sellFee × matchedQuantity / sellQuantity
```

Assign any tiny residual to the final match so allocated SELL fees sum exactly to the original SELL fee.

### Fee-adjusted gain

```text
realizedGainAfterActivityFees =
    (grossProceeds - sellFeeAllocated)
    - (grossAcquisitionValue + buyFeeAllocated)
```

Keep this separate from `grossRealizedGain`.

### Standalone FEE activities

Do not automatically allocate standalone `FEE` activities because the existing model does not link them to a specific trade.

## Currency Behavior

### Asset-profile currency

Primary lot calculations should use:

- `unitPriceInAssetProfileCurrency`
- `feeInAssetProfileCurrency`

This gives a common currency for matching acquisition and sale values for the same asset.

### User base currency

Reuse historical transaction-date values already calculated by Ghostfolio.

For a matched BUY portion:

```text
acquisitionValueBase =
    buy.valueInBaseCurrency
    × matchedQuantity
    / buy.quantity
```

For a matched SELL portion:

```text
proceedsBase =
    sell.valueInBaseCurrency
    × matchedQuantity
    / sell.quantity
```

Fees can be allocated from `feeInBaseCurrency` using the same matched-quantity proportions.

This keeps BUY values tied to the BUY-date exchange rate and SELL values tied to the SELL-date exchange rate.

### Missing FX data

If historical base-currency conversion is unavailable, do not silently assume FX = 1 for tax analytics.

Return the asset-currency result, leave the affected base-currency value unavailable, and return a traceable warning/error for the affected transaction.

## Stock Splits

Reuse Ghostfolio's existing split normalization:

```text
adjustedQuantity =
    originalQuantity × numerator / denominator

adjustedUnitPrice =
    originalUnitPrice × denominator / numerator
```

Total activity value remains unchanged.

Pre-split BUY lots and post-split SELL quantities can then be matched using comparable adjusted quantities.

Do not adjust provider market data a second time.

Always retain the original activity ID for traceability.

## Example 1 — Sale Across Two Lots

```text
BUY #1: 100 @ 10.00, fee 2.00
BUY #2:  50 @ 12.00, fee 1.00
SELL #3: 120 @ 15.00, fee 3.00
```

FIFO consumption:

```text
100 from BUY #1
20 from BUY #2
```

Gross basis:

```text
100 × 10.00 = 1000.00
 20 × 12.00 =  240.00
grossCostBasis = 1240.00
```

Gross proceeds:

```text
120 × 15.00 = 1800.00
```

Gross realized gain:

```text
1800.00 - 1240.00 = 560.00
```

Allocated BUY fees:

```text
BUY #1 = 2.00
BUY #2 = 1.00 × 20 / 50 = 0.40
total = 2.40
```

Allocated SELL fee:

```text
3.00
```

Fee-adjusted gain:

```text
(1800.00 - 3.00) - (1240.00 + 2.40)
= 554.60
```

Remaining lot:

```text
BUY #2 remaining quantity = 30
remaining unallocated BUY fee = 0.60
```

## Example 2 — Partial Lot

```text
BUY: 10 @ 100.00, fee 5.00
SELL: 4 @ 130.00, fee 2.00
```

Results:

```text
gross acquisition value = 400.00
gross proceeds = 520.00
gross realized gain = 120.00

allocated BUY fee = 5.00 × 4 / 10 = 2.00
allocated SELL fee = 2.00

fee-adjusted gain =
    (520.00 - 2.00) - (400.00 + 2.00)
    = 116.00

remaining lot quantity = 6
remaining unallocated BUY fee = 3.00
```

## Example 3 — Stock Split

Original BUY:

```text
10 shares @ 100.00
fee = 5.00
```

After a 2:1 split:

```text
20 shares @ 50.00
```

Later SELL:

```text
5 shares @ 60.00
fee = 1.00
```

FIFO result:

```text
gross acquisition value = 5 × 50.00 = 250.00
gross proceeds = 5 × 60.00 = 300.00
gross realized gain = 50.00

allocated BUY fee = 5.00 × 5 / 20 = 1.25
allocated SELL fee = 1.00

fee-adjusted gain =
    (300.00 - 1.00) - (250.00 + 1.25)
    = 47.75

remaining adjusted shares = 15
```

## Closed Position and New Cycle

When every open lot in the current scope reaches zero, the long position is fully closed.

A later BUY starts a new FIFO cycle. Fully consumed lots remain available in history/output for traceability but cannot be consumed again.

## Invalid and Unsupported Conditions

### Non-positive quantity

A BUY or SELL with quantity <= 0 is invalid FIFO input and must not create or consume a lot.

### Negative unit price or fee

Negative price or fee values are invalid for this engine. The DTO layer already prevents these in normal input, but the engine should validate defensively.

### SELL with insufficient open lots

If a SELL exceeds available open BUY quantity, do not create a negative lot.

Match the valid portion if desired, but record:

```text
unmatchedQuantity
error = INSUFFICIENT_OPEN_LOTS
```

Do not include the unmatched portion as a valid FIFO realized gain.

### SELL before any BUY

Treat as the same insufficient-lot condition.

Ghostfolio's existing performance calculator can represent short positions, but short-sale tax treatment is outside this long-lot FIFO specification.

### Missing base-currency conversion

If asset-currency inputs are valid but historical FX is missing:

- continue asset-currency FIFO
- leave affected base-currency values unavailable
- return a traceable conversion warning/error

## Reconciliation Rules

For a valid long-only scope:

```text
total adjusted BUY quantity
- total successfully matched SELL quantity
= total remaining open-lot quantity
```

For each fully matched SELL:

```text
sum(match.matchedQuantity) = sell.quantity
```

For each fully consumed BUY:

```text
sum(allocated BUY fees) = original BUY fee
```

For each fully matched SELL:

```text
sum(allocated SELL fees) = original SELL fee
```

These invariants should be unit-tested.

## Proposed Sale-Level Result

In addition to lot-level matches, one aggregate result per SELL should contain:

```text
sellActivityId
sellDate
currency

sellQuantity
matchedQuantity
unmatchedQuantity

grossProceeds
grossCostBasis
grossRealizedGain

allocatedBuyFees
sellFee
realizedGainAfterActivityFees

matches[]
errors[]
```

Add base-currency equivalents when conversion data is available.

## Realized vs Unrealized

This FIFO engine calculates realized gain only when a SELL consumes a BUY lot.

Open lots are returned for future matching and traceability. This Sep 17 specification does not calculate unrealized gain.

## Planned Iteration 2 Tests

Use exact expected numeric results for:

- one BUY and one full SELL
- one BUY and a partial SELL
- multiple BUY lots and one SELL spanning lots
- multiple sequential SELL activities
- closed position followed by a new BUY cycle
- zero fees
- non-zero BUY and SELL fees
- fractional quantities
- same timestamp with deterministic ID ordering
- normal stock split
- reverse split
- multiple stock splits
- missing base-currency conversion
- SELL greater than available lots
- SELL before any BUY
- separate assets never matching
- separate lot-matching scopes never matching

Tests must verify numeric results and source-activity traceability, not only successful execution.

## Implementation Boundary — Iteration 2

FIFO should be tax-domain business logic, not a modification of the existing ROAI portfolio calculator.

The ROAI path currently uses average-price behavior and is shared with performance functionality. Changing it to FIFO could alter Arthur's performance-chart behavior.

The Iteration 2 FIFO implementation should instead:

1. obtain enriched activities from existing Ghostfolio services
2. apply existing stock-split normalization
3. filter/group eligible BUY and SELL activities
4. run the FIFO engine
5. return realized-gain matches, aggregate sale results, and remaining lots

A candidate future location is:

`apps/api/src/app/tax/`

This is a recommendation, not a fixed shared-architecture decision. Raniya owns architecture/integration, so the final tax service boundary and shared contract location should be coordinated with her before implementation.

## Likely Relevant Files in Iteration 2

- `apps/api/src/app/activities/activities.service.ts`
- `apps/api/src/services/asset-profile-split/asset-profile-split.helper.ts`
- `apps/api/src/services/exchange-rate-data/exchange-rate-data.service.ts`
- `libs/common/src/lib/interfaces/activities.interface.ts`

New tax-specific service, interface, and test files will also be needed.

No change to the existing ROAI performance formulas is required for FIFO tax calculation.

## Acceptance Criteria

The FIFO specification is complete when:

- only eligible BUY/SELL activities participate
- deterministic ordering uses full activity date then activity ID
- each BUY creates one acquisition lot
- each SELL consumes the oldest available lot first
- partial lots keep the correct remainder
- one SELL can consume multiple lots
- every match references its BUY and SELL source activities
- gross cost basis and gross proceeds are defined
- gross realized gain is defined
- attached BUY/SELL fees are allocated deterministically
- fee-adjusted gain remains separate from gross gain
- asset-profile and base-currency behavior are defined
- missing FX behavior is defined
- stock splits reuse Ghostfolio's existing normalization
- insufficient holdings are reported instead of creating negative lots
- short-sale tax handling is outside the current scope
- open lots remain distinct from realized results
- reconciliation invariants are defined
- Iteration 2 numeric tests are identified
- no jurisdiction-specific tax rules are invented
- existing portfolio-performance logic remains unchanged

## Open Questions for Later Iteration 1 Tasks

### Sep 21 — Tax-lot data model

Decide:

- permanent lot schema
- final account/lot pooling scope
- which results are stored versus recalculated
- open/closed lot lifecycle fields
- relationships among source activities, lots, and sale matches

### Sep 22 — Yearly summary

Define how realized FIFO results are grouped by year.

### Sep 23 — Tax-relevant filtering

Define the explicit tax-relevant flag and its interaction with existing draft/excluded filters.

### Sep 24 — Export

Define output precision, display/export rounding, and FIFO trace fields for CSV/PDF.

## Out of Scope

- average-cost method
- permanent tax-lot persistence
- yearly tax-summary schema
- tax-relevant flag implementation
- React/UI work
- jurisdiction-specific tax rates
- holding-period classifications
- wash-sale/superficial-loss rules
- short-sale tax matching
- undefined account pooling rules
- corporate actions beyond Ghostfolio's existing stock-split support

## Next Task

The next scheduled tax task is September 18:

**Specify the capital-gains average-cost method.**

That specification should reuse the same filtering, precision, currency, split, validation, and traceability principles where applicable while replacing FIFO lot consumption with a pooled average-cost basis.
