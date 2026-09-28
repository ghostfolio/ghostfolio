# Design Doc: Contribution / Waterfall Chart - Data Structure

**Status:** Draft (Iteration 1)
**Author:** _fill in_
**Scope:** Docs only, no code changes yet. Defines the data structure a future iteration will implement.

## 1. Summary

A waterfall chart showing how a portfolio moved from its starting value to its ending value over a period, broken into named steps (net contributions, market gain/loss per holding, dividends), gives a much clearer answer to "why did my portfolio change" than a single line ever can. This doc defines the data structure behind that chart.

## 2. Problem Statement

A portfolio value line can move for several very different reasons at once: money added or withdrawn, price movement of existing holdings, and dividends received. Today none of these are separated out visually. A user whose portfolio value barely moved over a quarter has no quick way to tell whether that's because nothing happened, or because a big withdrawal exactly offset strong market gains.

## 3. Current State (for context)

There's no existing endpoint that breaks a period's value change into components. The closest existing data is per-activity records (buys, sells, deposits, withdrawals, dividends) and the invested-capital series proposed in the toggle spec. This doc introduces the aggregation layer that turns those into waterfall-ready segments.

## 4. Goals

- Define a `WaterfallSegment` shape covering a start bar, one or more contribution bars, and an end bar.
- Define exactly which components make up a contribution bar (net cash flow, market gain/loss, dividends/distributions) so the numbers are unambiguous and reconcile back to the actual start/end values.
- Support both a portfolio-level rollup and a per-holding breakdown, since "which holdings drove the change" is the more common follow-up question.
- Reuse the existing `TimeRangeSelection` from the zoom/pan spec rather than introducing a separate range concept.

## 5. Non-Goals

- Real-time updating waterfall as the user zooms (the waterfall recomputes per request, same as any other chart series here, it doesn't need to support partial re-renders).
- Tax treatment of any component. That belongs to the withholding-tax work.
- A general "explain any two numbers" diffing tool. This is specific to portfolio value over a time range.

## 6. Proposed Data Spec

### 6.1 `WaterfallSegment`

```ts
type WaterfallSegment =
  | { kind: 'start'; label: string; value: number }
  | {
      kind: 'contribution';
      label: string;
      value: number;
      category: 'netCashFlow' | 'marketGainLoss' | 'dividends';
      holdingSymbol?: string;
    }
  | { kind: 'end'; label: string; value: number };
```

- `start.value` and `end.value` are absolute portfolio values (or holding values, in per-holding mode) in the account's base currency.
- Each `contribution.value` can be positive or negative. Summing `start.value` plus every `contribution.value` must equal `end.value` exactly; this identity is the main correctness check for the whole feature.
- `category` lets the chart color-code and group bars (e.g. all `marketGainLoss` bars one color, all `dividends` bars another), without the frontend needing to infer category from the label text.
- `holdingSymbol` is present only in per-holding breakdown mode (see 6.3); absent in the portfolio-level rollup.

### 6.2 Response shape

```ts
interface WaterfallResponse {
  startDate: string;
  endDate: string;
  currency: string;
  segments: WaterfallSegment[];
}
```

### 6.3 Portfolio-level vs. per-holding mode

- **Portfolio-level** (default): three contribution bars total, `netCashFlow`, `marketGainLoss`, `dividends`, each aggregated across the whole portfolio for the period.
- **Per-holding**: one `marketGainLoss` bar per holding held at any point during the period, plus a single aggregated `netCashFlow` bar (deposits/withdrawals aren't tied to a specific holding) and a single aggregated `dividends` bar, unless the caller asks to break dividends out per holding too (see open questions).

### 6.4 Category definitions

- **`netCashFlow`**: sum of deposits minus withdrawals during the period. This matches the same underlying activity data as the `investedCapital` series from the toggle spec, just expressed as a period delta rather than a running total.
- **`marketGainLoss`**: change in market value of holdings held during the period, excluding the effect of buys/sells adding or removing principal (i.e. the pure price-movement component). For a holding bought partway through the period, this is its value at period end minus its cost basis at time of purchase, not from `startDate`.
- **`dividends`**: total distributions received during the period, whether reinvested or paid as cash. This is intentionally shown as a separate positive bar even when reinvested, since the point of the chart is to make dividend contribution visible.

## 7. API Impact

### 7.1 Request shape

```
GET /api/v1/portfolio/waterfall?range=1y
GET /api/v1/portfolio/waterfall?range=1y&breakdown=holding
GET /api/v1/portfolio/waterfall?startDate=2026-01-01&endDate=2026-06-01
```

- `breakdown` is optional, `portfolio` (default) or `holding`.
- Standard range validation from the time-range spec applies unchanged.

### 7.2 Response shape

As in 6.2. New endpoint, no existing behavior to preserve.

## 8. Frontend State Model

The waterfall is presented as its own chart, likely as a secondary panel alongside the main performance chart (see the wireframe), sharing the same `TimeRangeSelection` state so zooming the main chart also narrows the waterfall to match. A `breakdown` toggle switches between portfolio-level and per-holding view without touching the date range.

## 9. Edge Cases

- **Holding fully sold during the period**: still included in per-holding breakdown, its `marketGainLoss` bar reflects gain/loss up to the sale, and its value doesn't carry into `end.value` since it's no longer held.
- **No activity at all in the period**: `netCashFlow` and `dividends` bars both show zero rather than being omitted, so the chart shape stays consistent regardless of how many bars there are.
- **Period where portfolio value is flat but has offsetting bars**: this is the primary case the feature is meant to surface, a large negative `netCashFlow` (withdrawal) offsetting a large positive `marketGainLoss`, and the identity check in 6.1 should make this exactly reconcile rather than approximately.
- **Currency conversion mid-period**: an activity in a foreign currency is converted to the account base currency at its own transaction date, consistent with how the rest of the app already handles this, not at `startDate` or `endDate`.

## 10. Backward Compatibility

New endpoint, no existing behavior affected. No schema changes, this is a computed aggregation over existing activity and price history data.

## 11. Open Questions

- Should dividends be breakable out per holding in `breakdown=holding` mode, rather than always aggregated? Leaning toward adding this as a second breakdown option later rather than the default, to keep the initial bar count manageable.
- How many per-holding bars is too many before the chart should group small ones into an "other" bucket? Proposing a threshold (e.g. group anything under 2% of total movement) but deferring the exact number to Iteration 2 once there's a real chart to look at.
- Should realized gains from a fully sold holding be visually distinguished from unrealized gains on holdings still held? Currently proposed as no distinction, both fall under `marketGainLoss`, but worth revisiting if early feedback wants that split.

## 12. Summary of Proposed Changes

- Add `WaterfallSegment` and `WaterfallResponse` types.
- Add a new `waterfall` endpoint with `range`/custom date params (reusing the time-range spec) and a `breakdown` param.
- Define `netCashFlow`, `marketGainLoss`, and `dividends` as the three contribution categories, computed from existing activity and price history data.
- No schema changes.
