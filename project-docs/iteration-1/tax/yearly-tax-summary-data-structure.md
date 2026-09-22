# Tax Metrics — Yearly Tax Summary Data Structure

**Owner:** Tharun Swaminathan
**Iteration:** 1 — Design & Data Modelling
**Date:** September 22, 2026

## Objective

This document defines the yearly tax summary data structure for the Ghostfolio
tax extension.

The goal is to combine dividend/withholding information with realized
capital-gain results from FIFO or average cost while keeping every yearly total
traceable to the source Ghostfolio activities that produced it.

This is Iteration 1 design work only. No yearly-summary backend service, API
endpoint, Prisma table, export generator, or frontend component is implemented
as part of this task.

The yearly summary is tax analytics, not personal tax advice. The design avoids
jurisdiction-specific filing rules, tax rates, holding-period classifications,
wash-sale rules, and similar legal assumptions.

## Relationship to Earlier Tax Designs

The Sep 22 design builds directly on the previous tax specifications.

### Sep 16 — Withholding tax

Dividend activities keep these concepts separate:

```text
gross dividend
withholding amount
withholding rate
net dividend
activity fee
```

A null withholding amount means the withholding information is unknown.

A zero withholding amount means the system knows that no withholding was
applied.

The yearly summary must preserve that distinction.

### Sep 17 — FIFO capital gains

FIFO produces deterministic realized-gain records from ordered BUY and SELL
activities while preserving traceability to the acquisition lots consumed by a
SELL.

### Sep 18 — Average-cost capital gains

Average cost produces realized-gain records by removing a proportional share of
the pooled cost basis.

It does not consume specific acquisition lots.

### Sep 21 — Tax-lot tracking model

FIFO and average cost both produce a common sale-level
`TaxRealizedGainRecord`.

Tax lots, FIFO matches, average-cost pool states, realized-gain records, and
yearly summaries are derived calculation data rather than authoritative
persistent database state.

The yearly summary should consume these common realized-gain records rather than
reimplement FIFO or average-cost logic.

## Repository Findings

### Ghostfolio already has a user base currency

`UserSettings` includes:

```text
baseCurrency
```

Yearly portfolio totals are already commonly expressed in the user's base
currency.

The yearly tax summary should follow the same concept and identify the base
currency used to calculate its aggregate totals.

### Existing portfolio summaries are result objects

Ghostfolio already exposes calculated summary interfaces such as
`PortfolioSummary`.

These summary objects contain aggregated values derived from underlying
activities and portfolio calculations.

The yearly tax summary should follow the same pattern: it is a result contract,
not a new authoritative transaction model.

### Existing dividend handling converts values by transaction date

Current portfolio logic converts dividend values to the user's base currency
using the activity date.

This is useful behavior to reuse, but the tax feature needs stricter missing-FX
handling than some existing portfolio views because a tax total must not silently
treat an unavailable historical conversion as a valid zero.

### Existing shared interfaces live under `libs/common`

Cross-layer contracts are generally defined under:

```text
libs/common/src/lib/interfaces/
```

If the yearly tax summary becomes a shared backend/frontend API contract in
Iteration 2, it should follow the team's agreed shared-interface convention.

The exact file placement should be coordinated with Raniya because she owns the
shared architecture/integration area.

## Alignment With the Project Class Diagrams

The class diagrams supplied for the project show a consistent architecture:

```text
domain/source data
      |
      v
calculator/service
      |
      v
result object
      |
      v
API / dashboard
```

The tax feature should follow the same pattern.

### Tax flow

Conceptually:

```text
Ghostfolio activities
        |
        v
TaxCalculator
FIFO / AVERAGE_COST
        |
        v
RealizedGain[]
        |
        +------------------+
        |                  |
        v                  v
DividendRecord[]    Yearly aggregation
        \                  /
         \                /
          v              v
          YearlyTaxSummary
                 |
                 +--> detailed tax views
                 +--> TaxExport
                 +--> TaxApi
                         |
                         v
                  TaxSummaryCard
                         |
                         v
                 DashboardOverview
```

The yearly-summary layer is therefore an aggregator over already calculated tax
records.

It must not become another FIFO or average-cost calculator.

## Result-Object and Source-Immutability Design

`YearlyTaxSummary` is a derived result object.

Creating a yearly summary must not modify:

- Ghostfolio `Order` activities
- source dividend values
- source withholding values
- FIFO source lots
- average-cost transaction history
- user portfolio holdings

The summary is rebuilt from validated source activities and tax calculation
results for the requested year and cost-basis method.

This is consistent with the architecture used by the risk what-if flow, where a
simulation works on derived state and returns a result without changing the real
portfolio.

## Persistence Decision

The yearly summary should not be persisted as an authoritative Prisma record in
the initial implementation.

