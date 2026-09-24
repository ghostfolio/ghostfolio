# Tax Metrics — CSV/PDF Tax Export Format Specification

**Owner:** Tharun Swaminathan
**Iteration:** 1 — Design & Data Modelling
**Date:** September 24, 2026

## Objective

This document specifies the CSV and PDF export formats for the Ghostfolio tax
extension.

The export feature must present the same tax results already produced by the tax
calculation pipeline. It must not recalculate FIFO, average cost, withholding,
or yearly totals independently.

This is Iteration 1 design work only. No CSV generator, PDF generator, API
endpoint, download button, shared React component, or new package dependency is
implemented as part of this task.

The export is a tax-analytics report. It is not a jurisdiction-specific tax
return, filing form, or personal tax advice.

## Relationship to Earlier Tax Designs

The export specification consumes the contracts already defined during
Iteration 1.

### Sep 16 — Withholding tax

Dividend output keeps these values separate:

```text
gross dividend
withholding amount
withholding rate
net dividend
activity fee
```

Unknown withholding remains different from known zero withholding.

### Sep 17 — FIFO capital gains

FIFO can produce:

```text
sale-level realized-gain record
FIFO acquisition lots
FIFO lot matches
```

The export must preserve traceability from the realized sale back to the source
BUY and SELL activities.

### Sep 18 — Average-cost capital gains

Average cost can produce:

```text
sale-level realized-gain record
average-cost events
pool state before/after an activity
```

The export must not invent FIFO-style lot matches for average cost.

### Sep 21 — Tax-lot/data model

The common sale-level contract is:

```text
TaxRealizedGainRecord
```

Method-specific trace data remains separate.

### Sep 22 — Yearly tax summary

The main annual export source is:

```text
YearlyTaxSummary
```

which already contains:

- selected year
- cost-basis method
- base currency
- dividend totals
- realized-gain totals
- detail records
- completeness status
- warnings/errors

### Sep 23 — Tax-relevant filtering

Exports must consume the same tax-filtered result used by tax views.

The export layer must never reload all activities and accidentally include:

- Draft activities
- Exclude from Analysis activities
- activities in excluded accounts
- `isTaxRelevant = false` activities
- synthetic cash activities

## Repository Findings

### Existing Ghostfolio export is a JSON backup/export

The current API contains:

```text
apps/api/src/app/export/
```

with:

```text
export.controller.ts
export.service.ts
get-export.dto.ts
export.module.ts
```

The current export endpoint returns an `ExportResponse` object containing
accounts, activities, asset profiles, platforms, tags, user settings, and export
metadata.

That is a portfolio data portability/backup export, not a tax report.

### Existing general export deliberately includes excluded data

The current `ExportService.export()` retrieves activities with:

```text
includeDrafts = true
withExcludedAccountsAndActivities = true
```

That is appropriate for a full backup because source data should not disappear
from an export.

It is not appropriate for the tax report.

The tax CSV/PDF feature must therefore not reuse the existing general-export
selection rules as its tax filter.

### Existing general export is not CSV/PDF generation

The current export controller returns a structured response.

It does not currently generate the tax CSV/PDF formats described here.

The tax export should reuse useful existing services without changing the purpose
of the general backup endpoint.

### Existing shared export response is based on `Order`

`ExportResponse.activities` derives from the Prisma `Order` type and is mapped
into a portable activity format.

When the Sep 23 `Order.isTaxRelevant` field is implemented, the general backup
export/import round trip should preserve that field so an explicit false value
is not lost.

This backup concern is separate from the tax report described here.

### Existing CSV dependency

The repository already includes:

```text
papaparse
```

Iteration 2 can evaluate reusing it for CSV serialization rather than adding a
second CSV dependency.

This is an implementation recommendation, not a format requirement.

### PDF dependency status

The inspected `package.json` does not currently show a dedicated PDF-generation
library such as pdfkit, jsPDF, or pdfmake.

The PDF library choice should therefore be made during Iteration 2 after checking
build compatibility, pagination support, and testability.

This document defines PDF content independently of the chosen library.

## Architecture Decision

Tax export is a presentation layer over tax calculation results.

```text
Persisted activities
        |
        v
Tax filtering
        |
        v
FIFO or AVERAGE_COST
        |
        v
DividendRecord[]
TaxRealizedGainRecord[]
method-specific trace data
        |
        v
YearlyTaxSummary
        |
        v
TaxExport
      /     \
     v       v
   CSV       PDF
```

The export layer must not independently implement:

