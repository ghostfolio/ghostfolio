# Chart Sub-Feature Issues (ready to paste into GitHub)

I can't file these directly, no GitHub connector is available in this environment. Copy each title/body pair below into "New issue" on the repo.

---

### Issue 1

**Title:** Design spec: zoom / pan / selectable time range

**Body:**
Add support for zooming, panning, and selecting a custom date range on the performance and dividend charts, in addition to the existing fixed presets (1D/WTD/MTD/YTD/1Y/5Y/Max).

Covers:

- `TimeRangeSelection` type (preset or custom start/end)
- Granularity resolution based on range width
- API validation and clamping rules for custom ranges

Design doc: `zoom-pan-time-range-data-spec.md`

---

### Issue 2

**Title:** Design spec: portfolio value / invested capital / cash toggle

**Body:**
Add a toggle on the performance chart to switch the plotted series between portfolio value, invested capital, and cash balance, each as a historical series rather than only a current-day number.

Covers:

- `ChartSeriesKind` type
- Historical series definitions for invested capital (step function) and cash
- Shared range/granularity handling with the zoom/pan work

Design doc: `portfolio-value-invested-capital-cash-toggle-spec.md`

---

### Issue 3

**Title:** Design spec: total return vs price return comparison

**Body:**
Add a comparison view showing total return (including dividends) against price return alone, as two aligned indexed series, at both portfolio and per-holding scope.

Covers:

- `ReturnComparisonResponse` shape (indexed, base 100)
- Portfolio-level vs. per-holding scope via `symbol` param
- Reuse of existing total-return calculation convention from ROAI

Design doc: `total-return-vs-price-return-comparison-spec.md`

---

### Issue 4

**Title:** Design spec: contribution / waterfall chart

**Body:**
Add a waterfall chart breaking a period's portfolio value change into net cash flow, market gain/loss, and dividends, at both portfolio and per-holding level.

Covers:

- `WaterfallSegment` type and category definitions
- Portfolio-level vs. per-holding breakdown mode
- Reconciliation identity (start + contributions = end)

Design doc: `contribution-waterfall-chart-data-structure.md`

---

### Issue 5

**Title:** Design spec: benchmark comparison

**Body:**
Add the ability to overlay a benchmark's indexed return (e.g. an index ETF) against the portfolio's own indexed return, using the existing market-data symbol lookup rather than a separate benchmark catalog.

Covers:

- `BenchmarkComparisonResponse` shape
- Handling a benchmark with shorter available history than the requested range
- Portfolio return basis (total return vs. benchmark's own convention)

Design doc: `benchmark-comparison-data-model.md`

---

### Issue 6

**Title:** Design spec: drawdown chart

**Body:**
Add a drawdown panel showing percentage decline from the portfolio's running all-time peak, plus a max-drawdown summary stat.

Covers:

- Drawdown calculation and full-history peak tracking (must not reset at the selected range's start)
- `maxDrawdown` / `maxDrawdownDate` summary fields
- Shared range/zoom state with the main performance chart

Design doc: `drawdown-chart-calculation-spec.md`

---

### Issue 7

**Title:** Wireframe: interactive chart UI

**Body:**
Low-fidelity wireframe of the combined chart screen: range presets + custom range, series toggle (value/invested/cash), total-vs-price-return overlay, benchmark selector, drawdown panel, and waterfall panel.

For reference while implementing the above specs, not a pixel-accurate design.

Wireframe: [Interactive Chart UI Wireframe](https://claude.ai/artifact/VL7vCVBCBdwpzHDCJbAifJ)