Persisted source data remains:

```text
Order activities
withholdingTax
future tax-relevant source metadata
AssetProfileSplit records
user settings
```

Derived yearly data includes:

```text
DividendRecord
TaxRealizedGainRecord
YearlyTaxSummary
```

The summary can be recalculated when needed.

A cache may be introduced later if actual performance measurements justify it,
but a cache must remain disposable and reproducible from source data.

## Yearly Summary Request Context

A yearly summary calculation needs at least:

```text
year
cost-basis method
user
base currency
```

A conceptual request shape is:

```ts
export interface YearlyTaxSummaryRequest {
  year: number;
  method: TaxCalculationMethod;
}
```

The authenticated user context supplies the user identity.

The user's current base currency can be resolved from existing user settings.

The exact HTTP route/query DTO is not fixed in this document because that is a
shared API decision.

## Request Validation

The service should validate the request before beginning tax aggregation.

### Year

`year` must be an integer identifying the calendar year to summarize.

A year with no eligible activity is valid and returns an empty but complete
summary.

The design does not impose arbitrary jurisdiction-specific minimum or maximum
tax years.

### Cost-Basis Method

The supported methods are:

```text
FIFO
AVERAGE_COST
```

Unsupported method values are invalid.

### User

The summary operates only on activities belonging to the authenticated or
authorized user context.

Tax data from different users must never be combined.

## Calendar-Year Boundary

The yearly summary should use one deterministic calendar-year boundary.

Recommended project behavior:

```text
start = January 1 00:00:00.000 UTC
end   = December 31 23:59:59.999 UTC
```

Using UTC avoids results changing because the API server runs in a different
local timezone.

This is an engineering convention for deterministic analytics, not a statement
about jurisdiction-specific tax residency or filing rules.

If the team already standardizes activity-year boundaries differently in the
shared API architecture, this convention should be aligned before
implementation.

## Critical Rule — Do Not Filter Acquisition History to the Selected Year

Capital gains for a selected year can depend on acquisitions from earlier
years.

Example:

```text
2024 BUY
2025 BUY
2026 SELL
```

A 2026 FIFO or average-cost result may require both earlier BUYs.

Therefore the yearly-summary service must **not** do this:

```text
load only BUY/SELL activities dated in 2026
then calculate gains
```

That would produce incorrect cost basis.

Instead:

```text
load eligible investment history from the beginning
through the end of the selected year

run the selected cost-basis method over that history

then select realized-gain records whose realizedAt year
matches the requested year
```

This is one of the most important requirements in the Sep 22 design.

## Future Transactions

Activities after the end of the selected year are not required to calculate
realized gains for that year.

The tax calculation may stop after the selected year's end once all earlier
history has been processed.

This prevents later transactions from being treated as inputs to an earlier
year's realized-gain summary.

## Realized-Gain Year Assignment

A realized-gain record belongs to the year of the SELL/disposal that realizes
the gain.

Conceptually:

```text
summaryYear = year(realizedAt)
```

The acquisition date does not decide the yearly grouping.

Example:

```text
BUY 2024
SELL 2026
```

The realized-gain record is included in the 2026 summary.

This is a project analytics grouping convention and should not be described as a
jurisdiction-specific filing rule.

## Dividend Year Assignment

A dividend record belongs to the year of its source DIVIDEND activity date.

Conceptually:

```text
summaryYear = year(dividendActivity.date)
```

The same deterministic UTC year-boundary convention should be used.

## Source Filtering

The yearly summary should reuse the same source filtering rules as the tax
calculation pipeline.

Until the Sep 23 tax-relevant specification is finalized, the design assumes:

- draft activities are excluded
- activities explicitly excluded from analysis are excluded
- activities in excluded accounts are excluded
- synthetic cash activities do not become tax records
- BUY/SELL activities feed the cost-basis engine
- DIVIDEND activities feed dividend records

The Sep 23 tax-relevant rule will become an additional input filter without
changing the summary data structure.

## Calculation Scope vs Yearly Aggregation Scope

FIFO and average cost calculate cost basis independently per tax scope.

The Sep 21 default calculation scope is:

```text
userId + accountId + symbolProfileId
```

The yearly summary then aggregates the realized records produced by all eligible
scopes belonging to the user.

Therefore:

```text
cost basis calculation:
per account + asset scope

yearly summary:
portfolio-level aggregation of resulting records
```

This prevents cross-scope cost-basis matching while still providing one yearly
portfolio tax summary.

## Activities Without an Account

Activities with:

```text
accountId = null
```

belong to the separate unassigned `NO_ACCOUNT` tax scope defined in the Sep 21
design.

Their valid tax records are still included in the portfolio-level yearly
summary.

The summary detail should preserve the null account reference for traceability.

## Cost-Basis Method Isolation