- FIFO matching
- average-cost pooling
- withholding calculations
- historical FX conversion
- yearly aggregation

## Export Request Context

A yearly tax export requires at least:

```text
year
method
format
```

Conceptually:

```ts
export type TaxExportFormat = 'CSV' | 'PDF';

export interface TaxExportRequest {
  year: number;
  method: TaxCalculationMethod;
  format: TaxExportFormat;
}
```

The authenticated request supplies user ownership.

Base currency comes from the same calculation context used by
`YearlyTaxSummary`.

The exact route/query DTO is a shared API decision.

## Supported Formats

Initial project scope:

```text
CSV
PDF
```

No XLSX, jurisdiction-specific XML, or official electronic filing format is
required.

## Required Export Metadata

Every export identifies:

```text
reportYear
costBasisMethod
baseCurrency
generatedAt
isComplete
```

The report should also identify itself as:

```text
Ghostfolio Tax Analytics
```

It must not present itself as an official tax return.

## File Naming

Recommended names:

```text
ghostfolio-tax-<year>-<method>.csv
ghostfolio-tax-<year>-<method>.pdf
```

Examples:

```text
ghostfolio-tax-2026-fifo.csv
ghostfolio-tax-2026-average-cost.pdf
```

Use lowercase ASCII method slugs.

Do not place the user's name, email, or account ID in the filename.

## Incomplete Exports

If:

```text
YearlyTaxSummary.isComplete = false
```

the export may still be generated.

CSV and PDF must preserve:

- incomplete status
- warnings
- errors
- unavailable values

The export must not drop incomplete rows and then present the remaining totals as
complete.

# CSV Format

## CSV Design Goals

The CSV should be:

- machine-readable
- spreadsheet-friendly
- deterministic
- flat
- traceable
- testable

A single CSV cannot naturally contain nested summary, dividend, realized-gain,
and method-specific trace structures.

The initial design therefore uses one typed flat table.

## CSV Record Types

The first column is:

```text
recordType
```

Supported values:

```text
SUMMARY
DIVIDEND
REALIZED_GAIN
FIFO_MATCH
AVERAGE_COST_EVENT
WARNING
ERROR
```

FIFO exports use:

```text
SUMMARY
DIVIDEND
REALIZED_GAIN
FIFO_MATCH
WARNING
ERROR
```

Average-cost exports use:

```text
SUMMARY
DIVIDEND
REALIZED_GAIN
AVERAGE_COST_EVENT
WARNING
ERROR
```

## Why One Typed CSV

A single file satisfies the CSV-export requirement without requiring a ZIP or
several downloads.

`recordType` allows filtering in Excel or another spreadsheet.

It also prevents one FIFO sale from being mistaken for several disposals.

Example:

```text
1 REALIZED_GAIN row
3 FIFO_MATCH rows
```

still represents one SELL disposal.

## CSV Encoding

Use:

```text
encoding: UTF-8
delimiter: comma
line ending: CRLF
quote: "
header row: yes
```

Fields containing commas, quotes, or line breaks must use standard CSV quoting.

Quotes inside a quoted field are doubled.

## CSV Numeric Rules

Numeric fields use:

```text
decimal separator: .
thousands separator: none
currency symbol: none
scientific notation: no
```

Correct:

```text
1250.50
-32.75
0
0.015
```

Incorrect:

```text
$1,250.50
```

Currency is represented in explicit currency columns.

## Precision and Rounding

The tax engine calculates and aggregates using the full internal `Big`
precision defined by earlier tax specifications.

The export layer must not round each detail row and then recompute annual totals.

Correct:

```text
calculate at full precision
aggregate at full precision
format result for export
```

Incorrect:

```text
round each detail row
sum rounded values
replace YearlyTaxSummary totals
```

CSV values should be serialized as plain decimal strings.

PDF display rounding is presentation only.

## Null Values

CSV:

```text
unavailable/null numeric value => empty field
```

Do not use zero to represent unknown.

PDF:

```text
unavailable value => Not available
```

or another consistent human-readable label.

## Booleans

CSV:

```text
true
false
```

PDF report status:

```text
Complete
Incomplete
```

## Dates

CSV activity/event dates use ISO 8601.

Example:

```text
2026-06-01T14:30:00.000Z
```

The report year remains:

```text
2026
```

PDF may display a shorter readable date while source identifiers preserve
traceability.

## Fixed CSV Column Order

Recommended initial order:

