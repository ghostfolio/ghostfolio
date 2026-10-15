# Operations

Runbook for running the application day to day.

## Scheduled jobs

| Job                     | Schedule                              | What it does                                                       |
| ----------------------- | ------------------------------------- | ------------------------------------------------------------------ |
| `runInvestmentSignals()` | `0 9 * * 1-5` (09:00, Monday–Friday) | Generates DCA signals for every user's investment plan             |

For each plan the job walks through every DCA schedule, loads the last 20 days of
prices, checks whether today is the deadline (forced-buy) day, and writes the result
into the `InvestmentSignal` table. Signals are de-duplicated: if a signal for the same
day, symbol, and type already exists, it is skipped.

## Email notifications

When an investment plan has `emailEnabled = true` and a notification address:

1. Pending signals are collected (`DCA_WAIT` entries and already-sent signals are
   filtered out).
2. An email is sent to the configured address.
3. The signals are marked as sent, so they are never emailed twice.

The email lists the signals in a table. Its language follows the language of the
account (_Settings → Language_); Chinese and English are supported, anything else
falls back to English.

## Common commands

```shell
npm run database:setup
```

```shell
npm run start:server
```

```shell
npm run start:client
```

```shell
docker compose -f docker/docker-compose.yml up -d
```

```shell
docker compose -f docker/docker-compose.build.yml up -d --build
```

## Troubleshooting

**No signals appear in the Signals tab.**
Check that the plan has at least one DCA schedule, that the symbols have recent market
data (the strategies need up to 20 closing prices), and that the 09:00 weekday cron ran.
`DCA_WAIT` results are normal — they mean the strategy decided not to buy today.

**Signals appear but no email arrives.**
Verify that `emailEnabled` is set and a notification address is configured, and that
the mail settings are valid. Signals already marked as sent are not re-sent.

**Rebalancing shows no actions.**
Either no target allocations are configured, there are no holdings, or every symbol is
within its threshold. Rebalancing is computed on request, not by the cron job.

**Containers start but the app cannot reach the database.**
The `.env` file is read at container runtime, not at build time — confirm it exists and
holds the correct credentials, then recreate the containers. See
[deployment.md](deployment.md).
