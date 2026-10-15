# Investment Features

This fork adds an investment planning layer on top of Ghostfolio: a **Capital Pool**,
a **Systematic Investment Plan (DCA)**, **Rebalancing** advice, and a **Signals** feed.
This page describes what each feature does and how to configure it.

## Capital Pool

The Capital Pool is the static total of your savings, split into three layers:

```text
Capital Pool                              ← InvestmentPlan.capitalPool
├─ Layer 1 — Emergency Fund
│  ├─ Cash Reserve Target                 ← short-term living expenses
│  ├─ Cash Buffer Target                  ← emergency buffer on top of the reserve
│  └─ Actual Cash                         ← calculated automatically
├─ Layer 2 — Capital Preservation Bucket  ← reserve for rare, high-impact events
│                                            (market crashes, major life changes)
├─ Layer 3 — Long-term Growth Target
│  └─ Deployed Capital                    ← calculated; the gap is what is still to be invested
└─ SIP Monthly Budget                     ← monthly cash available for recurring investments
```

How to read the numbers:

- **Long-term Growth Target** is the capital you have earmarked for the market — a
  theoretical target position. It is normally larger than what is actually deployed;
  the difference is the amount you should plan to invest, typically as a one-off
  top-up plan.
- If your **deployed capital exceeds** the Long-term Growth Target, you are carrying
  more market risk than planned and should consider trimming positions.
- **SIP Monthly Budget** tracks the share of your monthly income available for
  recurring investments. Combined with the Rebalancing result, it drives the DCA
  decision: how much to add, and on which day.

Configure these values on the Investment Plan page.

## DCA (Systematic Investment Plan)

Each DCA schedule targets one symbol and has a strategy, a budget, and a deadline day.
On every run the strategy decides whether to buy today or wait, based on the last
20 closing prices.

| Strategy   | Buy when                                                                            | Fallback                        | Wait when                          |
| ---------- | ----------------------------------------------------------------------------------- | ------------------------------- | ---------------------------------- |
| `FIXED`    | Always                                                                              | —                               | —                                  |
| `MA5`      | Latest price is below the 5-day moving average                                       | Forced buy on the deadline day  | Above MA5 and deadline not reached |
| `RSI`      | RSI(14) below 40                                                                     | Forced buy on the deadline day  | RSI ≥ 40 and deadline not reached  |
| `COMBINED` | MA5 **and** RSI(<45) → full position; MA5 **or** RSI(<45) → half position            | Full forced buy on the deadline | Neither signal, deadline not met   |

Notes:

- RSI is the standard RSI(14). With fewer than 15 data points it returns 50 (neutral),
  which counts as "no signal".
- With no market data or fewer than 5 prices, the schedule falls back to its default
  buy amount.

## Rebalancing

Set a target weight and a rebalance threshold per symbol. For every symbol the
application computes:

```text
currentWeight%  = holding value / total portfolio value × 100
deviation       = currentWeight% − targetWeight%      positive = overweight
adjustmentValue = totalValue × (targetWeight% − currentWeight%) / 100
                                                      positive = buy, negative = sell
action          = |deviation| ≥ threshold ? BUY / SELL : OK
```

All weights and amounts are based on the **actual market value** of your holdings, so the
weights of a fully assigned portfolio add up to 100%. The result also reports how that value
compares with your Long-term Growth Target (`capital`): how much of the target is not
deployed yet, or by how much you are above it. This is shown beside the weights and never
triggers a rebalancing on its own.

The result is a list of suggested actions plus a flag indicating whether at least one
symbol crossed its threshold. Thresholds are per symbol, so different holdings can
tolerate different drift.

Rebalancing suggestions are calculated on demand when the page requests them; they are
not stored.

## Signals

The Signals tab shows recent suggestions from the last 30 days (up to 50 entries,
newest first). Each entry shows the symbol, type (`DCA_BUY` / `DCA_WAIT`), amount,
reason, and date, and can be marked as:

- **Executed** — you acted on it
- **Dismiss** — you ignored it

DCA signals are generated automatically every weekday morning; see
[operations.md](operations.md).