```text
recordType
reportYear
method
baseCurrency
generatedAt
isComplete

sourceActivityId
buyActivityId
sellActivityId
accountId
symbolProfileId

activityDate
acquiredAt
realizedAt

transactionCurrency
assetCurrency

quantity
matchedQuantity
unmatchedQuantity

grossDividendTransactionCurrency
withholdingTaxTransactionCurrency
withholdingTaxRate
netDividendTransactionCurrency
activityFeeTransactionCurrency

grossDividendBaseCurrency
withholdingTaxBaseCurrency
netDividendBaseCurrency

grossProceedsBaseCurrency
grossCostBasisBaseCurrency
grossRealizedGainBaseCurrency
activityFeesBaseCurrency
realizedGainAfterActivityFeesBaseCurrency

poolQuantityBefore
averageGrossUnitCostBefore
poolQuantityAfter
averageGrossUnitCostAfter

summaryGrossDividends
summaryWithholdingTax
summaryNetDividends
summaryGrossProceeds
summaryGrossCostBasis
summaryGrossRealizedGain
summaryActivityFees
summaryRealizedGainAfterActivityFees

dividendCount
disposalCount

traceId
traceIds
warningCodes
errorCodes
message
```

Columns not relevant to a row type remain empty.

## SUMMARY Row

Exactly one `SUMMARY` row appears first.

It contains:

```text
reportYear
method
baseCurrency
generatedAt
isComplete

summaryGrossDividends
summaryWithholdingTax
summaryNetDividends

summaryGrossProceeds
summaryGrossCostBasis
summaryGrossRealizedGain
summaryActivityFees
summaryRealizedGainAfterActivityFees

dividendCount
disposalCount
```

No source activity ID is assigned to this row.

## DIVIDEND Row

One row per included `DividendRecord`.

Relevant fields:

```text
sourceActivityId
accountId
symbolProfileId
activityDate
transactionCurrency

grossDividendTransactionCurrency
withholdingTaxTransactionCurrency
withholdingTaxRate
netDividendTransactionCurrency
activityFeeTransactionCurrency

grossDividendBaseCurrency
withholdingTaxBaseCurrency
netDividendBaseCurrency

warningCodes
errorCodes
```

Dividend activity fee remains separate from withholding.

## REALIZED_GAIN Row

One row per sale-level `TaxRealizedGainRecord`.

Relevant fields:

```text
sellActivityId
accountId
symbolProfileId
realizedAt

quantity
matchedQuantity
unmatchedQuantity

grossProceedsBaseCurrency
grossCostBasisBaseCurrency
grossRealizedGainBaseCurrency
activityFeesBaseCurrency
realizedGainAfterActivityFeesBaseCurrency

traceIds
warningCodes
errorCodes
```

A SELL consuming several FIFO lots still emits only one REALIZED_GAIN row.

## FIFO_MATCH Row

FIFO export may add one row per `TaxLotMatch`.

Relevant fields:

```text
traceId
buyActivityId
sellActivityId

acquiredAt
realizedAt
matchedQuantity

grossCostBasisBaseCurrency
grossProceedsBaseCurrency
grossRealizedGainBaseCurrency
activityFeesBaseCurrency
realizedGainAfterActivityFeesBaseCurrency
```

These are trace rows and do not increase yearly disposal count.

## FIFO Trace Scope

For a yearly tax export, include FIFO matches connected to realized SELL records
in the requested year.

Do not automatically dump every open lot in the user's entire portfolio into the
annual tax report.

A future separate open-lot export can be added if required.

## AVERAGE_COST_EVENT Row

Average-cost export may include event/state trace rows connected to selected-year
realized SELLs.

Relevant fields:

```text
sourceActivityId
activityDate
quantity

poolQuantityBefore
averageGrossUnitCostBefore
poolQuantityAfter
averageGrossUnitCostAfter
```

For SELL events, common realized values may also appear.

Do not create fake BUY-lot references for average cost.

## Average-Cost Trace Scope

A current-year SELL can depend on pooled acquisition history from older years.

The export should include enough pre/post sale pool state to explain the selected
year's basis.

The full event replay remains a tax calculation concern; the export is not a
second calculator.

## WARNING Row

Warning rows can contain:

```text
recordType = WARNING
reportYear
method
sourceActivityId
traceId
warningCodes
message
```

Warnings can also remain attached to their related financial row.

## ERROR Row

Error rows can contain:

```text
recordType = ERROR
reportYear
method
sourceActivityId
traceId
errorCodes
message
```

Errors are not silently dropped.

