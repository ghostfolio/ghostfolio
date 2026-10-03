# Charts Module

This module covers the chart subsystem: selectable time range (zoom/pan), the value/invested-capital/cash toggle, total-return vs. price-return comparison, the contribution/waterfall chart, benchmark comparison, and the drawdown chart. Full design docs for each live in `/docs/design/`, this README is the quick-reference API contract.

## Shared range contract

Every endpoint below accepts the same range params, so client code only needs to implement range handling once.

```
?range=1d|wtd|mtd|ytd|1y|5y|max
```

or

```
?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
```

Rules:

- `range` and `startDate`/`endDate` are mutually exclusive, sending both returns 400.
- `startDate`/`endDate` must both be present if either is, returns 400 otherwise.
- `endDate` before `startDate` returns 400.
- `endDate` beyond today is clamped to today.
- `startDate` before the account's earliest activity is clamped to that date.
- Granularity is resolved server-side from range width (daily up to 2 years, weekly beyond) and returned in the response, not requested by the client.

## Endpoints

### `GET /api/v1/portfolio/performance`

Portfolio value, invested capital, or cash as a time series.

Extra param: `kind` = `portfolioValue` (default) | `investedCapital` | `cash`

```ts
interface ChartSeriesResponse {
  kind: 'portfolioValue' | 'investedCapital' | 'cash';
  granularity: 'daily' | 'weekly';
  startDate: string;
  endDate: string;
  points: Array<{ date: string; value: number }>;
}
```

### `GET /api/v1/portfolio/return-comparison`

Total return vs. price return, indexed to base 100 at `startDate`.

Extra param: `symbol` (optional, omit for whole-portfolio scope)

```ts
interface ReturnComparisonResponse {
  granularity: 'daily' | 'weekly';
  startDate: string;
  endDate: string;
  points: Array<{ date: string; priceReturn: number; totalReturn: number }>;
}
```

### `GET /api/v1/portfolio/benchmark-comparison`

Portfolio total return vs. a benchmark symbol, both indexed to base 100.

Required param: `benchmark` (a market-data symbol, same lookup as adding a holding)

```ts
interface BenchmarkComparisonResponse {
  granularity: 'daily' | 'weekly';
  startDate: string;
  endDate: string;
  benchmarkSymbol: string;
  benchmarkAvailableFrom: string;
  points: Array<{
    date: string;
    portfolioReturn: number;
    benchmarkReturn: number;
  }>;
}
```

### `GET /api/v1/portfolio/drawdown`

Percentage decline from the portfolio's running all-time peak. Peak tracking always uses full account history, even when the requested range starts later.

```ts
interface DrawdownResponse {
  granularity: 'daily' | 'weekly';
  startDate: string;
  endDate: string;
  maxDrawdown: number;
  maxDrawdownDate: string;
  points: Array<{ date: string; drawdown: number; isNewPeak: boolean }>;
}
```

### `GET /api/v1/portfolio/waterfall`

Discrete start/contribution/end segments explaining a period's value change.

Extra param: `breakdown` = `portfolio` (default) | `holding`

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

interface WaterfallResponse {
  startDate: string;
  endDate: string;
  currency: string;
  segments: WaterfallSegment[];
}
```

## Design docs

| Area                                   | Doc                                                                |
| -------------------------------------- | ------------------------------------------------------------------ |
| Zoom / pan / selectable time range     | `docs/design/zoom-pan-time-range-data-spec.md`                     |
| Value / invested capital / cash toggle | `docs/design/portfolio-value-invested-capital-cash-toggle-spec.md` |
| Total return vs. price return          | `docs/design/total-return-vs-price-return-comparison-spec.md`      |
| Contribution / waterfall               | `docs/design/contribution-waterfall-chart-data-structure.md`       |
| Benchmark comparison                   | `docs/design/benchmark-comparison-data-model.md`                   |
| Drawdown                               | `docs/design/drawdown-chart-calculation-spec.md`                   |
| Overall architecture                   | `docs/design/design-architecture-charts.md`                        |

Adjust the paths above to wherever the docs actually land in the repo before merging.
