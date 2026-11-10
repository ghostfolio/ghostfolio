# Activity-matched financial prototype

Isolated pure TypeScript; no production imports or registration. Flows are signed
investment proxies, not verified external cash flows. Positive amounts buy units;
negative amounts withdraw sale proceeds. Inputs are not mutated. Monetary inputs
are decimal strings and internal arithmetic uses the existing big.js dependency.
All amounts/prices must already be in one common currency. No FX, dividends,
fees, cash yield, leverage, TWR or MWR are implemented. Net performance equals
gross performance only under these zero-fee, price-only assumptions.

## Financial conventions and upstream comparison

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

Important clarification to Task 1: a profitable sale removes COST, not proceeds,
from historical investment. A same-day sale of all units for 120 followed by a
120 purchase, with prior cost 100, increases ROI capital by 20. Same-day flows
net only to the extent that their cost changes net. The prototype tests this.

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

Execution requires an exact-date quote. Display carry-forward uses only the last
preceding quote, without a staleness limit. Duplicate prices, invalid dates,
nonpositive prices, missing execution quotes and excess withdrawals throw.
Same-day input flow order is preserved; one financial snapshot follows all flows.
There is no settlement queue. Fully liquidated intervals remain in history.

### Liquidation precision (Task 3)

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

The prototype honors the caller's Big.DP and Big.RM; it does not change global
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
./node_modules/.bin/jest --config apps/api/jest.config.ts --runInBand --runTestsByPath apps/api/src/services/benchmark/prototype/activity-matched-benchmark.spec.ts apps/api/src/services/benchmark/prototype/activity-matched-benchmark.parity.spec.ts
BENCHMARK_PERFORMANCE=1 ./node_modules/.bin/jest --config apps/api/jest.config.ts --runInBand --runTestsByPath apps/api/src/services/benchmark/prototype/activity-matched-benchmark.performance.spec.ts
```

Upstream suites need `.env.example` loaded, as in the repository test workflow.
The installed dotenv executable uses `dotenv run -f .env.example -- COMMAND`.
Task 2's configuration-validation failure was resolved by loading that file;
all six selected upstream tests passed then. Task 3 retains those fixtures and
adds precision, dense/sparse timeline and normalized-input reuse assertions.

See [PROFILING.md](./PROFILING.md) for Task 3 stage timings and controlled
before/after evaluation measurements. Task 2 totals used a different, display-
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

Review before integration: missing-price/staleness policy, range-boundary
sampling, precision policy, cash treatment and supported portfolio scopes remain
unresolved. FX, dividends, fees, Ledger, TWR and MWR remain outside this task.