A `YearlyTaxSummary` represents exactly one cost-basis method.

It must contain:

```text
method = FIFO
```

or:

```text
method = AVERAGE_COST
```

A single yearly result must never mix records calculated under both methods.

The same source activities may be summarized twice under different methods, but
those are separate summary results.

## Proposed Yearly Summary Model

A proposed calculation-domain model is:

```ts
export interface YearlyTaxSummary {
  year: number;
  method: TaxCalculationMethod;

  baseCurrency: string;
  calculatedAt: Date;

  grossDividendsBaseCurrency: Big | null;
  totalWithholdingTaxBaseCurrency: Big | null;
  netDividendsBaseCurrency: Big | null;

  grossProceedsBaseCurrency: Big | null;
  grossCostBasisBaseCurrency: Big | null;

  grossRealizedGainBaseCurrency: Big | null;
  totalActivityFeesBaseCurrency: Big | null;
  realizedGainAfterActivityFeesBaseCurrency: Big | null;

  dividendCount: number;
  disposalCount: number;

  dividendRecords: DividendRecord[];
  realizedGains: TaxRealizedGainRecord[];

  isComplete: boolean;

  warnings: TaxCalculationWarning[];
  errors: TaxCalculationError[];
}
```

The API serialization of `Big` values should follow the team's shared numeric
contract.

## Why Aggregate Values Are Nullable

A yearly total should not silently become a partial number.

Examples:

- a dividend has unknown withholding
- a dividend cannot be converted to base currency
- a SELL has missing base-currency conversion
- a SELL cannot be fully matched because acquisition history is incomplete

In these cases a numeric aggregate may look complete when it is not.

The affected aggregate should therefore be nullable.

Example:

```text
totalWithholdingTaxBaseCurrency = null
```

means:

```text
a complete yearly withholding total cannot be established
```

It does **not** mean:

```text
zero withholding tax
```

## Zero vs Null in Yearly Totals

The distinction is:

```text
0
```

means the complete calculation is known and the result is zero.

```text
null
```

means the complete result is unavailable.

This follows the same principle already used in the withholding design.

## Completeness

`isComplete` indicates whether all required values for the requested yearly
summary could be calculated.

A summary is complete when:

- all included realized disposals are valid for the selected method
- required base-currency conversions are available
- all included dividend withholding information required by aggregate fields is
  known
- no calculation error prevents a complete aggregate

Warnings that do not invalidate totals do not necessarily make the result
incomplete.

Errors that prevent a trustworthy total do.

## Empty-Year Behavior

A year with no eligible dividend or realized-gain records is valid.

Return:

```text
dividendCount = 0
disposalCount = 0

grossDividendsBaseCurrency = 0
totalWithholdingTaxBaseCurrency = 0
netDividendsBaseCurrency = 0

grossProceedsBaseCurrency = 0
grossCostBasisBaseCurrency = 0
grossRealizedGainBaseCurrency = 0
totalActivityFeesBaseCurrency = 0
realizedGainAfterActivityFeesBaseCurrency = 0

isComplete = true
```

with empty detail arrays and no error.

## Dividend Record

The yearly summary should use a derived `DividendRecord` rather than embedding
raw `Order` rows directly.

A proposed shape is:

```ts
export interface DividendRecord {
  sourceActivityId: string;

  accountId: string | null;
  symbolProfileId: string;

  date: Date;

  transactionCurrency: string;
  baseCurrency: string;

  grossDividendTransactionCurrency: Big;

  withholdingTaxTransactionCurrency: Big | null;
  withholdingTaxRate: Big | null;
  netDividendTransactionCurrency: Big | null;

  activityFeeTransactionCurrency: Big;

  grossDividendBaseCurrency: Big | null;
  withholdingTaxBaseCurrency: Big | null;
  netDividendBaseCurrency: Big | null;
  activityFeeBaseCurrency: Big | null;

  warnings: TaxCalculationWarning[];
  errors: TaxCalculationError[];
}
```

## Dividend Gross Value

For a normal dividend activity:

```text
grossDividend =
    quantity × unitPrice
```

This follows the Sep 16 withholding design.

## Dividend Withholding

The stored transaction withholding amount is authoritative.

If:

```text
withholdingTax = null
```

then:

```text
withholdingTaxRate = null
netDividend = null
```

for tax-reporting purposes.

The yearly summary must not convert that null to zero.

## Dividend Net Value

When withholding is known:

```text
netDividend =
    grossDividend - withholdingTax
```

The general activity fee remains separate.

If a cash-effect value is later required:

```text
netCashAmount =
    netDividend - activityFee
```

That should not replace the tax-specific `netDividend` field.

## Dividend Activity Fees

Dividend activity fees should remain distinct from withholding tax.

The yearly summary may expose them in detail records, but:

