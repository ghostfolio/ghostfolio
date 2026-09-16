# Portfolio Health Score — Data Model (v1 draft)

**Author:** sesha siva sankar (member 1)
**Date:** Wed, Sep 16
**Task:** Define Portfolio Health Score (0-100) data model: inputs, weights, output schema

---

## 1. What I'm actually building

A single number from 0 to 100 that tells the user "how healthy is your portfolio right
now," built on top of the 17 X-Ray rules I documented yesterday
([01-xray-current-logic.md](01-xray-current-logic.md)). Today's job is just the data
model — not the actual scoring code yet. I need to nail down: what goes in, how much each
thing counts, and what comes out.

## 2. The core decision: how do we turn 17 pass/fails into one number?

I considered two approaches:

- **Option A — straight percentage** (what X-Ray already does): just count
  `passed / active` rules. Simple, but treats "you have zero accounts" the same as "your
  North America exposure is 64% instead of 65%" — one is a real problem, the other is a
  rounding difference. Not good enough for a "score" people will actually act on.
- **Option B — weighted score** (what I'm going with): every rule gets a weight (how much
  it matters), and the score is what % of the _total possible weight_ you actually earned.
  This lets us say "fees are more important than a slightly-off regional split," which
  matches how a real advisor would think about it.

**Formula:**

```
score = ( sum of weights of PASSED active rules ) / ( sum of weights of ALL active rules ) × 100
```

- Only _active_ rules count (a user can turn rules off in settings — same as X-Ray does
  today). If a rule is off, it's excluded from both top and bottom, so the remaining
  weights auto-rebalance to 100%.
- If a user has **zero active rules** (turned everything off), there's no score — return
  `null` with a reason, don't show a fake 100.

## 3. Inputs — where the raw data comes from

Nothing new needs to be computed. Every input already exists as output from the current
`RulesService.evaluate()` call I found yesterday:

- `key` — which rule (e.g. `AccountClusterRiskSingleAccount`)
- `name` — human label
- `isActive` — whether the user has this rule turned on
- `value` — true/false, did it pass
- `evaluation` — the human-readable message (why it passed/failed)
- `configuration` — threshold info, if the rule has one

So the health score is a **second layer that consumes X-Ray's existing output** — it
doesn't touch the rule classes themselves. That's a nice property: rule logic and scoring
logic stay separate, so changing a threshold doesn't mean rewriting the score, and vice
versa.

## 4. Weights — how much each category/rule matters

I split the 100 points across the 8 categories first, then divided each category's points
across its rules. Reasoning for each category weight is a gut-check based on "how much
financial damage does failing this actually do," not a formula — this is the part most
worth a second opinion from the team.

| Category                     | Weight  | Why                                                                     |
| ---------------------------- | ------- | ----------------------------------------------------------------------- |
| Fees                         | 15      | Fees compound silently over years — easy to ignore, expensive long-term |
| Currency Cluster Risk        | 15      | Being 80% in one currency is a real, sudden-shock risk (FX crash)       |
| Economic Market Cluster Risk | 15      | Developed vs emerging split is a core diversification signal            |
| Regional Market Cluster Risk | 15      | Same idea as above, just sliced by geography instead                    |
| Asset Class Cluster Risk     | 15      | Stocks-vs-bonds balance is the most basic risk lever there is           |
| Account Cluster Risk         | 10      | Matters, but is more about convenience/consolidation than solvency      |
| Emergency Fund               | 10      | Important for financial safety, but sits outside "the portfolio" itself |
| Liquidity (Buying Power)     | 5       | Nice to have cash on hand, but least urgent of the eight                |
| **Total**                    | **100** |                                                                         |

Within each category, I split the points evenly across that category's rules, with two
exceptions where one rule is clearly the bigger deal:

