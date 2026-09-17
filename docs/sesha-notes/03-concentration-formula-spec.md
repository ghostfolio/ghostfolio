# Concentration Risk — Formula Spec

**Author:** sesha siva sankar (member 1)
**Date:** Thu, Sep 17
**Task:** Spec concentration formula (single stock, sector, country, currency)

---

## 1. Why this is its own thing

Looking back at yesterday's rule catalog, X-Ray already has a "currency cluster risk"
check, but nothing for **single stock**, **sector**, or **country** concentration. That's
a real gap — "I own 40% Apple" is one of the most obvious portfolio red flags there is,
and it's not covered today. So this isn't tweaking an existing rule, it's specifying 4 new
ones (stock, sector, country, currency) that all share the same underlying math.

I'm reusing currency's existing rule as the 4th one here (not rebuilding it) — just
documenting it alongside the 3 new ones since they're all the same formula, so the spec
reads as one consistent family.

## 2. The formula (same shape for all 4 types)

All four are "how much of my portfolio sits in the single biggest bucket of X," where X is
stock / sector / country / currency. Concretely:

```
1. Take all open holdings, convert each to the base currency.
2. Group holdings by the attribute in question:
     - Stock      -> group by symbol (e.g. AAPL, MSFT)
     - Sector      -> group by assetProfile.sectors[].name (see note in section 4)
     - Country     -> group by assetProfile.countries[].code
     - Currency    -> group by assetProfile.currency (already exists, see rule below)
3. Sum each group's value.
4. concentrationRatio = ( value of the LARGEST group ) / ( total portfolio value )
5. Fail if concentrationRatio > thresholdMax
```

This is exactly the pattern the existing `Rule` base class already supports —
`groupCurrentHoldingsByAttribute()` (from `apps/api/src/models/rule.ts`, which I found
during Tuesday's read-through) already does steps 1-3 for a single flat attribute like
currency. Stock and country need a small variant since they group by a _nested/array_
field, not a flat one (see section 4).

## 3. The 4 rules, thresholds, and defaults

| Rule                                          | Groups by         | Default `thresholdMax` | Rationale for default                                                                                |
| --------------------------------------------- | ----------------- | ---------------------- | ---------------------------------------------------------------------------------------------------- |
| **Single Stock Concentration**                | individual symbol | 10%                    | Common rule of thumb — no single stock should be more than ~10% of a diversified portfolio           |
| **Sector Concentration**                      | sector name       | 30%                    | Sectors are naturally broader than single stocks, so a higher ceiling is reasonable                  |
| **Country Concentration**                     | country code      | 50%                    | Matches the existing currency rule's default, and home-country bias is normal/expected up to a point |
| **Currency Concentration** _(already exists)_ | currency code     | 50%                    | This is `CurrencyClusterRiskCurrentInvestment` — no change, just including for completeness          |

All four are configurable per-user (same `thresholdMax` override pattern every other rule
already uses via `user.settings.xRayRules`), so a user who's fine with 20% in one stock
can raise the ceiling instead of being stuck with our default.

## 4. Data needed — and the one gap I found

Stock and Currency concentration need nothing new — `symbol` and `assetProfile.currency`
are both already flat fields on every holding, exactly like the existing currency rule
uses.

Sector and Country are trickier: in the schema, `assetProfile.sectors` and
`assetProfile.countries` are **arrays of `{ name/code, weight }`**, because a single
holding (e.g. a diversified ETF) can span multiple sectors/countries at once (e.g. 60% US
Tech ETF / 40% something else within one symbol). That means:

- We can't just bucket "this holding = one sector" the way currency does.
- Instead, each holding's value has to be **split proportionally** across its
  sectors/countries using their `weight` before grouping. E.g. a $10,000 ETF holding that's
  70% Tech / 30% Healthcare contributes $7,000 to the Tech bucket and $3,000 to Healthcare.
- This means Sector and Country concentration need their own aggregation helper, not a
  straight reuse of `groupCurrentHoldingsByAttribute()` — flagging this as the one real
  implementation gotcha for whoever builds this next (probably me, later this sprint).

## 5. Where this plugs into the Health Score model (yesterday's doc)

These 4 rules become their own category, **"Concentration Risk,"** in the weighted model
from [02-health-score-data-model.md](02-health-score-data-model.md). Two ways to fold it
in — flagging both since this affects total weighting math and I want the team's input
before locking it in:

- **Option A**: Add "Concentration Risk" as a 9th category, and give it a real chunk of
  the 100 points (e.g. 15-20, similar to Currency/Asset Class today) — this means every
  other category's weight shrinks a bit to keep the total at 100.
- **Option B**: Since Currency Concentration already lives under "Currency Cluster Risk,"
  fold Stock/Sector/Country into that same category and rename it "Concentration Risk,"
  reusing its existing 15-point budget across all 4 sub-rules (roughly 3.75 each).

I'd lean toward **Option A** — stock/sector/country concentration is arguably a bigger,
more distinct risk signal than currency alone, and burying it inside the currency category
would under-weight it. But this is a product call as much as a data one, worth a quick
gut-check with the team rather than me just deciding solo.

## 6. Rule output shape (matches the existing pattern exactly)

No new interface needed — same `EvaluationResult` (`{ evaluation, value }`) every other
rule already returns:

```jsonc
{
  "key": "SingleStockConcentration",
  "name": "Single Stock Concentration",
  "isActive": true,
  "value": false,
  "evaluation": "AAPL makes up 14.2% of your portfolio, above the 10% threshold.",
  "configuration": { "threshold": { "max": { "unit": "%", "value": 0.1 } } }
}
```

## 7. Edge cases

- **Zero holdings**: same as every other X-Ray rule today — don't run this category at all
  (matches the existing `hasOpenHoldings` gate other cluster-risk rules already use).
- **Holding with no sector/country data** (data provider gap): exclude it from the
  Sector/Country grouping rather than crashing or silently miscounting — should show up
  as "uncategorized" bucket so the user isn't misled by an artificially lower score.
- **Multiple holdings of the same stock across different accounts**: still one bucket —
  concentration is about total exposure to the symbol, account grouping is a separate
  concern (that's what Account Cluster Risk already covers).

## 8. What's next

Friday's task is the volatility estimate + cash allocation scoring logic — a different
kind of check (estimate-based, not just a concentration ratio), so that'll need its own
formula spec rather than reusing this one.
