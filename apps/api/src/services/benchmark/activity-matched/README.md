# Activity-Matched Benchmark

Activity-Matched Benchmark provides an alternative method for comparing
portfolio investment activity with a selected market benchmark.

It supports two comparison methods:

- Activity-Matched ROI, based on changes in invested cost.
- Activity-Matched ROAI, based on calendar-day-weighted invested capital.

The implementation is integrated into Ghostfolio's NestJS benchmark service
and is available when experimental features are enabled.

The existing Traditional Ghostfolio benchmark remains the default.

The financial engine uses signed investment proxies, not verified external
cash flows. Positive amounts represent purchases; negative amounts represent
sale proceeds. Monetary calculations use the existing big.js dependency.

## Architecture

The implementation is organized into three logical layers.

### Financial engine

The financial engine contains the calculation and simulation logic.
It is implemented in pure TypeScript and uses `big.js` for decimal
arithmetic.

Its responsibilities include:

- Normalizing investment flows and historical prices.
- Simulating benchmark units and financial positions.
- Tracking remaining cost basis and realized gains.
- Maintaining the canonical financial timeline.
- Evaluating ROI and ROAI over selected date ranges.

### Ghostfolio integration

`ActivityMatchedBenchmarkService` coordinates the production workflow.

It retrieves portfolio activities through `ActivitiesService`, resolves
the benchmark instrument through `SymbolService`, and obtains historical
market data through dedicated providers.

`BenchmarkMarketDataProvider` retrieves historical benchmark prices.
`BenchmarkFxMarketDataProvider` retrieves historical exchange-rate quotes.

`ActivityMatchedBenchmarkModule` registers the dependencies required by
the integration.

### Valuation and presentation

The display valuation adapter converts benchmark prices into the
portfolio's base currency and produces valuation metadata.

The performance-series adapter combines financial observations and
display valuations into the date/value series returned by the benchmark
service.

Display-only observations do not alter the financial evaluation timeline.

## Activity funding policy

The integration reconstructs investment funding from portfolio activities.

The current policy is intentionally limited to BUY and SELL activities.

| Activity type        | Funding treatment         |
| -------------------- | ------------------------- |
| BUY                  | Positive investment proxy |
| SELL                 | Negative investment proxy |
| CASH                 | Excluded                  |
| DIVIDEND             | No funding flow generated |
| FEE                  | No funding flow generated |
| INTEREST             | No funding flow generated |
| Other activity types | Unsupported for funding   |

Funding amounts are taken from `valueInBaseCurrency` and are therefore
expressed in the portfolio's base currency.

Positive amounts represent purchases; negative amounts represent sale
proceeds. Original activity dates are retained as economic event dates.

These flows are investment proxies, not verified external cash flows.
The implementation does not reconstruct the complete cash ledger or
interpret every portfolio activity as a contribution or withdrawal.

Unsupported activity types are reported through funding diagnostics and
do not generate flows. Invalid amounts or dates prevent simulation.

Cash activities are explicitly excluded from this funding model.

## Historical market data and valuation

The benchmark market-data provider retrieves original closing quotes:

- Only `MarketDataState.CLOSE` observations are selected.
- Existing carried-forward observations are excluded.
- The latest original quote preceding the requested start date is also retrieved.
- Historical observations within the requested range are returned chronologically.

### Execution prices

The default maximum execution-price age is seven calendar days.

When no quote exists on an execution date, the latest preceding original
quote may be carried forward within the configured age limit.

Missing or stale execution prices cause an error.

### Display valuations

Display valuations use the latest preceding benchmark quote.

The default maximum display-price age is also seven calendar days.

Each valuation records:

- Its valuation date and currency.
- Its calculated value.
- The original benchmark quote date.
- The FX conversion components.
- Its valuation status: `CURRENT`, `CARRIED_FORWARD` or `NOT_APPLICABLE`.

The displayed benchmark value is calculated from simulated units multiplied
by the benchmark price converted into the portfolio's base currency.