## List Fields

Use:

```text
|
```

inside list-style CSV fields.

Example:

```text
MISSING_BASE_CURRENCY_CONVERSION|TAX_SCOPE_HAS_EXCLUDED_INVESTMENT_HISTORY
```

This avoids conflict with the comma delimiter.

## CSV Row Ordering

Recommended deterministic order:

```text
1. SUMMARY
2. DIVIDEND by activityDate, then sourceActivityId
3. REALIZED_GAIN by realizedAt, then sellActivityId
4. method-specific trace rows grouped by sale
5. WARNING
6. ERROR
```

FIFO match ordering follows FIFO consumption order.

Average-cost traces follow event order.

## Empty-Year CSV

An empty complete year still exports:

```text
header
SUMMARY row
```

with zero financial totals, zero counts, and:

```text
isComplete = true
```

No fake financial rows are generated.

# PDF Format

## PDF Design Goals

The PDF is for human review.

It should:

- summarize the year clearly
- identify the cost-basis method
- identify base currency
- show dividends and withholding
- show realized gains
- provide method-specific traceability
- show warnings/errors clearly
- remain readable across multiple pages

## PDF Section Order

Use:

```text
1. Report Header
2. Annual Tax Summary
3. Dividend and Withholding Detail
4. Realized Capital Gains Detail
5. Cost-Basis Trace Detail
6. Warnings and Errors
7. Report Note
```

## Report Header

Display:

```text
Ghostfolio Tax Analytics
Report Year
Cost-Basis Method
Base Currency
Generated At
Status: Complete / Incomplete
```

Do not place passwords, email, database user IDs, or other unnecessary personal
information in the header.

## Annual Summary

Show:

```text
Gross Dividends
Withholding Tax
Net Dividends

Gross Sale Proceeds
Gross Cost Basis
Gross Realized Gain
Activity Fees
Realized Gain After Activity Fees

Dividend Count
Disposal Count
```

Values come directly from `YearlyTaxSummary`.

## Incomplete Report Banner

When incomplete, show near the top:

```text
Status: Incomplete
```

with a short explanation directing the user to warnings/errors.

Do not hide incompleteness only in a footer.

## Dividend Detail Table

Recommended columns:

```text
Date
Account
Asset
Gross Dividend
Withholding
Withholding Rate
Net Dividend
Transaction Currency
Base Gross
Base Withholding
Base Net
Source Activity ID
```

If source IDs make the main table too wide, place them in a reference/trace
column or appendix.

## Realized-Gain Detail Table

Recommended columns:

```text
Sell Date
Account
Asset
Quantity
Gross Proceeds
Cost Basis
Gross Gain/Loss
Activity Fees
Gain/Loss After Fees
Base Currency
Sell Activity ID
```

Negative gains remain negative.

## FIFO Trace Table

For FIFO, group by SELL.

Recommended columns:

```text
Sell Activity ID
Buy Activity ID
Acquisition Date
Sell Date
Matched Quantity
Allocated Cost Basis
Allocated Proceeds
Gross Gain/Loss
Allocated Fees
Gain/Loss After Fees
```

## Average-Cost Trace Table

For average cost:

```text
Sell Activity ID
Sell Date
Quantity Sold
Pool Quantity Before
Average Unit Cost Before
Allocated Cost Basis
Pool Quantity After
Average Unit Cost After
```

Do not show fake lot IDs.

## Warnings and Errors Section

Display:

```text
severity
code
source/trace reference
message
```

Examples:

```text
UNKNOWN_DIVIDEND_WITHHOLDING
MISSING_BASE_CURRENCY_CONVERSION
INSUFFICIENT_OPEN_LOTS
INSUFFICIENT_POOL_QUANTITY
TAX_SCOPE_HAS_EXCLUDED_INVESTMENT_HISTORY
```

## Report Note

Include a short neutral note:

```text
This report contains portfolio tax analytics generated from the activity data
available in Ghostfolio. It is not a tax return or personal tax advice.
```

Do not add jurisdiction-specific filing instructions.

## Account and Asset Display

PDF should prefer human-readable names/symbols when available.

CSV should preserve stable source identifiers such as:

```text
accountId
symbolProfileId
```

Display labels must not replace stable trace IDs.

## Multi-Currency Behavior

Annual portfolio totals use:

```text
YearlyTaxSummary.baseCurrency
```

Original transaction-currency values are detail fields.

Do not directly sum raw values from different currencies.

## Missing FX

CSV:

