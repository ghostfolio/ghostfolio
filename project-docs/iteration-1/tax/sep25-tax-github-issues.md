# Issue 1

**Title:** [Tax][Iteration 2] Establish shared tax-domain contracts and source normalization

## Goal
Create the shared backend tax-domain contracts and deterministic source-normalization pipeline used by FIFO, average cost, tax lots, yearly summaries, and exports.

## Scope
- Define shared contracts such as `TaxCalculationMethod`, normalized `TaxActivity`, warning/error types, `TaxRealizedGainRecord`, and calculation-result envelopes.
- Reuse Ghostfolio activity retrieval instead of building a second transaction subsystem.
- Load persisted activities only; synthetic cash is excluded.
- Reuse Draft and Exclude from Analysis behavior.
- Preserve deterministic ordering: full activity date ascending, then activity id ascending.
- Reuse existing stock-split normalization.
- Preserve source ids, account id, symbolProfileId, transaction currency, asset currency, and base-currency values.
- Represent missing historical FX as unavailable + diagnostic, never zero or an assumed 1:1 rate.
- Initial calculation scope: `userId + accountId + symbolProfileId`; null account uses a separate `NO_ACCOUNT` scope.

## Implementation Notes
Prefer a dedicated tax backend service/module that adapts existing Ghostfolio patterns. Do not modify the current ROAI/performance calculator for tax basis logic. Use `Big` internally.

Likely touch:
- `apps/api/src/app/activities/activities.service.ts`
- `libs/common/src/lib/interfaces/`
- new tax-domain service/interface files
- existing stock-split and FX services

## Acceptance Criteria
- One normalized input shape is usable by both FIFO and average cost.
- Source ids and exact dates remain traceable.
- Same-date ordering is deterministic.
- Split-adjusted quantities/prices preserve transaction value.
- Missing FX produces explicit diagnostics.
- Synthetic cash never enters tax calculations.
- No frontend changes.

## Tests
Cover same-date ordering, split adjustment, null-account scope, missing FX, invalid/missing numeric inputs, and synthetic-cash exclusion.

## Dependencies
Existing Ghostfolio activity, FX, and split services.

## Out of Scope
FIFO matching, average-cost pooling, jurisdiction-specific tax rules, frontend work.

## Design Sources
- `project-docs/iteration-1/tax/fifo-capital-gains-spec.md`
- `project-docs/iteration-1/tax/average-cost-capital-gains-spec.md`
- `project-docs/iteration-1/tax/tax-lot-data-model.md`
- `project-docs/iteration-1/tax/yearly-tax-summary-data-structure.md`


---

# Issue 2

**Title:** [Tax][Iteration 2] Add withholding-tax storage and activity API support

## Goal
Persist dividend withholding tax on source activities and expose it through the existing activity create/update/import/export paths.

## Scope
- Add nullable `withholdingTax` to `Order`.
- Preserve the semantic difference between `null` (unknown) and `0` (known no withholding).
- Accept the field in create/update DTOs.
- Preserve omitted values on update.
- Thread the field through import validation, dry-run preview, and actual import.
- Preserve the field in the existing Ghostfolio backup export/import round trip.
- Keep gross dividend, withholding amount/rate, net dividend, and activity fee separate.

## Implementation Notes
`Order` remains the authoritative source. Do not create a separate dividend table. Dividend gross value remains based on source activity quantity × unit price. Derive rate/net values rather than persisting redundant totals.

Likely touch:
- `prisma/schema.prisma`
- `libs/common/src/lib/dtos/create-order.dto.ts`
- `libs/common/src/lib/dtos/update-order.dto.ts`
- `apps/api/src/app/activities/`
- `apps/api/src/app/import/import.service.ts`
- existing export response/service

## Acceptance Criteria
- Existing activities remain valid.
- `null` and `0` round-trip distinctly.
- Create, update, import dry-run, real import, read, and backup export all preserve the field.
- Activity fees remain separate from withholding.
- No jurisdiction-specific rate logic is added.

