# Design / Architecture: Charts

## 1. Overview

This section describes the architecture behind the chart subsystem covered by the individual design docs already written: selectable time range (zoom/pan), the value/invested-capital/cash toggle, total-return vs. price-return comparison, the contribution/waterfall chart, benchmark comparison, and the drawdown chart. Each of those docs defines its own data shape, this section is about how they fit together as one system rather than six unrelated features.

The core idea is that every chart in this subsystem is a view over the same underlying activity and price history data, requested through a small, shared contract, rather than six independent pipelines that each reinvent range handling, granularity, and currency conversion.

## 2. Layers

The subsystem is organized into four layers, each with a single responsibility:

```
┌─────────────────────────────────────────────────────────┐
│ Frontend rendering layer                                 │
│ Chart components (main chart, drawdown panel,             │
│ waterfall panel), range/zoom controls, toggles             │
└───────────────────────────┬─────────────────────────────┘
                            │  TimeRangeSelection + chart kind
┌───────────────────────────▼─────────────────────────────┐
│ Frontend state layer                                      │
│ Holds current TimeRangeSelection, active series kind,     │
│ active benchmark/comparison choices                        │
└───────────────────────────┬─────────────────────────────┘
                            │  HTTP request (range/date params)
┌───────────────────────────▼─────────────────────────────┐
│ API layer                                                  │
│ One endpoint per chart type (performance, waterfall,        │
│ benchmark-comparison, drawdown, return-comparison),          │
│ shared validation for range/date params                    │
└───────────────────────────┬─────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────┐
│ Aggregation / calculation layer                            │
│ Per-chart calculation logic (peak tracking, indexing,        │
│ waterfall categorization) reading from:                    │
└───────────────────────────┬─────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────┐
│ Data layer                                                  │
│ Existing activity records, price history, account/holding  │
│ data (unchanged by this work)                               │
└─────────────────────────────────────────────────────────┘
```

## 3. Shared Contract: `TimeRangeSelection`

Every chart in this subsystem, without exception, accepts the same range shape (preset or custom start/end date) and the same granularity resolution rule, both defined in the zoom/pan spec. This is the architectural decision that ties the whole subsystem together: it means

- a new chart type never needs to invent its own range handling,
- zoom/pan behavior on the main chart can be mirrored onto secondary panels (drawdown, waterfall) for free, since they consume the same selection object, and
- the frontend state layer only needs to track one range concept, not one per chart.

The one exception worth calling out is drawdown's peak tracking (see the drawdown spec, section 6.3), which intentionally looks further back than the selected range even though it's driven by the same `TimeRangeSelection`. That's a calculation-layer detail, not a break from the shared contract, the request still carries the same range shape.

## 4. Endpoint Boundaries

Rather than one large endpoint with a mode flag for every chart type, each chart type gets its own endpoint:

| Chart                           | Endpoint                              | Response shape                                                     |
| ------------------------------- | ------------------------------------- | ------------------------------------------------------------------ |
| Value / invested capital / cash | `GET /portfolio/performance`          | `ChartSeriesResponse` (single value per point, tagged with `kind`) |
| Total return vs. price return   | `GET /portfolio/return-comparison`    | `ReturnComparisonResponse` (two indexed values per point)          |
| Benchmark comparison            | `GET /portfolio/benchmark-comparison` | `BenchmarkComparisonResponse` (two indexed values per point)       |
| Drawdown                        | `GET /portfolio/drawdown`             | `DrawdownResponse` (percentage plus max-drawdown summary)          |
| Waterfall                       | `GET /portfolio/waterfall`            | `WaterfallResponse` (discrete segments, not a time series)         |

This split exists because the response shapes are genuinely different (absolute values vs. indexed pairs vs. discrete segments), and folding them into one endpoint with a mode param would just move that branching into every client instead of removing it. The shared piece is the range/date query params and validation, not the endpoint itself.

## 5. Calculation Layer Responsibilities

Each chart's calculation logic lives behind its endpoint and is responsible for exactly one thing:

- **Performance (toggle)**: resolve `kind` to the right historical series (portfolio value, invested capital as a step function, or cash balance).
- **Return comparison**: index both series to base 100 at the range start, using the existing total-return convention already used for ROAI.
- **Benchmark comparison**: resolve the benchmark symbol through the existing market-data lookup, index it alongside the portfolio's total return, clamp to the benchmark's available history if shorter than the requested range.
- **Drawdown**: track the running peak over full account history (never reset at the selected range's start), compute percentage decline per point.
- **Waterfall**: aggregate activity records into `netCashFlow`, `marketGainLoss`, and `dividends` contribution bars, either at portfolio level or per holding.

None of these calculations touch the database schema, they all read from data that already exists (activities, price history, account/holding records).

## 6. Frontend Composition

The wireframe already produced shows this in practice: one screen holding

- a toolbar (range presets/custom picker, series toggle, return-overlay checkbox, benchmark selector),
- a main chart canvas,
- two secondary panels (drawdown, waterfall).

Architecturally, the main chart and the two secondary panels are siblings that all read from the same `TimeRangeSelection` in the frontend state layer, rather than the secondary panels being children of the main chart component. This is what lets zooming the main chart also narrow the drawdown and waterfall panels without those panels needing any direct awareness of the main chart's internal state, they just react to the same shared selection changing.

## 7. Extension Points

The architecture is set up so a future chart type (e.g. a risk-adjusted metrics chart, mentioned as an open question in the benchmark spec) can be added by:

1. Defining its own response shape (time series or discrete segments, whichever fits).
2. Adding one endpoint that accepts the standard range/date params.
3. Adding one calculation module that reads from the existing data layer.
4. Wiring a new panel into the frontend that subscribes to the existing shared `TimeRangeSelection` state.

No existing endpoint, response shape, or calculation module needs to change to support this, which is the main payoff of standardizing on the shared range contract early rather than after several charts already existed with their own bespoke range handling.

## 8. Summary

- Four layers: data (unchanged), calculation (one module per chart), API (one endpoint per chart, shared range contract), frontend (shared selection state, sibling chart components).
- `TimeRangeSelection` is the single architectural seam every chart type passes through, this is what keeps zoom/pan behavior consistent across the whole subsystem instead of being reimplemented per chart.
- Separate endpoints per chart type, because response shapes genuinely differ, not because of a lack of a shared layer, the shared layer is the range contract, not the response format.
