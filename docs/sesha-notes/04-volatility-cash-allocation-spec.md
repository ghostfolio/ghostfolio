# Volatility Estimate + Cash Allocation — Scoring Logic Spec

**Author:** sesha siva sankar (member 1)
**Date:** Fri, Sep 18
**Task:** Spec volatility estimate + cash allocation scoring logic

---

## 1. Two separate checks, bundled in one doc

These are two different signals that don't share a formula (unlike Thursday's
concentration rules, which were all one formula). I'm speccing them together because
they're on the same day of the plan, not because they're related:

- **Volatility estimate** — how bumpy is this portfolio likely to be, based on price
  history?
- **Cash allocation** — is too much (or too little) of the portfolio just sitting in cash?

## 2. Volatility Estimate

### 2.1 What data we actually have to work with

Checked the schema — `MarketData` (`prisma/schema.prisma:161`) stores one row per
`(dataSource, symbol, date)` with a `marketPrice`. That's daily closing prices per symbol,
already being collected for every symbol in a user's holdings (it's how the performance
charts work today). So there's no new data collection needed — this is a calculation
on top of existing price history, same relationship as concentration risk was to
`assetProfile`.

### 2.2 The formula

Standard approach, nothing exotic — annualized volatility from daily returns:

```
1. For each holding, pull the last N days of MarketData.marketPrice (I'd default N = 90
   trading days -- long enough to be stable, short enough to reflect current risk, not
   ancient history).
2. Compute daily returns: r[i] = ( price[i] - price[i-1] ) / price[i-1]
3. Compute the standard deviation of those daily returns -> dailyVolatility
4. Annualize it: annualizedVolatility = dailyVolatility × sqrt(252)
   (252 = approx. number of trading days in a year -- standard convention)
5. That gives per-holding volatility. To get PORTFOLIO volatility (not just an average of
   the holdings), we need the weighted combination accounting for how holdings move
   together:

   portfolioVolatility = sqrt( Σ Σ w_i × w_j × cov(i, j) )

   where w_i is holding i's weight (% of portfolio) and cov(i,j) is the covariance between
   holding i and j's daily returns (cov(i,i) is just that holding's own variance).
```

### 2.3 Why the covariance step matters (and can't be skipped)

If I just averaged each holding's own volatility weighted by portfolio %, that would
overstate risk for a diversified portfolio — two volatile stocks that move in _opposite_
directions cancel each other out and the portfolio is calmer than either stock alone. This
is literally the mathematical reason diversification works. Skipping it would make the
score effectively useless for rewarding diversification, so it's worth the extra
complexity even though it's the harder part to implement (an N×N covariance matrix
instead of N single numbers).

### 2.4 Turning volatility into a pass/fail (or a scaled score)

Unlike concentration (single ceiling), volatility should probably be a **band**, same
pattern as the Asset Class / Market cluster rules from Tuesday's notes — because both too
high AND too low can be "wrong" depending on the user's risk profile:

- Default band: 10%-25% annualized volatility (roughly "balanced portfolio" territory —
  pure bonds sit lower, all-crypto sits way higher).
- **Important open question**: this really should key off the user's declared risk
  tolerance (if Ghostfolio has that setting) rather than one fixed band for everyone — a
  25-year-old aggressive investor and someone near retirement shouldn't be held to the
  same volatility target. Flagging this for the team rather than deciding solo, since I
  didn't find a risk-tolerance field on the user profile during my read-through — that
  might need its own small spec if we want to do this properly.
- Output shape matches every other rule (`EvaluationResult`): `value: false`,
  `evaluation: "Your portfolio's estimated annualized volatility is 31.4%, above the 25%
upper band."`, plus the raw number so the UI can show a proper gauge, not just pass/fail.

### 2.5 Performance note (implementation concern, not a design one)

Computing an N×N covariance matrix on every X-Ray request for a portfolio with, say, 50
holdings is 2,500 covariance calculations, each needing 90 days of price history pulled
per pair. That's expensive to do live on every page load. Recommending this be
**precomputed/cached** (e.g. nightly job, same idea as other market-data refresh jobs in
this codebase) rather than calculated synchronously in the rule's `evaluate()` — flagging
this now so it doesn't get missed when someone picks this up for implementation.

## 3. Cash Allocation Scoring

### 3.1 How this differs from the existing "Buying Power" rule