## Tests
Positive withholding, zero withholding, null withholding, create/update omission, old import files, explicit import value, dry-run consistency, backup export/import round trip.

## Dependencies
Shared activity model and import/export paths.

## Out of Scope
Frontend controls, jurisdiction rules, automatic withholding-rate lookup.

## Design Source
`project-docs/iteration-1/tax/withholding-tax-schema.md`


---

# Issue 3

**Title:** [Tax][Iteration 2] Add tax-relevant activity flag and filtering

## Goal
Allow users to explicitly exclude a source activity from tax analytics without deleting it or changing normal portfolio behavior.

## Scope
- Add `Order.isTaxRelevant Boolean @default(true)`.
- Add optional boolean support to create/update DTOs.
- Preserve omitted update values.
- Thread the flag through import dry-run and real import.
- Preserve the flag in generic backup export/import.
- Reuse existing Draft, activity Exclude from Analysis, and excluded-account behavior.
- Exclude synthetic cash from tax source data.
- Add mixed historical investment diagnostics when an excluded BUY/SELL may affect a later tax-relevant SELL.

## Implementation Notes
Tax eligibility is:
`normal Ghostfolio eligibility AND isTaxRelevant AND operation-specific type`.

Do not reuse the broad `Exclude from Analysis` tag as the tax-only flag. Do not cascade flag changes to related trades.

Proposed diagnostic:
`TAX_SCOPE_HAS_EXCLUDED_INVESTMENT_HISTORY`.

## Acceptance Criteria
- Existing rows/default imports resolve `true`.
- `false` excludes only tax analytics.
- Draft/excluded activity/excluded account still wins over `true`.
- BUY/SELL continuity problems are surfaced, not silently repaired.
- DIVIDEND filtering remains independent from unrelated BUY/SELL exclusions.
- Existing portfolio analytics do not change merely because the field exists.

## Tests
Create/update/default behavior, old imports, explicit false import, excluded-account/tag interactions, BUY/SELL mixed-history diagnostics, DIVIDEND inclusion/exclusion, synthetic cash exclusion.

## Dependencies
Shared tax source normalization.

## Out of Scope
Frontend toggle, jurisdiction-specific taxable-event classification.

## Design Source
`project-docs/iteration-1/tax/tax-relevant-filtering-spec.md`


---

# Issue 4

**Title:** [Tax][Iteration 2] Implement deterministic FIFO capital-gains engine

## Goal
Implement the FIFO realized-capital-gains calculation exactly as specified in Iteration 1.

## Scope
- Consume normalized eligible BUY/SELL activities in deterministic date/id order.
- Create acquisition lots chronologically.
- Support partial lot consumption and one sale consuming multiple lots.
- Preserve BUY/SELL source ids in trace output.
- Calculate gross proceeds, gross cost basis, gross realized gain, activity-fee allocation, and fee-adjusted realized gain.
- Produce asset-currency and base-currency values where available.
- Reuse stock-split-normalized source activities.
- Return open lots separately from realized results.
- Report insufficient holdings rather than inventing short-sale basis.

## Implementation Notes
Use `Big` internally and do not round intermediate values for display. Keep FIFO separate from the existing ROAI/performance calculation.

## Acceptance Criteria
- FIFO consumes oldest eligible acquisition quantity first.
- Partial lot balances remain correct.
- Multi-lot sales remain traceable.
- One source SELL produces one sale-level realized-gain record.
- Missing FX is not coerced to zero.
- Invalid/insufficient history returns deterministic diagnostics.

## Tests
Single buy/sell, multiple buys, partial lot sale, sale across lots, same-date ordering, zero values, fractional quantities, fees, losses, stock splits, missing FX, insufficient lots.

## Dependencies
Shared tax-domain contracts/source normalization; withholding/tax-relevant source fields as applicable.

## Out of Scope
Average cost, short sales, wash-sale rules, jurisdiction-specific holding-period rules.

## Design Source
`project-docs/iteration-1/tax/fifo-capital-gains-spec.md`


---

# Issue 5