```text
totalWithholdingTax
```

must never include activity fees.

This keeps tax withholding and brokerage/service fees semantically separate.

## Gross Dividend Aggregate

When every included dividend has a valid base-currency conversion:

```text
grossDividendsBaseCurrency =
    sum(record.grossDividendBaseCurrency)
```

If any required dividend base-currency conversion is unavailable:

```text
grossDividendsBaseCurrency = null
isComplete = false
```

and a conversion diagnostic is included.

## Withholding Aggregate

A complete yearly withholding total requires both:

- known withholding information for every included dividend
- available historical base-currency conversion for each withholding amount

Then:

```text
totalWithholdingTaxBaseCurrency =
    sum(record.withholdingTaxBaseCurrency)
```

If one included dividend has unknown withholding:

```text
totalWithholdingTaxBaseCurrency = null
```

rather than summing only known values and presenting a misleading partial
total.

## Net Dividend Aggregate

A complete net-dividend total requires each included dividend to have:

- known withholding
- available gross base-currency conversion
- available withholding base-currency conversion

Then:

```text
netDividendsBaseCurrency =
    sum(record.netDividendBaseCurrency)
```

Otherwise the yearly aggregate is null.

## Realized-Gain Detail Source

The yearly summary consumes the common:

```text
TaxRealizedGainRecord[]
```

defined by the Sep 21 data model.

The summary does not need to know whether each record came from:

- FIFO lot matching
- average-cost pool allocation

The `method` on the calculation context already identifies the selected
cost-basis strategy.

## Realized-Gain Filter

After running the cost-basis calculation through the selected year end:

```text
yearRealizedGains =
    realizedGains.filter(
      year(record.realizedAt) === requestedYear
    )
```

The summary then aggregates only those records.

## Gross Proceeds Aggregate

For complete base-currency records:

```text
grossProceedsBaseCurrency =
    sum(record.grossProceedsBaseCurrency)
```

If an included realized record lacks a required base-currency proceeds value,
the yearly aggregate becomes null.

## Gross Cost-Basis Aggregate

For complete base-currency records:

```text
grossCostBasisBaseCurrency =
    sum(record.grossCostBasisBaseCurrency)
```

This value comes from the selected cost-basis method.

The summary does not recalculate it.

## Gross Realized-Gain Aggregate

For complete base-currency records:

```text
grossRealizedGainBaseCurrency =
    sum(record.grossRealizedGainBaseCurrency)
```

This may be positive, zero, or negative.

Negative yearly realized gain is valid and represents a net realized loss in the
project analytics.

## Activity-Fee Aggregate

For complete records:

```text
totalActivityFeesBaseCurrency =
    sum(record.activityFeesBaseCurrency)
```

This aggregate contains the BUY/SELL fees allocated by the selected cost-basis
method.

It does not include dividend withholding tax.

It also does not automatically include standalone `FEE` activities because the
earlier tax specifications intentionally do not attach standalone fees to trades
without an explicit source relationship.

## Fee-Adjusted Realized-Gain Aggregate

For complete records:

```text
realizedGainAfterActivityFeesBaseCurrency =
    sum(record.realizedGainAfterActivityFeesBaseCurrency)
```

This stays separate from:

```text
grossRealizedGainBaseCurrency
```

The product must not imply that either value is the legally taxable amount for
every jurisdiction.

## Dividend Count

```text
dividendCount =
    number of included DividendRecord items
```

This counts source DIVIDEND activities, not unique assets.

## Disposal Count

```text
disposalCount =
    number of realized SELL records included in the year
```

A FIFO SELL that consumes three lots still counts as one disposal.

Lot-match count may be shown separately in a detailed FIFO view but should not
inflate yearly disposal count.

## Traceability

Every aggregate must be reproducible from the detail records returned with the
summary.

For dividends:

```text
YearlyTaxSummary
    -> DividendRecord
    -> sourceActivityId
    -> Order
```

For realized gains:

```text
YearlyTaxSummary
    -> TaxRealizedGainRecord
    -> sellActivityId
    -> Order
```

FIFO records may additionally trace through:

```text
traceIds
    -> TaxLotMatch
    -> BUY Order + SELL Order
```

Average-cost records trace through their calculation events.

## Aggregate Reconciliation Rules

For a complete summary:

```text
grossDividendsBaseCurrency
=
sum(dividendRecords.grossDividendBaseCurrency)
```

```text
totalWithholdingTaxBaseCurrency
=
sum(dividendRecords.withholdingTaxBaseCurrency)
```

```text
netDividendsBaseCurrency
=
sum(dividendRecords.netDividendBaseCurrency)
```

and:

```text
grossProceedsBaseCurrency
=
sum(realizedGains.grossProceedsBaseCurrency)
```

