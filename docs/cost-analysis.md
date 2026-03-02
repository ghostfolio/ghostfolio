# AI Cost Analysis

## Development & Testing Costs

### Observed Usage (Local + Production)

| Metric                     | Value                 |
| -------------------------- | --------------------- |
| Total chats logged         | 89                    |
| Total prompt tokens        | 367,389               |
| Total completion tokens    | 17,771                |
| Total tokens               | 385,160               |
| Avg prompt tokens/chat     | 4,128                 |
| Avg completion tokens/chat | 200                   |
| Avg total tokens/chat      | 4,328                 |
| Error rate                 | 9.0% (8/89)           |
| Development period         | Feb 26 – Feb 28, 2026 |

### Development API Costs

Primary model: Claude Sonnet 4.6 ($3/MTok input, $15/MTok output)

| Component                | Tokens  | Cost      |
| ------------------------ | ------- | --------- |
| Prompt tokens (367K)     | 367,389 | $1.10     |
| Completion tokens (18K)  | 17,771  | $0.27     |
| **Total dev/test spend** | 385,160 | **$1.37** |

Additional costs:

- Eval scoring (Haiku 4.5): ~86 cases x ~500 tokens/judgment = ~43K tokens = $0.05
- Multiple eval runs during development: ~10 runs x $0.05 = $0.50
- **Estimated total dev spend: ~$2.00**

### Per-Chat Cost Breakdown

| Model                | Avg Input | Avg Output | Cost/Chat |
| -------------------- | --------- | ---------- | --------- |
| Sonnet 4.6 (default) | 4,128 tok | 200 tok    | $0.0154   |
| Haiku 4.5            | 4,128 tok | 200 tok    | $0.0051   |
| Opus 4.6             | 4,128 tok | 200 tok    | $0.0769   |

## Production Cost Projections

### Assumptions

- **Queries per user per day**: 5 (portfolio check, performance, transactions, market data, misc)
- **Avg tokens per query**: 4,328 (4,128 input + 200 output) — observed from production data
- **Tool call frequency**: 1.9 tool calls/chat average (observed)
- **Verification overhead**: Negligible (deterministic, no extra LLM calls)
- **Cache warming overhead**: `warmPortfolioCache` runs after activity/account writes — Redis + BullMQ job, zero LLM tokens, up to 30s added latency per write operation
- **Model mix**: 90% Sonnet 4.6, 8% Haiku 4.5, 2% Opus 4.6
- **Blended cost per chat**: $0.0154 x 0.90 + $0.0051 x 0.08 + $0.0769 x 0.02 = $0.0157

### Monthly Projections

| Scale         | Users   | Chats/Month | Token Volume | Monthly Cost |
| ------------- | ------- | ----------- | ------------ | ------------ |
| 100 users     | 100     | 15,000      | 64.9M tokens | **$235**     |
| 1,000 users   | 1,000   | 150,000     | 649M tokens  | **$2,355**   |
| 10,000 users  | 10,000  | 1,500,000   | 6.49B tokens | **$23,550**  |
| 100,000 users | 100,000 | 15,000,000  | 64.9B tokens | **$235,500** |

### Cost Optimization Levers

| Strategy                                | Estimated Savings | Trade-off                       |
| --------------------------------------- | ----------------- | ------------------------------- |
| Default to Haiku 4.5 for simple queries | 60-70%            | Slightly less nuanced responses |
| Prompt caching (repeated system prompt) | 30-40%            | Requires API support            |
| Response caching for market data        | 10-20%            | Staleness window                |
| Reduce system prompt size               | 15-25%            | Less detailed agent behavior    |

### Infrastructure Costs (Render)

| Service              | Plan     | Monthly Cost  |
| -------------------- | -------- | ------------- |
| Web (Standard)       | Standard | $25           |
| Redis (Standard)     | Standard | $10           |
| Postgres (Basic 1GB) | Basic    | $7            |
| **Total infra**      |          | **$42/month** |

### Total Cost of Ownership

| Scale         | AI Cost  | Infra  | Total/Month | Cost/User/Month |
| ------------- | -------- | ------ | ----------- | --------------- |
| 100 users     | $235     | $42    | $277        | $2.77           |
| 1,000 users   | $2,355   | $42    | $2,397      | $2.40           |
| 10,000 users  | $23,550  | $100\* | $23,650     | $2.37           |
| 100,000 users | $235,500 | $500\* | $236,000    | $2.36           |

\*Infrastructure scales with traffic — estimated for higher tiers.

### Real-Time Cost Tracking

Cost is tracked live via `GET /api/v1/agent/metrics`:

```json
{
  "cost": {
    "totalUsd": 0.0226,
    "avgPerChatUsd": 0.0226
  }
}
```

Computed per request using model-specific pricing (Sonnet/Haiku/Opus rates) applied to actual prompt and completion token counts.