| Category                     | Rule                                        | Weight |
| ---------------------------- | ------------------------------------------- | ------ |
| Fees                         | Fee Ratio                                   | 15     |
| Currency Cluster Risk        | Current Investment (currency concentration) | 7.5    |
| Currency Cluster Risk        | Base Currency Investment                    | 7.5    |
| Economic Market Cluster Risk | Developed Markets                           | 7.5    |
| Economic Market Cluster Risk | Emerging Markets                            | 7.5    |
| Regional Market Cluster Risk | Asia Pacific                                | 3      |
| Regional Market Cluster Risk | Emerging Markets                            | 3      |
| Regional Market Cluster Risk | Europe                                      | 3      |
| Regional Market Cluster Risk | Japan                                       | 3      |
| Regional Market Cluster Risk | North America                               | 3      |
| Asset Class Cluster Risk     | Equity                                      | 7.5    |
| Asset Class Cluster Risk     | Fixed Income                                | 7.5    |
| Account Cluster Risk         | Current Investment (concentration)          | 5      |
| Account Cluster Risk         | Single Account                              | 5      |
| Emergency Fund               | Setup (did you set a target)                | 4      |
| Emergency Fund               | Coverage (does it actually cover you)       | 6      |
| Liquidity                    | Buying Power                                | 5      |

_Coverage got more weight than Setup because "you set a target but it's not actually
covered" is the state that actually matters — setup alone is just a precondition._

## 5. What about rules with no threshold, or that are just structural checks?

A few rules (like `AccountClusterRiskSingleAccount` or
`CurrencyClusterRiskBaseCurrencyCurrentInvestment`) aren't tunable — they're just
yes/no structural checks with no `thresholdMax`/`thresholdMin`. That's fine for the score
— weight doesn't care whether a rule is configurable, only whether it passed. No special
handling needed there.

## 6. Output schema

```jsonc
{
  "portfolioHealthScore": {
    "score": 78, // 0-100, or null if no active rules
    "grade": "B", // optional letter grade, see note below
    "calculatedAt": "2026-09-16T10:00:00.000Z",
    "activeWeight": 100, // sum of weights actually counted (after excluding inactive rules)
    "categories": [
      {
        "key": "fees",
        "name": "Fees",
        "weight": 15,
        "score": 100, // this category's own 0-100 sub-score
        "rules": [
          {
            "key": "FeeRatioTotalInvestmentVolume",
            "name": "Fee Ratio",
            "isActive": true,
            "passed": true,
            "weight": 15,
            "message": "Your fee ratio is 0.4%, below the 1% threshold."
          }
        ]
      },
      {
        "key": "currencyClusterRisk",
        "name": "Currency Cluster Risk",
        "weight": 15,
        "score": 50,
        "rules": [
          {
            "key": "CurrencyClusterRiskCurrentInvestment",
            "name": "Currency Concentration",
            "isActive": true,
            "passed": false,
            "weight": 7.5,
            "message": "58% of your portfolio is in USD, above the 50% threshold."
          },
          {
            "key": "CurrencyClusterRiskBaseCurrencyCurrentInvestment",
            "name": "Base Currency Investment",
            "isActive": true,
            "passed": true,
            "weight": 7.5,
            "message": "Your largest currency bucket matches your base currency."
          }
        ]
      }
      // ...remaining 6 categories, same shape
    ]
  }
}
```

Notes on the schema:

- **Category score** is computed the same way as the overall score, just scoped to that
  category's rules — so the UI can show "Fees: 100%, Currency Risk: 50%" without a second
  calculation.
- **`activeWeight`** is there so the frontend/API consumer can tell "was this score based
  on all 100 points, or did the user turn some rules off and it's really out of 85?" —
  important for not misleading people.
- **Grade** (A/B/C/D/F) is optional sugar on top of the number — easy to derive
  (`score >= 90 → A`, etc.) but I'm flagging it as a separate, later decision since it's a
  product/UX call, not a data modeling one.

## 7. Edge cases I need to keep in mind going forward

- **No holdings at all**: several rules (currency, asset class, economic/regional market)
  don't run today if `hasOpenHoldings` is false — same should apply here, those categories
  get excluded entirely (not scored as 0), and their weight gets redistributed like any
  other inactive rule.
- **New user, no accounts yet**: same idea — `accountClusterRisk` shouldn't count against
  someone who just signed up.
- **User disables a rule**: already covered above — weight renormalizes.
- **Partial credit vs binary**: keeping v1 binary (pass = full weight, fail = 0) instead of
  a sliding scale (e.g. "meh, only 2% over the threshold") — sliding scale is a nice
  future improvement, but adds real complexity (every rule needs a "how close were you"
  calculation, not just true/false), so parking that for later, not day 2 of the sprint.

## 8. What's next

Tomorrow's task is the concentration formula spec (single stock/sector/country/currency),
which should slot in as a new rule/category feeding into this same weighted model — it
won't change anything I designed today, just adds more rows to the table in section 4.