```text
grossCostBasisBaseCurrency
=
sum(realizedGains.grossCostBasisBaseCurrency)
```

```text
grossRealizedGainBaseCurrency
=
grossProceedsBaseCurrency
- grossCostBasisBaseCurrency
```

as well as:

```text
grossRealizedGainBaseCurrency
=
sum(realizedGains.grossRealizedGainBaseCurrency)
```

These identities should be asserted in Iteration 2 tests.

## Dividend Reconciliation Rule

For each dividend with known withholding:

```text
grossDividend
- withholdingTax
= netDividend
```

The same relationship should hold in transaction currency and base currency
when historical conversion is available.

## Realized-Gain Reconciliation Rule

For each valid realized record:

```text
grossProceeds
- grossCostBasis
= grossRealizedGain
```

and:

```text
grossRealizedGain
- activityFees
= realizedGainAfterActivityFees
```

when `activityFees` represents the combined allocated acquisition and disposal
fees defined by the selected cost-basis method.

## Warning and Error Propagation

The yearly summary should preserve diagnostics from its source calculations.

Diagnostics can originate from:

- dividend conversion
- withholding completeness
- FIFO calculation
- average-cost calculation
- source validation

The yearly aggregator should not silently discard them.

## Proposed Summary-Level Warning Codes

Examples include:

```text
UNKNOWN_DIVIDEND_WITHHOLDING
MISSING_DIVIDEND_BASE_CURRENCY_CONVERSION
MISSING_REALIZED_GAIN_BASE_CURRENCY_CONVERSION
PARTIAL_REALIZED_GAIN_RESULT
```

These are proposed tax-domain codes.

The exact shared error/warning contract should follow the team's API convention.

## Existing Calculation Error Codes

The yearly summary may propagate previously defined codes such as:

```text
INSUFFICIENT_OPEN_LOTS
INSUFFICIENT_POOL_QUANTITY
INVALID_QUANTITY
INVALID_UNIT_PRICE
INVALID_FEE
MISSING_BASE_CURRENCY_CONVERSION
```

The yearly summary should not rename an underlying error merely because it is
being aggregated.

## Method-Specific Trace Details

The summary's common aggregate contract should stay method-independent.

Detailed views may still use method-specific trace data.

FIFO:

```text
TaxLot[]
TaxLotMatch[]
```

Average cost:

```text
AverageCostEvent[]
AverageCostPool
```

These details do not need to be duplicated inside every yearly summary record if
the tax calculation result already contains them.

## Dashboard Integration

The unified-dashboard class diagram contains a compact:

```text
TaxSummaryCard
+ year
+ totalRealizedGain
+ totalWithholdingTax
```

This should be treated as a projection of the full yearly summary, not as the
tax-domain model itself.

The dashboard should not calculate tax values.

Conceptually:

```text
YearlyTaxSummary
      |
      v
TaxApi
      |
      v
TaxSummaryCard
```

## Recommended Dashboard Mapping

To avoid ambiguity, the dashboard's:

```text
totalRealizedGain
```

should map to:

```text
grossRealizedGainBaseCurrency
```

for the selected cost-basis method.

This is the neutral gross analytics value already defined by the tax engine.

If the team wants the dashboard to show fee-adjusted gain instead, the dashboard
field should be explicitly renamed or documented rather than silently changing
its meaning.

The dashboard's:

```text
totalWithholdingTax
```

maps to:

```text
totalWithholdingTaxBaseCurrency
```

## Dashboard Nullability Concern

The current class diagram shows dashboard values as simple numbers.

The tax model requires a way to represent incomplete totals.

For example, if one dividend has:

```text
withholdingTax = null
```

then a complete yearly withholding total is unknown.

Therefore the shared dashboard/API contract should support either:

```text
number | null
```

or a separate completeness/status field.

The tax domain should not replace unknown values with zero just to satisfy a
non-null dashboard field.

This is a shared-contract point that should be coordinated with Raniya before
implementation.

## Tax API Boundary

The unified-dashboard diagram expects:

```text
TaxApi.getYearlySummary(): YearlyTaxSummary
```

The tax feature can support this concept while keeping the exact controller
signature open for the shared architecture decision.

Conceptually:

```ts
getYearlySummary({
  year,
  method
}): Promise<YearlyTaxSummary>
```

The authenticated request context provides the user.

The user's current base currency is resolved from settings.

## Tax API Response Responsibilities

The tax API should return an already calculated result.

The frontend should not:

- rebuild FIFO lots
- recalculate average cost
- convert transaction currencies
- derive yearly tax totals
- reinterpret null withholding as zero

The frontend may format and present the returned values.

## Dashboard Ownership Boundary

The tax feature owns the `YearlyTaxSummary` data required to support the tax
card.

The unified-dashboard implementation remains Raniya's area.

