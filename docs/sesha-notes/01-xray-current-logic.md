# X-Ray Feature Notes — What Exists Today

**Author:** Sesha Siva Sankar (Member 1)
**Date:** Tue, Sep 15
**Task:** Read existing Ghostfolio X-Ray code and document the current rule-based logic

---

## Why I'm writing this

Before I can design the new Portfolio Health Score, I need to understand what X-Ray already
does. Turns out it's basically a checklist of 17 independent "rules" that each say pass/fail
about one thing (too much cash, too little diversification, high fees, etc). Below is how it
all fits together, explained the way I'd explain it to a teammate over coffee, not a spec doc.

---

## 1. The basic building block: a "Rule"

- Every check in X-Ray (e.g. "is your cash too low?", "are your fees too high?") is its own
  little class.
- They all follow the same shape, because they extend one shared base class
  (`apps/api/src/models/rule.ts`).
- Every rule has to answer 4 questions:
  - What's your name? (`getName()`)
  - What settings do you need? (`getSettings()`)
  - What's the actual check logic? (`evaluate()`)
  - Are you configurable, and what's your default threshold? (`getConfiguration()`)
- The output of a check is dead simple — just:
  - `value`: true or false (did it pass?)
  - `evaluation`: a human-readable sentence explaining why
- There's no "warning" or "medium risk" state right now. It's binary — pass or fail. That's
  one of the first things that'll need to change for a 0-100 health score.

## 2. Where the rules actually get run

- There's a small helper (`rules.service.ts`) whose whole job is: "given a list of rule
  objects, run each one and hand back the results." It doesn't decide which rules to run —
  it just executes them.
- The real wiring happens in `portfolio.service.ts`, in a big function called `getReport()`.
  This is where someone manually created each rule object (currency risk rule, fee rule,
  emergency fund rule, etc.) and grouped them into 8 categories.
- Nothing here is dynamic or plug-and-play — if we want to add a new rule, we'd have to edit
  this file directly and add it to a category by hand. Worth flagging for later.

## 3. The 8 categories and their 17 rules

Here's the full list, grouped the way the app groups them:

- **Liquidity**
  - *Buying Power* — checks if your uninvested cash is below a minimum threshold (default:
    just checks it's not zero / not too low). Fully configurable.

- **Emergency Fund**
  - *Setup* — checks if you've even set an emergency fund target. No threshold, just
    "did you set one or not."
  - *Coverage* — checks if your tagged emergency-fund holdings + cash actually cover your
    target. Can fail three ways: no target set, holdings alone overshoot the target
    (weird case), or holdings+cash undershoot it. Only runs if you've set a target > 0.

- **Currency Cluster Risk** (are you too concentrated in one currency?)
  - *Current Investment* — fails if your single biggest currency is more than 50% of your
    portfolio value (configurable %).
  - *Base Currency Investment* — fails if your biggest currency bucket (by money invested)
    isn't your home currency. No threshold to tune, it's just yes/no.

- **Asset Class Cluster Risk** (stocks vs bonds balance)
  - *Equity* — fails if equities are outside a 78%–82% band.
  - *Fixed Income* — fails if bonds are outside an 18%–22% band.
  - Interesting detail: these are *band* checks (too high OR too low both fail), not simple
    ceilings like most of the others.

- **Account Cluster Risk**
  - *Current Investment* — fails if one account holds more than 50% of your total money.
  - *Single Account* — fails if you only have one account at all (or zero, which is invalid).

- **Economic Market Cluster Risk** (developed vs emerging market split)
  - *Developed Markets* — band check, must be within 68%–72%.
  - *Emerging Markets* — band check, must be within 28%–32%.

- **Regional Market Cluster Risk** (geographic spread)
  - Five separate rules, one per region: Asia Pacific, Emerging Markets, Europe, Japan,
    North America. Each is a band check against a hardcoded "ideal" range for that region
    (e.g. North America should be 65%–69% of your advanced-market exposure).

- **Fees**
  - *Fee Ratio* — fails if total fees paid are more than 1% of your total trading volume
    (buys + sells combined). Configurable.

## 4. Can users customize any of this?

- Yes — every rule reads its settings from `user.settings.xRayRules`, so a user can turn
  individual rules on/off, or override the threshold numbers, from their account settings.
- If a user hasn't set anything, it falls back to hardcoded defaults (the percentages listed
  above).

## 5. Is there already a "score"? (Important — this is basically our starting point)

- Short answer: **not really.** There's no 0-100 number anywhere today.
- The only "aggregation" that exists is a simple count:
  - How many rules are turned on (`rulesActiveCount`)
  - How many of those passed (`rulesFulfilledCount`)
- The UI just shows this as a sentence like "7 out of 9 rules align with your portfolio,"
  with a green check if everything passed, or a warning icon if not. No weighting, no
  per-category breakdown, no severity levels.
- This tells me the Health Score feature is a genuinely new layer on top — we're not
  reshaping something that already exists, we're building the scoring/weighting logic
  from scratch on top of these 17 pass/fail checks.

## 6. Key files, if I (or anyone else) need to go back and look

- `apps/api/src/models/rule.ts` — the shared base class every rule extends
- `apps/api/src/models/interfaces/rule.interface.ts` — the contract every rule follows
- `apps/api/src/models/interfaces/evaluation-result.interface.ts` — the pass/fail + message
  shape
- `apps/api/src/app/portfolio/rules.service.ts` — runs whatever rules it's handed
- `apps/api/src/app/portfolio/portfolio.service.ts` — `getReport()` (around line 1272) wires
  up all 17 rules into categories; `getReportStatistics()` (around line 2005) does the
  simple pass-count
- `apps/api/src/models/rules/**` — the actual 17 rule implementations, one folder per
  category
- `libs/common/src/lib/interfaces/x-ray-rules-settings.interface.ts` — per-user rule
  settings shape
- `apps/client/src/app/pages/portfolio/x-ray/x-ray-page.component.html` — where the
  "N out of M rules" summary is rendered today

## 7. What this means for tomorrow's task

Tomorrow I need to define the Portfolio Health Score (0-100) data model — inputs, weights,
output schema. Based on today's reading, the natural "inputs" are these 17 existing
pass/fail evaluations (or the underlying ratios they're computed from), and the main design
question is how to turn "17 independent yes/no checks across 8 categories" into one
weighted 0-100 number instead of a flat count.