Tuesday's notes already found a `BuyingPower` rule — but that only checks "is your cash
above a minimum floor" (protects against having _too little_ liquidity). It says nothing
about the _other_ failure mode: too much cash sitting uninvested, which is its own drag on
long-term returns (cash loses to inflation over time). So cash allocation is really a
**band check**, same shape as volatility above, not a second liquidity-floor check.

### 3.2 The formula

```
cashRatio = totalCashBalance / totalPortfolioValue   (holdings + cash combined)

Fail if cashRatio > thresholdMax  (too much idle cash, e.g. > 15%)
Fail if cashRatio < thresholdMin  (not enough of a buffer, e.g. < 2%)
```

- `totalCashBalance` and portfolio value are both already computed today (this is the same
  `summary.cash` figure the `BuyingPower` rule already reads, per Tuesday's notes on
  `apps/api/src/models/rules/liquidity/buying-power.ts`) — no new data needed here either.
- Default band: 2%-15%. Below 2% and the emergency-fund/liquidity checks are likely also
  already failing (some overlap with Emergency Fund Coverage from Tuesday is expected and
  fine — they're answering slightly different questions: "do you have money for emergencies"
  vs "is your invested/cash split efficient").

### 3.3 Relationship to Buying Power — keep both, don't merge

Worth being explicit about this since it's a natural question: Buying Power (existing) and
Cash Allocation (new) sound similar but aren't redundant —

- **Buying Power** = "do you have enough cash on hand right now" (an absolute dollar
  floor, configurable in currency units)
- **Cash Allocation** = "is the proportion of cash-to-invested reasonable" (a ratio/band,
  same shape as every cluster-risk rule)

Someone with $500K invested and $5K cash might pass Buying Power (enough for near-term
needs) but still fail Cash Allocation on the low end if their target buffer is higher in
percentage terms — that's a legitimate, different signal, not double-counting.

## 4. Output shape (both, same pattern as every other rule)

```jsonc
{
  "key": "PortfolioVolatility",
  "name": "Volatility Estimate",
  "isActive": true,
  "value": false,
  "evaluation": "Estimated annualized volatility is 31.4%, above the 25% upper band.",
  "configuration": {
    "threshold": {
      "min": { "unit": "%", "value": 0.1 },
      "max": { "unit": "%", "value": 0.25 }
    }
  }
}
```

```jsonc
{
  "key": "CashAllocation",
  "name": "Cash Allocation",
  "isActive": true,
  "value": true,
  "evaluation": "5.1% of your portfolio is in cash, within the 2%-15% target band.",
  "configuration": {
    "threshold": {
      "min": { "unit": "%", "value": 0.02 },
      "max": { "unit": "%", "value": 0.15 }
    }
  }
}
```

## 5. How these fold into the Health Score model (Wednesday's doc)

Both slot in as two more rows in the weight table from
[02-health-score-data-model.md](02-health-score-data-model.md):

| Category            | Weight (revised) | Why                                                                                                                                                                                          |
| ------------------- | ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Volatility Estimate | 10               | New category — meaningful risk signal, but I'm pulling points from Regional Market Cluster Risk (15 -> ~10-ish split) rather than inventing new total budget, to keep the grand total at 100 |
| Cash Allocation     | 5                | Folds into the existing **Liquidity** category alongside Buying Power (5+5=10 total for Liquidity) since they're clearly related                                                             |

Same caveat as Thursday's concentration doc: these are my proposed numbers, not locked —
worth a quick team gut-check on final weights once all 4-5 new rules from this week are on
the table together, rather than re-balancing the 100-point pie one doc at a time.

## 6. Edge cases

- **New symbol with < 90 days of price history** (recently added holding, or the platform
  just recently added its data): fall back to whatever history exists (even 20-30 days)
  rather than failing to compute — flag in the evaluation message that the estimate is
  "based on limited history" so it doesn't look falsely precise.
- **Single-holding portfolio**: covariance matrix degenerates to just that one holding's
  own variance — formula still works, no special-casing needed.
- **All-cash portfolio (0 holdings)**: Volatility rule shouldn't run at all (nothing to
  measure) — same `hasOpenHoldings` gate as other rules. Cash Allocation, however, SHOULD
  still run (100% cash is a valid, checkable state — it'd fail the upper band, correctly).

## 7. What's next

Monday's task is deviation-from-target-allocation logic — that's a genuinely different
shape again (comparing actual vs. a user-defined target, not just a fixed threshold), so
that'll need its own spec rather than extending this one.