The tax work should not directly modify `DashboardOverview` or
`TaxSummaryCard` without coordination.

The Sep 22 deliverable should document the required tax output contract so
Raniya can consume it later.

## Export Integration

The class diagram shows `TaxExport` consuming yearly tax information.

The Sep 24 export feature should consume:

```text
YearlyTaxSummary
DividendRecord[]
TaxRealizedGainRecord[]
```

rather than recalculating cost basis.

This guarantees that on-screen totals and exported totals are based on the same
calculation result.

## Summary vs Export Detail

The yearly summary provides the common aggregate and source detail needed by
export.

CSV/PDF generation is responsible for presentation and formatting only.

Export-specific decisions such as:

- column order
- number of decimal places
- display rounding
- page layout
- section headings

remain Sep 24 work.

## No Cross-Feature Chart Dependency

The yearly tax summary does not depend on Arthur's chart-series structures.

The charts feature uses result types such as `ChartSeriesResponse` and
`SeriesPoint`.

Tax should follow the same result-object architectural pattern but should not
reuse chart DTOs for tax totals.

This keeps feature ownership and domain boundaries clear.

## No Risk-Calculation Dependency

The yearly tax summary also does not depend on Sesha's health-score rules or
what-if calculations.

The risk diagrams are useful as architecture references because they separate
source data from derived results.

The tax feature should use the same separation without creating runtime coupling
between tax and risk domains.

## Worked Example — Cross-Year Acquisition

Assume base currency is USD.

Activities:

```text
2025-06-01
BUY 10 shares @ 100.00
fee = 0

2026-02-01
BUY 10 shares @ 200.00
fee = 0

2026-06-01
SELL 10 shares @ 300.00
fee = 0

2026-09-01
DIVIDEND
quantity = 5
unitPrice = 2.00
withholdingTax = 1.50
fee = 0
```

All values are already in USD for this example.

### 2026 FIFO

FIFO uses the 2025 acquisition first.

```text
gross proceeds =
10 × 300.00
= 3000.00
```

```text
gross cost basis =
10 × 100.00
= 1000.00
```

```text
gross realized gain =
3000.00 - 1000.00
= 2000.00
```

Dividend:

```text
gross dividend =
5 × 2.00
= 10.00
```

```text
withholding =
1.50
```

```text
net dividend =
10.00 - 1.50
= 8.50
```

The 2026 FIFO summary contains:

```text
year = 2026
method = FIFO
baseCurrency = USD

grossDividendsBaseCurrency = 10.00
totalWithholdingTaxBaseCurrency = 1.50
netDividendsBaseCurrency = 8.50

grossProceedsBaseCurrency = 3000.00
grossCostBasisBaseCurrency = 1000.00
grossRealizedGainBaseCurrency = 2000.00

dividendCount = 1
disposalCount = 1

isComplete = true
```

The 2025 BUY is not displayed as a 2026 transaction, but it is still required
as calculation history.

## Worked Example — Same History Under Average Cost

Using the same activities:

Before the 2026 SELL, the average-cost pool contains:

```text
quantity = 20

gross cost =
1000.00 + 2000.00
= 3000.00

average unit cost =
3000.00 / 20
= 150.00
```

Selling 10 shares allocates:

```text
gross cost basis =
10 × 150.00
= 1500.00
```

Gross realized gain:

```text
3000.00 - 1500.00
= 1500.00
```

The dividend values are unchanged.

Therefore the 2026 average-cost summary contains:

```text
year = 2026
method = AVERAGE_COST

grossDividendsBaseCurrency = 10.00
totalWithholdingTaxBaseCurrency = 1.50
netDividendsBaseCurrency = 8.50

grossProceedsBaseCurrency = 3000.00
grossCostBasisBaseCurrency = 1500.00
grossRealizedGainBaseCurrency = 1500.00
```

This demonstrates why the yearly summary must identify the selected cost-basis
method.

## Worked Example — Unknown Withholding

Dividend:

```text
grossDividendBaseCurrency = 100.00
withholdingTax = null
```

The record can still show:

```text
grossDividendBaseCurrency = 100.00
```

but:

```text
withholdingTaxBaseCurrency = null
netDividendBaseCurrency = null
```

For the yearly summary:

```text
grossDividendsBaseCurrency = 100.00
totalWithholdingTaxBaseCurrency = null
netDividendsBaseCurrency = null
isComplete = false
```

and a diagnostic should identify the source dividend with unknown withholding.

The system must not return:

```text
totalWithholdingTaxBaseCurrency = 0
```

for this case.

## Worked Example — Empty Year

If a user has portfolio history but no dividend or realized SELL activity in
2023:

