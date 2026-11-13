# Activity-Matched Benchmark Performance Profiling

Measured 2026-11-09, Node 22.23.4, Linux x86_64, installed Jest/ts-jest.
No dependencies added. Run the performance spec with `BENCHMARK_PERFORMANCE=1`;
`PROFILE_LABEL` labels its JSON output. Deterministic inputs, one warm-up and
seven measured iterations per workload. Each cell is median/p95 milliseconds;
p95 uses nearest rank (the maximum of seven). These are small-sample observations,
not a production SLA. Runtime/GC contention can affect individual samples.

Prices cover a fixed 10,000-day financial timeline. Events and requested valuation
counts vary independently. Valuation dates are subsets of the price timeline:
all workloads therefore evaluate 10,000 canonical points, verifying that display
sampling does not remove financial history. Dataset construction, assertions,
Jest startup, transforms and printing are excluded from measured stages.

Normalization includes decimal/date validation, stable event ordering, price
sorting, duplicate checks and timeline/set construction. Simulation consumes the
normalized input once. ROI and ROAI include range validation and output allocation.
Combined evaluation is the contiguous ROI-then-ROAI interval. Total spans
normalization through both evaluations, with no repeated simulation. Quantiles of
stages need not sum to the quantile of their combined interval.

## After optimization

| Events | Valuation dates | Normalize/sort |    Simulation |          ROI |          ROAI | Combined evaluation |         Total |
| -----: | --------------: | -------------: | ------------: | -----------: | ------------: | ------------------: | ------------: |
|    500 |             100 |    28.29/30.60 |   30.19/32.76 |  75.58/76.95 | 383.63/407.03 |       459.45/481.57 | 516.32/532.67 |
|    500 |            1000 |    29.83/31.25 |   27.39/28.36 |  79.87/80.73 | 381.99/392.07 |       461.86/472.80 | 518.54/531.00 |
|    500 |           10000 |    45.52/45.84 |   27.67/34.20 |  79.04/82.30 | 388.63/400.58 |       465.67/478.94 | 538.88/553.88 |
|   2000 |             100 |    30.49/32.17 |   45.26/49.61 | 82.95/119.81 | 397.38/399.79 |       482.66/517.28 | 559.56/594.16 |
|   2000 |            1000 |    32.31/33.34 |   42.27/46.72 |  80.47/81.84 | 392.95/404.99 |       472.65/486.72 | 547.58/563.11 |
|   2000 |           10000 |    45.76/69.99 |   44.64/49.25 |  84.74/91.98 | 400.32/443.12 |       485.39/535.10 | 577.46/654.34 |
|  10000 |             100 |    44.51/48.83 | 137.65/179.72 |  92.25/95.71 | 397.89/404.42 |       490.73/498.14 | 676.61/724.22 |
|  10000 |            1000 |    46.23/52.20 | 141.75/143.83 |  89.34/90.99 | 400.74/413.15 |       490.48/503.75 | 679.13/697.59 |
|  10000 |           10000 |   63.05/117.10 | 138.57/140.43 |  89.68/91.67 | 398.59/443.31 |       489.42/532.23 | 691.94/738.07 |

## Before evaluator optimization, on the same hardened timeline

This pre-optimization baseline already includes explicit liquidation and complete price
history. Only evaluator scan/allocation and method-specific computation changed
between these runs. Input normalization and simulation were not optimized.

| Events | Valuation dates | Normalize/sort |    Simulation |           ROI |          ROAI | Combined evaluation |          Total |
| -----: | --------------: | -------------: | ------------: | ------------: | ------------: | ------------------: | -------------: |
|    500 |             100 |    27.27/28.82 |   31.48/32.68 | 202.52/239.34 | 419.89/424.69 |       622.07/658.63 |  680.86/710.13 |
|    500 |            1000 |    29.15/30.05 |   26.82/27.89 | 205.00/211.23 | 423.57/437.02 |       631.63/646.71 |  683.45/703.93 |
|    500 |           10000 |    41.65/44.45 |   26.89/28.41 | 209.05/231.92 | 432.31/436.97 |       638.00/668.68 |  708.59/733.18 |
|   2000 |             100 |    27.45/29.99 |   45.22/48.29 | 216.06/221.51 | 451.27/461.89 |       672.78/678.25 |  745.14/753.83 |
|   2000 |            1000 |    29.68/30.54 |   44.64/47.99 | 211.54/217.64 | 436.69/492.40 |       650.05/703.26 |  726.25/775.53 |
|   2000 |           10000 |    42.76/45.83 |   41.82/46.96 | 209.54/221.60 | 441.95/484.95 |       663.56/694.50 |  750.77/783.86 |
|  10000 |             100 |    42.23/44.75 | 137.42/141.64 | 222.78/227.41 | 446.42/453.41 |       665.93/676.44 |  843.06/860.69 |
|  10000 |            1000 |    46.95/47.57 | 140.60/149.49 | 218.70/257.88 | 443.07/476.38 |       661.77/734.26 |  853.79/931.31 |
|  10000 |           10000 |    61.02/63.20 | 139.23/158.20 | 217.86/292.34 | 445.13/541.61 |       662.51/833.96 | 860.26/1055.35 |

The optimized evaluator merges validation, range selection and output production
into one scan instead of validation + filter + map. It avoids the filtered-array
allocation and repeated date parsing. ROI does not calculate weighted ROAI
capital; ROAI does not accumulate ROI capital. Arithmetic order within each
chosen method is preserved, as confirmed by deterministic fixtures and direct
upstream method comparisons. Median combined evaluation fell by 25.9–28.3%;
median total time fell by 19.6–24.9%. ROAI remains the dominant evaluation cost.

Both public evaluations still independently validate the history; no shared cache
or trust boundary was introduced. Retaining linear scans is preferable here to
repeated reconstruction or introducing hidden shared mutable prepared state.

Earlier implementation totals are not directly comparable: its output timeline omitted price
dates not requested for display. The present canonical timeline intentionally
fixes that sampling dependence. Sorting is O(E log E + P log P + N log N), merge
O(E+P+N), and each evaluator O(N), where N <= E+P+D. Memory remains linear.