```text
affected base value = empty
isComplete = false
diagnostic present
```

PDF:

```text
affected value = Not available
Status = Incomplete
diagnostic present
```

Never substitute zero or an assumed 1:1 rate.

## Unknown Withholding

For:

```text
withholdingTax = null
```

CSV withholding/net numeric fields are empty.

PDF displays them as unavailable.

For:

```text
withholdingTax = 0
```

both formats show numeric zero.

## Tax-Relevant Filtering

Exports consume results already filtered through Sep 23 rules.

They do not independently decide activity tax relevance.

If the calculation reports excluded historical investment data causing an
incomplete result, the export preserves that status and diagnostic.

## Reconciliation

CSV and PDF created from the same yearly summary must show the same:

```text
year
method
base currency
completeness

gross dividends
withholding
net dividends

gross proceeds
gross cost basis
gross realized gain
activity fees
fee-adjusted realized gain

dividend count
disposal count
```

## CSV Detail Reconciliation

For a complete result:

```text
sum(DIVIDEND.grossDividendBaseCurrency)
=
SUMMARY.summaryGrossDividends
```

```text
sum(DIVIDEND.withholdingTaxBaseCurrency)
=
SUMMARY.summaryWithholdingTax
```

```text
sum(REALIZED_GAIN.grossProceedsBaseCurrency)
=
SUMMARY.summaryGrossProceeds
```

```text
sum(REALIZED_GAIN.grossCostBasisBaseCurrency)
=
SUMMARY.summaryGrossCostBasis
```

```text
sum(REALIZED_GAIN.grossRealizedGainBaseCurrency)
=
SUMMARY.summaryGrossRealizedGain
```

FIFO_MATCH rows are trace rows and must not be added again to sale-level totals.

## PDF Pagination

For multi-page output:

- repeat table headers where supported
- do not clip numeric columns
- preserve all rows
- include page numbers when reliably supported
- keep the summary readable on the first page

Exact rendering depends on the selected Iteration 2 PDF library.

## Page Size

No jurisdiction-specific page size is required.

Use one consistent project-wide page size and preserve table readability.

## CSV Spreadsheet Safety

User-controlled text can be interpreted by spreadsheet programs as formulas when
it begins with characters such as:

```text
=
+
-
@
```

Text columns added to the CSV must be sanitized for spreadsheet formula
injection.

Negative numeric values such as:

```text
-250.50
```

must remain numeric and must not be incorrectly escaped as text.

## PDF Text Safety

If PDF generation uses HTML/templates, user-controlled values must be escaped
before insertion.

## Authorization

Tax export uses the authenticated user's tax calculation context.

The client does not supply an arbitrary user ID.

A user can export only their own authorized tax results.

## Determinism

With the same:

```text
source activities
tax-relevant flags
split data
base currency
method
report year
```

financial values in the export must be identical.

`generatedAt` may differ.

## Proposed Export Result

Conceptually:

```ts
export interface TaxExportResult {
  format: TaxExportFormat;
  fileName: string;
  contentType: string;
  content: Buffer | string;
}
```

Possible MIME types:

```text
CSV -> text/csv
PDF -> application/pdf
```

This is a recommendation, not a locked shared API contract.

## Proposed Service Boundary

A tax-domain export service is preferred.

Conceptually:

```text
apps/api/src/app/tax/
  tax-export.service.ts
```

Responsibilities:

1. obtain `YearlyTaxSummary`
2. obtain method-specific trace data
3. map domain results to export rows/sections
4. serialize CSV/PDF
5. return filename/content type/content
6. perform no tax recalculation

Final location should align with Raniya's architecture.

## Existing General Export Boundary

Do not replace the current:

```text
GET /export
```

backup semantics with tax-report semantics.

The existing endpoint intentionally exports broader source data, including data
that tax reporting may exclude.

A separate tax endpoint or clearly separated tax-export mode is safer.

## Generic Backup Round-Trip Impact

When Sep 23 `isTaxRelevant` is implemented, the existing portable backup should
preserve the field.

Otherwise:

```text
export
-> import
```

could turn an explicit false back into true.

This is an implementation dependency on the existing export module, but it is
not the tax CSV/PDF report itself.

## CSV Implementation Recommendation

Because `papaparse` is already installed, Iteration 2 can evaluate:

```text
Papa.unparse(...)
```

Confirm:

- fixed column order
- CRLF behavior
- quoting
- null-to-empty mapping
- text formula-injection safety

before using it.

## PDF Implementation Recommendation