```text
year = 2023
method = FIFO

grossDividendsBaseCurrency = 0
totalWithholdingTaxBaseCurrency = 0
netDividendsBaseCurrency = 0

grossProceedsBaseCurrency = 0
grossCostBasisBaseCurrency = 0
grossRealizedGainBaseCurrency = 0
totalActivityFeesBaseCurrency = 0
realizedGainAfterActivityFeesBaseCurrency = 0

dividendCount = 0
disposalCount = 0

dividendRecords = []
realizedGains = []

isComplete = true
warnings = []
errors = []
```

An empty year is not an error.

## Invalid/Incomplete Realized-Gain Example

Suppose a 2026 SELL exceeds the available acquisition quantity and FIFO returns:

```text
INSUFFICIENT_OPEN_LOTS
```

The yearly summary should include the calculation error and mark:

```text
isComplete = false
```

The aggregate realized-gain fields that would otherwise appear complete should
be null rather than silently excluding the unsupported quantity.

The valid trace detail may still be available for diagnosis.

## Precision

Tax calculations should keep using arbitrary-precision `Big` values internally.

The yearly aggregator should sum `Big` values.

It should not convert each line item to a display-rounded JavaScript number
before summing.

Example of what **not** to do:

```text
round each realized gain to two decimals
then sum
```

Instead:

```text
sum full-precision values
then apply display/export formatting at the boundary
```

The Sep 24 export task will define presentation rounding.

## Currency Rules

The yearly summary uses one base currency for aggregate totals.

That currency comes from the user's tax calculation context, normally the user's
current Ghostfolio base currency.

Source detail records preserve their original transaction currency.

Historical conversions use the transaction date.

Therefore:

```text
BUY basis -> BUY-date historical conversion
SELL proceeds -> SELL-date historical conversion
dividend -> DIVIDEND-date historical conversion
withholding -> DIVIDEND-date historical conversion
```

The yearly summary simply aggregates the resulting base-currency values.

## Base Currency Changes

Because yearly summaries are derived rather than persisted, changing the user's
base currency allows the summary to be recalculated in the newly selected
currency.

The summary response must include:

```text
baseCurrency
```

so consumers know which currency its totals represent.

## Missing FX Rule

Missing historical FX must not be converted to:

```text
0
```

or:

```text
1
```

for tax analytics.

If an aggregate depends on a missing conversion:

- preserve valid source-currency detail
- set the affected base-currency aggregate to null
- add a diagnostic
- mark the summary incomplete when the missing value prevents a complete total

## Loss Handling

Realized losses are represented as negative gain values.

Example:

```text
grossProceeds = 800
grossCostBasis = 1000

grossRealizedGain = -200
```

Yearly aggregation includes the negative value.

Do not clamp realized gain to zero.

## Multiple Accounts

Cost basis is calculated independently per account/asset scope.

The resulting realized records may then be summed into one yearly portfolio
summary.

The detail record keeps:

```text
accountId
```

through its calculation scope so the user can trace the aggregate back to the
account.

## Multiple Assets

Different assets never share cost-basis state.

Their realized records can still be aggregated into the same yearly base
currency total after each asset's cost basis has been calculated independently.

## Duplicate Protection

A source SELL must produce at most one common sale-level
`TaxRealizedGainRecord` for the selected calculation method.

FIFO may create several lot-match traces under that record.

The yearly summary counts and aggregates the sale-level record once.

This prevents a FIFO sale spanning multiple lots from being double-counted.

## Summary Determinism

The same:

```text
source activities through year end
tax-relevant filtering
stock-split data
base currency
cost-basis method
tax scope rule
```

must produce the same yearly summary.

The summary should include:

```text
calculatedAt
```

as metadata, but `calculatedAt` does not change the financial result.

## Proposed Iteration 2 Service Boundary

A dedicated tax yearly-summary service is recommended.

Conceptually:

```text
apps/api/src/app/tax/
  yearly-tax-summary.service.ts
```

This path is a recommendation only.

The service would depend on tax-domain calculation services rather than the
frontend or dashboard layer.

## Proposed Service Responsibility

Conceptually:

```ts
getYearlySummary({
  userId,
  year,
  method
}): Promise<YearlyTaxSummary>
```

Responsibilities:

1. resolve the user's base currency
2. load eligible source activity history through selected year end
3. build dividend records for selected-year DIVIDEND activities
4. run the selected capital-gains method over required history
5. filter realized records to selected year
6. aggregate yearly totals using `Big`
7. reconcile aggregate and detail values
8. collect warnings/errors
9. return one result object

## Suggested Shared Interfaces

Potential shared contracts include:

```text
YearlyTaxSummary
DividendRecord
TaxCalculationMethod
TaxCalculationWarning
TaxCalculationError
```

Some of these already conceptually exist in earlier tax designs.

If they become public API contracts, their exact shared location should be
coordinated with Raniya before implementation.

## Planned Iteration 2 Tests