**Title:** [Tax][Iteration 2] Implement average-cost capital-gains engine

## Goal
Implement the average-cost realized-capital-gains strategy specified in Iteration 1.

## Scope
- Maintain pooled quantity, gross cost, and acquisition-fee state.
- BUY increases quantity/cost/fee pools.
- SELL allocates pooled basis proportionally using disposal quantity / pool quantity.
- Partial sales reduce pool proportionally without changing average unit cost.
- Full close resets pool state exactly to zero.
- Produce the same common sale-level `TaxRealizedGainRecord` shape as FIFO.
- Preserve method-specific average-cost event/state trace data.

## Core Formula
For SELL quantity `q` from pool quantity `Q`:
`disposalRatio = q / Q`

Allocate gross basis and acquisition fees using that ratio before reducing the pool.

## Acceptance Criteria
- Pool state is deterministic and traceable.
- Partial disposal leaves average unit cost unchanged.
- Full disposal closes the pool cleanly.
- Gross vs fee-adjusted results remain separate.
- Missing FX and insufficient quantity are explicit diagnostics.
- No FIFO lot matching is fabricated.

## Tests
One buy/sell, multiple buys, partial disposal, repeated disposals, full close/reset, zero-cost buy, fractions, fees, losses, same-date ordering, missing FX, insufficient pool quantity.

## Dependencies
Shared tax-domain contracts/source normalization.

## Out of Scope
FIFO, jurisdiction-specific pooling periods/categories, short sales.

## Design Source
`project-docs/iteration-1/tax/average-cost-capital-gains-spec.md`


---

# Issue 6

**Title:** [Tax][Iteration 2] Implement derived tax-lot and calculation trace tracking

## Goal
Provide deterministic, traceable tax-lot and method-specific calculation state without persisting stale derived financial results as authoritative data.

## Scope
- Derive FIFO tax lots from source BUY activities.
- Track initial quantity, remaining quantity, acquired date, currency, source activity id, and derived status.
- Produce deterministic FIFO match identifiers and BUY/SELL trace links.
- Produce average-cost pool/event trace state.
- Keep common realized-gain records method-independent.
- Recalculate derived state after relevant source activity edits/deletes/flag changes.

## Implementation Notes
`Order` remains authoritative. Do not persist tax lots, matches, average-cost events, or yearly summaries as authoritative Prisma rows in the initial implementation.

Safe initial invalidation may replay a full affected user or scope.

## Acceptance Criteria
- Open/partially consumed/closed FIFO lot state is correct.
- FIFO match traces identify consumed BUY and SELL source ids.
- Average cost exposes pool/event trace without fake lots.
- Derived state updates after source changes.
- No stale persisted tax state becomes the source of truth.

## Tests
Open lots, partial consumption, full close, multiple lots, source update/delete, tax-relevance change, null account scope, deterministic trace ids.

## Dependencies
FIFO and average-cost engines; shared source normalization.

## Out of Scope
Persistent authoritative lot tables, jurisdiction-specific lot-selection overrides.

## Design Source
`project-docs/iteration-1/tax/tax-lot-data-model.md`


---

# Issue 7

**Title:** [Tax][Iteration 2] Implement yearly tax summary service and API

## Goal
Build a yearly tax-summary service that aggregates dividend/withholding and realized-gain results for a requested year and selected cost-basis method.

## Scope
- Accept year + method.
- Resolve user base currency from settings.
- Load eligible investment history from the beginning through the selected year end.
- Run FIFO or average cost over the required historical source set.
- Filter realized SELL records to the requested year.
- Build selected-year `DividendRecord` values.
- Aggregate dividend totals, withholding, proceeds, cost basis, gains, fees, and counts.
- Preserve nullable/incomplete aggregates and diagnostics.
- Expose a shared API response for frontend/dashboard use.

## Critical Rule
Do **not** filter acquisition history to the requested year before calculating basis. A 2026 SELL may depend on BUY activity from earlier years.