No PDF package is selected in Iteration 1.

Iteration 2 should choose the smallest compatible approach after checking:

- NestJS/Node compatibility
- production build behavior
- table pagination
- output testability
- maintenance cost

Do not rewrite a working frontend subsystem solely to generate PDF.

## Planned Iteration 2 CSV Tests

Verify:

- empty year
- dividend with positive withholding
- dividend with zero withholding
- dividend with unknown withholding
- positive realized gain
- realized loss
- FIFO one-lot sale
- FIFO multi-lot sale
- average-cost sale
- multiple accounts
- multiple assets
- missing historical FX
- incomplete tax relevance history
- warning/error rows
- null exported as empty
- zero exported as zero
- ISO date output
- fixed header order
- deterministic row ordering
- commas/quotes/newlines in text
- UTF-8 content
- spreadsheet injection safety
- FIFO trace does not double-count totals
- detail rows reconcile exactly to SUMMARY

## Planned Iteration 2 PDF Tests

Verify:

- header year/method/base currency
- Complete/Incomplete status
- summary values match source summary
- dividend details are correct
- realized gain details are correct
- FIFO trace links correct BUY/SELL records
- average cost uses pool state, not fake lots
- unknown values display as unavailable
- negative gains remain negative
- diagnostics are present
- multi-page output does not omit data
- MIME type is PDF
- filename follows convention

Tests should verify financial content, not only that a PDF file opens.

## Cross-Format Test

For one source summary, CSV and PDF must expose the same financial totals and
counts.

No format may contain independent financial calculation logic.

## Acceptance Criteria

The Sep 24 design is complete when:

- CSV and PDF formats are defined
- request context is defined
- filename conventions are defined
- MIME types are defined
- tax export is separated from general backup export
- `YearlyTaxSummary` is the source
- cost-basis method is present
- base currency is present
- completeness is present
- null vs zero behavior is defined
- CSV syntax and encoding are defined
- CSV column order is defined
- CSV record types are defined
- SUMMARY behavior is defined
- DIVIDEND behavior is defined
- REALIZED_GAIN behavior is defined
- FIFO trace behavior is defined
- average-cost trace behavior is defined
- diagnostics are defined
- PDF section order is defined
- PDF summary/detail/trace sections are defined
- precision and rounding behavior are defined
- date formatting is defined
- currency behavior is defined
- missing FX is defined
- unknown withholding is defined
- tax-relevant filtering is preserved
- reconciliation is defined
- FIFO trace rows cannot double-count sales
- authorization is defined
- spreadsheet injection safety is addressed
- generic backup round-trip impact of `isTaxRelevant` is identified
- Iteration 2 tests are identified
- no jurisdiction-specific filing format is invented

## Final Design Decisions

```text
Source:
YearlyTaxSummary + method-specific trace data

Tax recalculation inside export:
none

Formats:
CSV
PDF

CSV:
single typed table

CSV record types:
SUMMARY
DIVIDEND
REALIZED_GAIN
FIFO_MATCH
AVERAGE_COST_EVENT
WARNING
ERROR

CSV encoding:
UTF-8

CSV delimiter:
comma

CSV line ending:
CRLF

CSV null numeric value:
empty

PDF sections:
header
annual summary
dividend detail
realized gain detail
method trace
warnings/errors
report note

PDF unavailable value:
Not available

Incomplete export:
allowed, clearly marked

Filename:
ghostfolio-tax-<year>-<method>.<ext>

General Ghostfolio backup:
remains separate

Backup isTaxRelevant:
must round-trip after Sep 23 implementation
```

## Cross-Member Coordination

This task is mainly within Tharun's tax ownership.

Implementation will touch shared architecture around:

- tax export endpoint
- shared file-download behavior
- generic backup export/import compatibility
- shared numeric formatting
- Iteration 3 React export UI

Coordinate those pieces with Raniya.

Do not change Arthur's chart export behavior or Sesha's risk feature unless the
team explicitly chooses a shared download component.

## Out of Scope

This Sep 24 task does not implement:

- CSV generation code
- PDF generation code
- API endpoint
- download UI
- package changes
- official government forms
- jurisdiction-specific filing layouts
- XLSX
- electronic filing
- report email/storage

## Next Task

The next scheduled tax task is September 25:

**Create GitHub issues for every tax sub-feature.**

The issue set should translate the completed Iteration 1 tax specifications into
Iteration 2 implementation work with acceptance criteria, tests, dependencies,
and clear out-of-scope boundaries.
