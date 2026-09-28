# Design Doc: Benchmark Comparison - Data Model

**Status:** Draft (Iteration 1)
**Author:** _fill in_
**Scope:** Docs only, no code changes yet. Defines the data model a future iteration will implement.

## 1. Summary

Users want to know if their portfolio is beating a plain index like the S&P 500, not just whether it went up. This doc proposes a data model for overlaying a benchmark's indexed return against the portfolio's own indexed return on the same chart, reusing a market-data symbol (rather than a hardcoded list) as the benchmark.

## 2. Problem Statement

A portfolio up 8% over a year sounds good in isolation, but not if a relevant index was up 15% over the same period. Right now there's no way to see that comparison without opening a separate tab and eyeballing two unrelated charts. This is one of the most requested comparisons in personal finance tools generally, and Ghostfolio has no data model for it yet.

## 3. Current State (for context)

Ghostfolio already tracks arbitrary symbols for holdings and fetches historical price data for them from its market data providers. There's no existing concept of a "benchmark" separate from a regular holding, this doc proposes benchmarks be modeled as an ordinary symbol lookup, not a special data type, since the underlying data (a security's price history) is identical either way.

## 4. Goals

- Define a `BenchmarkComparisonResponse` returning the portfolio's and the benchmark's indexed return series aligned to the same dates.
- Model a benchmark as just a symbol string, reusing the existing market-data symbol lookup rather than building a separate benchmark catalog.
- Handle the common case where a benchmark's available history doesn't fully cover the requested range (e.g. an ETF that launched more recently than the account's oldest activity).
- Reuse the existing `TimeRangeSelection` and granularity rules already defined.

## 5. Non-Goals

- A curated list of "popular benchmarks" for the UI to suggest. That's a frontend/UX concern for Iteration 2, this doc only defines the data contract for an arbitrary chosen symbol.
- Per-holding benchmarking (comparing one holding against a sector index). This doc is scoped to whole-portfolio comparison; per-holding can reuse the same shape later if wanted, but isn't specified here.
- Risk-adjusted comparison metrics (Sharpe ratio, alpha, beta). Those are separate analytical features that could consume this same data later, not part of this spec.

## 6. Proposed Data Spec

### 6.1 Benchmark identification

A benchmark is just `{ symbol: string }`, resolved through the same symbol lookup already used for holdings (ticker plus data source, e.g. Yahoo, the same way a stock or ETF is added to a portfolio today). No new benchmark-specific entity is introduced.

### 6.2 Response shape

```ts
interface BenchmarkComparisonResponse {
  granularity: 'daily' | 'weekly';
  startDate: string;
  endDate: string;
  benchmarkSymbol: string;
  benchmarkAvailableFrom: string; // earliest date the benchmark actually has data
  points: Array<{
    date: string;
    portfolioReturn: number; // indexed, base 100 at startDate
    benchmarkReturn: number; // indexed, base 100 at startDate
  }>;
}
```

- Both return series are indexed to 100 at `startDate`, matching the convention already used in the total-return vs. price-return spec, so the two comparisons stay visually and conceptually consistent with each other.
- `benchmarkAvailableFrom` lets the frontend show a note like "benchmark data starts later than the selected range" without needing a separate request to find that out.

### 6.3 Portfolio return basis

The portfolio side of the comparison uses total return (the same convention as the return-comparison spec, including dividends), since comparing a dividend-inclusive portfolio against a price-only benchmark index would understate the portfolio unfairly. If the benchmark symbol itself is a total-return index variant (some data providers offer both price and total-return versions of the same index), that's a data-source detail resolved at lookup time, not something this spec needs to model differently.

## 7. API Impact

### 7.1 Request shape

```
GET /api/v1/portfolio/benchmark-comparison?range=1y&benchmark=SPY
GET /api/v1/portfolio/benchmark-comparison?startDate=2026-01-01&endDate=2026-06-01&benchmark=VTI
```

Validation rules:

- `benchmark` is required, there's no meaningful default.
- If the symbol can't be resolved through the existing market-data lookup, return a 404, consistent with how adding an unrecognized holding symbol already behaves.
- If the benchmark's available history starts after the requested `startDate`, don't reject the request, clamp the comparison to start from `benchmarkAvailableFrom` instead and report that clamped `startDate` in the response, mirroring how the time-range spec already clamps to available portfolio history rather than rejecting.

### 7.2 Response shape

As shown in 6.2. New endpoint, no existing behavior to preserve.

## 8. Frontend State Model

A benchmark selector (searchable symbol input, reusing the existing add-holding search component) sits alongside the range and series controls. Selecting a benchmark overlays its line on the existing return chart rather than replacing it, and clearing the selection removes the overlay without affecting the underlying portfolio series or the active range/zoom state.

## 9. Edge Cases

- **Benchmark has a data gap on a day the portfolio has a point (market holiday differences, e.g. a foreign index)**: carry forward the benchmark's last known value for that date rather than leaving a gap in `points`, so the two series stay aligned point-for-point.
- **User picks their own holding as the benchmark**: allowed, there's no reason to special-case it, the same symbol lookup and indexing logic applies regardless of whether the symbol happens to also be held in the portfolio.
- **Very short range (a few days) on a low-liquidity benchmark with sparse pricing**: same carry-forward behavior as the gap case above, this isn't a distinct edge case, just the general rule applied more often.
- **Currency mismatch between benchmark and account base currency**: benchmark prices are converted to the account's base currency before indexing, same conversion approach used elsewhere in the app.

## 10. Backward Compatibility

New endpoint, no existing behavior affected. No schema changes, benchmarks are resolved through the existing symbol/market-data lookup rather than a new stored entity.

## 11. Open Questions

- Should a user be able to save a "default benchmark" preference so it's pre-selected next time, rather than re-picking it every session? Reasonable follow-up, not required for the initial data model.
- Should multiple benchmarks be comparable at once (portfolio vs. two indices)? The response shape here is built around exactly one benchmark; supporting more would mean an array of benchmark series rather than a single pair, worth flagging now in case Iteration 2 wants to design for it from the start.
- Does the total-return convention need to be configurable (price-only vs. total-return comparison), rather than always defaulting to total return on the portfolio side? Leaning no for the initial version, but noting it since it mirrors an open question already raised in the return-comparison spec.

## 12. Summary of Proposed Changes

- Add a new `benchmark-comparison` endpoint returning aligned `portfolioReturn`/`benchmarkReturn` indexed series.
- Model a benchmark as an existing market-data symbol, no new benchmark entity.
- Add clamping behavior for benchmarks with shorter available history than the requested range.
- Reuse the existing `TimeRangeSelection` and granularity rules, no new range concept.
- No schema changes.