## Acceptance Criteria
- Empty year returns known zero totals and `isComplete = true`.
- Exactly one calculation method applies per summary.
- Portfolio-level totals aggregate across independent account/asset scopes.
- Null means unavailable; zero means known zero.
- Detail records reconcile with summary totals.
- Missing FX/unknown withholding/calculation errors propagate correctly.

## Tests
Cross-year acquisitions, FIFO vs average-cost differences, empty year, multiple accounts/assets, gains/losses, zero/null withholding, fees, missing FX, insufficient history, year boundaries, reconciliation.

## Dependencies
FIFO engine, average-cost engine, dividend/withholding source data, tax-relevant filtering, common contracts.

## Out of Scope
Dashboard UI, tax filing rules.

## Design Source
`project-docs/iteration-1/tax/yearly-tax-summary-data-structure.md`


---

# Issue 8

**Title:** [Tax][Iteration 2] Implement CSV and PDF tax exports

## Goal
Generate CSV and PDF tax reports from the same yearly tax calculation results without duplicating financial logic.

## Scope
- Accept year, method, and format.
- Use `YearlyTaxSummary` + method-specific trace data as the source.
- CSV record types: SUMMARY, DIVIDEND, REALIZED_GAIN, FIFO_MATCH, AVERAGE_COST_EVENT, WARNING, ERROR.
- Use fixed deterministic CSV column/row ordering.
- Preserve null vs zero and incomplete status.
- Include FIFO/average-cost trace detail without double counting sale totals.
- Generate human-readable PDF sections for summary, dividends, gains, trace detail, diagnostics, and report note.
- Return deterministic filename/content type/content.
- Keep tax report behavior separate from the current general Ghostfolio backup `GET /export`.

## Implementation Notes
Evaluate the already-installed `papaparse` dependency for CSV. Select the smallest compatible PDF approach after checking NestJS/build/pagination/testability.

Recommended names:
`ghostfolio-tax-<year>-<method>.csv|pdf`

## Acceptance Criteria
- CSV/PDF totals exactly match the source yearly summary.
- Unknown numeric values are not written as zero.
- Missing FX and incomplete-history diagnostics are visible.
- FIFO trace rows never increase annual disposal totals.
- Exports remain authorized to the authenticated user.
- Generic backup export/import preserves `isTaxRelevant`.

## Tests
Empty year, dividend null/zero withholding, gain/loss, FIFO multi-lot, average-cost trace, missing FX, incomplete results, CSV escaping/injection safety, deterministic order, PDF content assertions, cross-format reconciliation.

## Dependencies
Yearly summary service, FIFO/average-cost trace data.

## Out of Scope
Official government forms, XLSX, electronic filing, email/cloud delivery.

## Design Source
`project-docs/iteration-1/tax/tax-export-format-spec.md`


---

# Issue 9

**Title:** [Tax][Iteration 2] Add comprehensive tax backend calculation and integration tests

## Goal
Provide numeric regression coverage for the tax backend so FIFO, average cost, withholding, filtering, yearly summaries, and exports remain deterministic and traceable.

## Scope
Create focused unit/integration coverage across all tax-domain services, including:
- normal cases and zero values
- multiple purchases/sales
- partial lot sales
- same-date ordering
- missing/invalid inputs
- fractional quantities
- fee allocation
- stock splits
- multiple accounts/assets
- null-account scope
- historical FX gaps
- tax-relevant exclusions
- cross-year basis
- summary reconciliation
- export reconciliation

## Acceptance Criteria
- Tests assert expected numeric values, not only successful execution.
- FIFO and average-cost test fixtures share normalized source inputs where practical.
- Existing Ghostfolio portfolio/performance behavior has regression protection.
- No expected value is changed solely to make a failing test pass.
- Incomplete/error cases assert specific diagnostics.

## Dependencies
Implement alongside the relevant backend issues; complete before Iteration 2 closes.

## Out of Scope
Frontend visual tests and jurisdiction-specific tax cases.

## Design Sources
All Iteration 1 tax specifications under `project-docs/iteration-1/tax/`.


---

# Issue 10

