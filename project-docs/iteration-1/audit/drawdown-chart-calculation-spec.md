# Design Doc: Drawdown Chart - Calculation Spec

**Status:** Draft (Iteration 1)
**Author:** _fill in_
**Scope:** Docs only, no code changes yet. Defines the calculation and data shape a future iteration will implement.

## 1. Summary

A drawdown chart shows how far a portfolio has fallen from its running peak value at every point in time, which is one of the clearest ways to communicate downside risk. This doc defines exactly how drawdown is calculated, what data shape it's returned in, and how it interacts with the zoom/pan and custom-range work already spec'd.

## 2. Problem Statement

Portfolio value and return charts show growth well but don't communicate risk or volatility clearly. Two portfolios can have the same ending return while one had a much rougher ride to get there. A drawdown chart, and the single "max drawdown" number that's commonly quoted alongside it, gives a fast, intuitive read on that.

## 3. Current State (for context)

There's no existing peak-tracking or drawdown calculation anywhere in the app. This is a new calculation built on top of the existing portfolio value series (the same underlying series behind the `portfolioValue` chart kind from the toggle spec).

## 4. Goals

- Define drawdown precisely: percentage decline from the highest portfolio value seen so far, at each point in time.
- Get the peak-tracking window right: drawdown for a custom or zoomed range must be computed using the portfolio's full history up to each point, not reset to zero at the start of whatever window happens to be selected.
- Define a `maxDrawdown` summary value alongside the series, since that single number is often what people actually want at a glance.
- Reuse the existing `TimeRangeSelection` and granularity rules.

## 5. Non-Goals

- Drawdown duration/recovery time analysis (how long a drawdown lasted, how long recovery took). That's a reasonable follow-up metric but isn't part of this spec's response shape.
- Per-holding drawdown. This spec is scoped to whole-portfolio drawdown; the same calculation could apply per-holding later, but isn't defined here.
- Drawdown-based alerts or notifications. Purely a chart/calculation spec.

## 6. Proposed Data Spec

### 6.1 Drawdown definition

At any date `d`, let `peak(d)` be the highest portfolio value at any date on or before `d`, going back to the start of the account's history (not the start of the selected chart range, see 6.3). Then:

```
drawdown(d) = (portfolioValue(d) - peak(d)) / peak(d)
```

This is always zero or negative, expressed as a percentage. A value of `-0.12` means the portfolio is currently 12% below its all-time high as of that date.

### 6.2 Response shape

```ts
interface DrawdownResponse {
  granularity: 'daily' | 'weekly';
  startDate: string;
  endDate: string;
  maxDrawdown: number; // most negative drawdown value within the returned points
  maxDrawdownDate: string; // the date at which maxDrawdown occurred
  points: Array<{ date: string; drawdown: number; isNewPeak: boolean }>;
}
```

`isNewPeak` marks dates where `portfolioValue(d) == peak(d)` (drawdown is exactly zero because a new all-time high was just hit), which lets the chart optionally mark peaks distinctly from ordinary zero-crossing points.

### 6.3 Peak tracking uses full history, not just the visible window

This is the one detail most likely to be gotten wrong, so it's called out on its own: `peak(d)` must be computed using portfolio value going back to the very start of the account's history, even when the requested chart range starts later. If peak tracking were reset at the selected `startDate`, then zooming into any window would make drawdown at the start of that window incorrectly show `0%`, even if the portfolio was already well below its true all-time high at that point. The `points` array only covers the requested range, but each point's `drawdown` value must reflect the true, full-history peak as of that date.

## 7. API Impact

### 7.1 Request shape

```
GET /api/v1/portfolio/drawdown?range=5y
GET /api/v1/portfolio/drawdown?startDate=2026-01-01&endDate=2026-06-01
```

Standard range validation from the time-range spec applies unchanged. No new params beyond the existing range/date ones, since peak tracking is always full-history by definition (6.3) and isn't a configurable option.

### 7.2 Response shape

As shown in 6.2. New endpoint, no existing behavior to preserve.

## 8. Frontend State Model

Shown as a secondary panel below or beside the main performance chart (see the wireframe), sharing the same `TimeRangeSelection` so zooming the main chart also zooms the drawdown panel to the same window, while the underlying peak calculation still uses full history per 6.3. `maxDrawdown` and `maxDrawdownDate` can be surfaced as a small stat next to the panel rather than requiring the user to visually find the lowest point themselves.

## 9. Edge Cases

- **Account with less than one data point of history**: drawdown is `0` for the single available point, `maxDrawdown` is `0`, there's no meaningful drawdown to compute yet.
- **Portfolio at an all-time high for the entire selected range**: every point has `drawdown: 0` and `isNewPeak: true` wherever the value strictly exceeds the prior peak, this is a valid and simple case, not an error or empty state.
- **Selected range entirely within a single ongoing drawdown that started before the range and hasn't recovered by the range's end**: this is exactly the case 6.3 is designed to handle correctly, every point's drawdown reflects distance from the true prior peak, not from the value at the range's own start.
- **Multi-currency portfolios**: drawdown is computed on the same base-currency portfolio value series already used elsewhere, no separate currency handling needed here.

## 10. Backward Compatibility

New endpoint, no existing behavior affected. No schema changes, this is a computed series over the existing portfolio value history.

## 11. Open Questions

- Should `maxDrawdown` in the response be the max within the visible range, or always the true all-time max drawdown regardless of the selected range? Proposing within-range as the default (matching how a zoomed chart's own stat should describe what's on screen), with the true all-time max available separately by requesting `range=max`.
- Is percentage-based drawdown sufficient, or should an absolute-currency drawdown also be available? Leaning percentage-only for the initial version since it's the more standard convention and comparable across accounts of different sizes.
- Should recovery time (dates from trough back to a new peak) be added as a follow-up field later? Noted as a likely next iteration, not included here per section 5.

## 12. Summary of Proposed Changes

- Add a new `drawdown` endpoint returning per-date drawdown percentage plus a `maxDrawdown` summary.
- Define peak tracking as always full-history, independent of the requested chart range, to avoid incorrect drawdown values at the start of a zoomed window.
- Reuse the existing `TimeRangeSelection` and granularity rules, no new range concept.
- No schema changes.