Observations without positive benchmark units are marked `NOT_APPLICABLE`.

## Foreign-exchange conversion

Historical FX quotes are retrieved through Ghostfolio's existing
`DataProviderService` and market-data infrastructure.

The conversion adapter supports four methods:

| Method     | Description                                                                                     |
| ---------- | ----------------------------------------------------------------------------------------------- |
| `IDENTITY` | No conversion is required because both currencies are identical.                                |
| `DIRECT`   | Uses a direct currency-pair quote.                                                              |
| `INDIRECT` | Combines two market quotes through an intermediate currency.                                    |
| `DERIVED`  | Applies fixed conversion ratios for derived currencies, optionally combined with market quotes. |

Inverse market quotes are supported when the corresponding direct pair is
unavailable.

The default maximum FX quote age is seven calendar days.

Missing or stale FX quotes cause an error. A stale direct quote does not
automatically fall back to an inverse quote. Indirect conversions validate
each market component independently.

Conversion results retain their method, rate and component information,
including source dates, quote ages and whether a component is a market quote
or a fixed conversion ratio.

When no FX conversion is required, the identity conversion uses a rate of one.

## Financial conventions

Remaining average cost is reduced proportionally on sales. Realized gain survives
complete liquidation; contributions and withdrawals remain separate totals.
Historical investment means remaining cost, not cumulative signed proxy amounts.
Range profit subtracts the first included point's cumulative profit. ROI starts
with that point's market value and adds positive changes in daily closing cost.
ROAI uses upstream historical range weighting: positive-cost intervals only,
opening unrealized gain added to the investment basis, and the endpoint day
included when endpoint investment is positive. Percentages are return fractions.

The parity spec invokes the existing protected pure historical range methods
without constructing calculators/services. Both methods agree to 12 decimal
places on identical history across four selected ranges. Existing upstream
same-day BALN ROI and BTC partial-sale ROI/ROAI suites also pass unchanged.
This does not establish parity for holding-level or aggregate snapshot ROAI.

Important financial convention: a profitable sale removes COST, not proceeds,
from historical investment. A same-day sale of all units for 120 followed by a
120 purchase, with prior cost 100, increases ROI capital by 20. Same-day flows
net only to the extent that their cost changes net. Dedicated engine tests cover this behavior.

The canonical financial timeline is the union of every supplied price date and
economic event date. Requested display dates are added as carry-forward rows;
rows with no price/event on that date are marked `displayOnly` and ignored by
range evaluation. Changing display sampling therefore cannot discard events or
move the financial baseline. The full supplied financial history is retained,
including price dates outside the requested display period; use explicit range
bounds to select a period. Selected ranges use the first canonical observation
on/after start and the last on/before end, exactly as upstream does on its input
history. No artificial boundary valuation is inserted. If a range contains no
canonical observation, evaluation returns an empty array. With no prices or
events, requested dates remain zero-valued observations.

Upstream parity holds on identical financial histories. An upstream history
already missing event dates or boundary observations cannot recover those facts;
its denominators and baseline can therefore differ. Upstream chart output should
be sampled only after evaluating the complete agreed financial timeline.

Execution and display valuations can use the latest preceding original
quote within their respective configured age limits. Missing or stale quotes,
duplicate prices, invalid dates, nonpositive prices and excess withdrawals
cause errors. Same-day input flow order is preserved; one financial snapshot
follows all flows. There is no settlement queue. Fully liquidated intervals
remain in history.

### Liquidation precision

The former relative `1e-18` tolerance has been removed. An amount-based withdrawal
strictly rejects **any** excess over the current units times execution price.
Explicit `{ date, kind: 'liquidate' }` instead sells all actual units at that
price and clears units/cost exactly. It has no amount field; contradictory inputs
are rejected. The caller must explicitly choose this intent: it must not be
inferred just because a proxy withdrawal is close to the available value.