**Title:** [Tax][Iteration 3] Build React activity controls for withholding and tax relevance

## Goal
Add React UI controls for the tax source fields introduced in Iteration 2.

## Scope
- Display/edit dividend withholding amount where applicable.
- Display/edit the `Tax relevant` activity flag.
- Preserve null vs zero withholding behavior.
- Explain that disabling tax relevance affects tax analytics without deleting the portfolio activity.
- Surface a warning for BUY/SELL when historical exclusion may make later tax calculations incomplete.
- Reuse shared React activity/form components before creating new ones.

## Acceptance Criteria
- Existing activity values load correctly.
- Edit/save round trips through the backend.
- Null withholding remains distinguishable from zero.
- Flag changes do not modify unrelated activity fields.
- Validation/errors are visible and consistent with shared UI patterns.
- No tax calculations are performed in the frontend.

## Tests
Component/form behavior, null/zero withholding, true/false flag, API error handling, regression for existing activity editing.

## Dependencies
Iteration 2 withholding and tax-relevant backend fields.
Coordinate shared React/component work with Raniya.

## Out of Scope
Capital-gain calculation views, export UI.

## Design Sources
- `withholding-tax-schema.md`
- `tax-relevant-filtering-spec.md`


---

# Issue 11

**Title:** [Tax][Iteration 3] Build React capital-gains, tax-lot, and yearly-summary views

## Goal
Provide React views for choosing a cost-basis method and reviewing realized gains, tax lots/trace data, and yearly tax summaries.

## Scope
- Cost-basis selector: FIFO / AVERAGE_COST.
- Realized-gain table based on backend `TaxRealizedGainRecord`.
- FIFO tax-lot/match trace view.
- Average-cost pool/event trace view without fake FIFO lots.
- Year selector and yearly-summary cards/table.
- Display gross vs fee-adjusted gain distinctly.
- Display completeness, warnings, and errors.
- Reuse shared React table/card/empty/error/loading components.

## Acceptance Criteria
- Method switch requests/re-renders backend-calculated results.
- Frontend does not recalculate basis.
- FIFO and average-cost traces are represented according to their actual method.
- Unknown values are not rendered as zero.
- Empty years render a valid empty state.
- Diagnostics are visible.
- Dashboard integration uses the shared tax API contract only after coordination with Raniya.

## Tests
Method switching, empty year, gain/loss display, incomplete result, missing FX, FIFO trace, average-cost trace, API/loading/error states.

## Dependencies
Iteration 2 engines, trace tracking, yearly-summary API.
Coordinate dashboard/shared React architecture with Raniya.

## Out of Scope
Charts owned by Arthur; risk views owned by Sesha; jurisdiction-specific tax advice.


---

# Issue 12

**Title:** [Tax][Iteration 3] Build React CSV/PDF tax export UI and complete tax QA

## Goal
Provide the user-facing CSV/PDF export controls and complete end-to-end tax feature QA/polish.

## Scope
- Year selector and cost-basis method selection for export.
- CSV/PDF format controls.
- Trigger backend export and download the returned file.
- Show incomplete-report warning before/after export where appropriate.
- Verify filenames and MIME handling.
- Reuse shared download/UI components where available.
- Perform cross-feature QA for withholding, tax relevance, gains, lots, yearly summary, and exports.
- Capture confirmed issues/fixes for Iteration 3 report/demo notes.

## Acceptance Criteria
- CSV and PDF download from the shared backend export contract.
- UI does not recalculate export values.
- Export options match the currently selected year/method.
- Incomplete diagnostics are visible.
- Download failures are handled clearly.
- End-to-end values reconcile with the yearly-summary view.
- No regression in shared dashboard/activity UI.

## Tests
Successful CSV/PDF download, filename/content type, incomplete report, API failure, repeated exports, selected year/method, cross-view/export numeric reconciliation.

## Dependencies
Iteration 2 tax export backend; React tax views.
Coordinate shared download/dashboard architecture with Raniya.

## Out of Scope
Official tax filing submission, XLSX, email delivery.


---