The yearly-summary implementation should include exact numeric assertions for:

- empty year
- one dividend with zero withholding
- one dividend with positive withholding
- dividend with unknown withholding
- multiple dividends in one year
- dividend in another year excluded
- one realized gain in selected year
- realized loss in selected year
- multiple realized gains across assets
- multiple realized gains across accounts
- one SELL consuming multiple FIFO lots counted once
- prior-year BUY required for current-year FIFO result
- prior-year BUY required for current-year average-cost result
- FIFO and average-cost producing different yearly gains
- method identifier returned correctly
- full-close and later new-cycle transactions
- activity fees included without mixing with withholding
- missing dividend FX
- missing realized-gain FX
- insufficient FIFO lots
- insufficient average-cost pool
- null-account activity included through NO_ACCOUNT scope
- exact year-boundary activity handling
- fractional quantities
- aggregate totals exactly reconciling to detail records
- deterministic repeated calculation

Tests must verify expected numbers, not only successful execution.

## Acceptance Criteria

The Sep 22 yearly-summary design is complete when:

- summary request inputs are defined
- cost-basis method is included
- base currency is included
- selected-year boundaries are deterministic
- prior-year acquisition history is preserved for cost-basis calculation
- future-year transactions are not required
- realized-gain year assignment is defined
- dividend year assignment is defined
- source filtering behavior is defined
- portfolio-level aggregation over tax scopes is defined
- dividend detail structure is defined
- gross, withholding, and net dividends stay separate
- null withholding remains different from zero
- realized-gain detail source is defined
- gross proceeds and cost-basis totals are defined
- gross and fee-adjusted gain stay separate
- dividend and disposal counts are defined
- aggregate reconciliation rules are defined
- traceability to source activities is preserved
- completeness and null aggregate behavior are defined
- warnings/errors are propagated
- empty-year behavior is defined
- missing historical FX behavior is defined
- negative realized gains are supported
- duplicate FIFO lot-match counting is prevented
- dashboard integration is documented
- export integration is documented
- the summary remains derived rather than persisted
- Iteration 2 tests are identified
- no jurisdiction-specific tax rule is invented

## Final Design Decisions

The Sep 22 design uses these decisions:

```text
Summary type:
derived result object, not persisted

Summary method:
exactly one of FIFO or AVERAGE_COST

Summary currency:
user base currency, included in result metadata

Capital-gain calculation history:
all eligible history through selected year end

Capital-gain yearly filter:
SELL realizedAt year

Dividend yearly filter:
DIVIDEND activity date year

Cost-basis calculation:
performed by existing tax calculation strategy, not by summary service

Dividend aggregate:
gross, withholding, and net kept separate

Realized-gain aggregate:
gross proceeds, gross basis, gross gain, fees, and fee-adjusted gain kept separate

Unknown required value:
aggregate becomes null rather than partial/zero

Empty year:
complete zero summary

Traceability:
detail records retain source activity identifiers

Dashboard:
uses a compact projection of YearlyTaxSummary

Export:
consumes YearlyTaxSummary and detail records

Persistence:
none for yearly summary in initial implementation
```

## Cross-Member Coordination Note

This design touches Raniya's unified-dashboard and shared API areas.

Before Iteration 2 implementation, coordinate these contract points with her:

- `TaxApi.getYearlySummary` request/response shape
- serialization of high-precision numeric values
- nullable dashboard tax totals
- whether `TaxSummaryCard.totalRealizedGain` means gross or fee-adjusted gain
- shared warning/error representation
- placement of shared tax interfaces

Recommended tax-side mapping is:

```text
TaxSummaryCard.year
<- YearlyTaxSummary.year

TaxSummaryCard.totalRealizedGain
<- YearlyTaxSummary.grossRealizedGainBaseCurrency

TaxSummaryCard.totalWithholdingTax
<- YearlyTaxSummary.totalWithholdingTaxBaseCurrency
```

The dashboard implementation itself remains Raniya's ownership.

Arthur's chart contracts and Sesha's risk calculation remain separate domains.

## Out of Scope

The Sep 22 task does not implement:

- yearly tax-summary service code
- API controllers
- dashboard components
- tax-summary database tables
- tax-relevant transaction flag
- CSV/PDF export formatting
- jurisdiction-specific tax rates
- holding-period classification
- tax liability estimation
- wash-sale/superficial-loss rules
- short-sale tax rules
- legal filing forms
- cross-account pooling rules beyond the existing project scope

## Next Task

The next scheduled tax task is September 23:

**Design the tax-relevant transaction flag/filtering behavior.**

That task should define how source transactions are marked or classified for tax
analysis, how the tax flag interacts with existing draft/excluded filters, and
how FIFO, average cost, yearly summaries, tax lots, and exports consistently use
the same tax-relevant activity set.