Example: 10/3 units at Big.DP=20 are rounded. A nominal 12 withdrawal at price 3.6
can exceed their actual decimal value and now throws. Explicit liquidation
withdraws their actual value, without silently rewriting a requested amount.
Partial sales use the upstream proportional average-cost rule. If configured
precision would round a partial sale to zero/all units or zero/all cost, throw
`Insufficient division precision` rather than silently change its intent.
Purchases rounding to zero units also throw. Tests preserve residual units of
`1e-19` at default precision and test rounding failures beyond that precision.

The financial engine honors the caller's Big.DP and Big.RM; it does not change global
settings. Tests restore settings with finally, cover DP 0, 2, 20, 40, and all
four rounding modes. Normal finite-precision purchase rounding still affects the
represented units/value. Integration must agree on a precision policy; this is
not an arbitrary-precision rational-unit engine. Explicit liquidation is based
on represented units and never permits an overdraft.

## Numerical fixtures

Daily observations on days 0, 1, 2; opening purchase is included in baseline:

| Flows          | Prices   | Gain | ROI       | ROAI       |
| -------------- | -------- | ---- | --------- | ---------- |
| +100           | 10,10,12 | 20   | 20%       | 20%        |
| +100,+100      | 10,10,12 | 40   | 20%       | 24%        |
| +100,-50       | 10,10,12 | 10   | 10%       | 15%        |
| +100,-60       | 10,12,14 | 30   | 30%       | 45%        |
| +100,-120      | 10,12,12 | 20   | 20%       | 20%        |
| +100,-80       | 10,8,8   | -20  | -20%      | -20%       |
| +100,-120,+120 | 10,12,12 | 20   | 9.090909% | 18.181818% |

For the profitable partial sale, ending units=5, cost=50, realized gain=10,
withdrawals=60, value=70. Gain=70-50+10=30. ROAI capital=(100+50+50)/3.
For selected-range opening value 120 and closing value 132, both methods produce
12/120=10%, excluding the prior 20 gain. Irregular observations separately test
calendar-day weighting rather than averaging observation values.

## Verification and reproduction

From repository root (already-installed dependencies only):

```bash
./node_modules/.bin/jest --config apps/api/jest.config.ts --runInBand --runTestsByPath apps/api/src/services/benchmark/activity-matched/activity-matched-benchmark.spec.ts apps/api/src/services/benchmark/activity-matched/activity-matched-benchmark.parity.spec.ts
BENCHMARK_PERFORMANCE=1 ./node_modules/.bin/jest --config apps/api/jest.config.ts --runInBand --runTestsByPath apps/api/src/services/benchmark/activity-matched/activity-matched-benchmark.performance.spec.ts
```

Upstream suites need `.env.example` loaded, as in the repository test workflow.
The installed dotenv executable uses `dotenv run -f .env.example -- COMMAND`.
An earlier configuration-validation failure was resolved by loading that file;
all six selected upstream tests passed then. The current engine tests retain those fixtures and
adds precision, dense/sparse timeline and normalized-input reuse assertions.

See [PROFILING.md](./PROFILING.md) for benchmark stage timings and controlled
before/after evaluation measurements. Earlier implementation totals used a different, display-
dependent timeline and must not be treated as an optimization baseline.

For E events, P prices, D requested dates and N <= E+P+D output dates, sorting
costs O(E log E + P log P + N log N). The simulation merge costs O(E+P+N).
Each range evaluation costs O(N), with linear memory. Big operation costs depend
on operand length and division precision. No per-date reconstruction or queries.

The evaluator validates, selects and evaluates in one pass, without allocating a
filtered history. ROI no longer calculates ROAI denominators, and vice versa.
Each independent public evaluation still validates its input; combined evaluation
in the harness deliberately measures ROI followed by ROAI, not a new financial
method. A future shared preparation stage could remove repeated validation but
would require a trusted/immutable history contract.

The implementation supports historical benchmark pricing and FX conversion
under the documented quote-age policies. Its funding model remains limited
to BUY/SELL investment proxies and excludes cash activities. Dividends, fees
and interest do not generate funding flows. The feature does not replace
Ghostfolio portfolio TWR or MWR calculations.
