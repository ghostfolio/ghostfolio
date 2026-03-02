# AI Cost Analysis — Ghostfolio AI Financial Agent

## Development & Testing Costs

### LLM API Costs (Anthropic Claude Sonnet)

| Category | Estimated API Calls | Estimated Cost |
|---|---|---|
| Agent development & manual testing | ~200 queries | ~$4.00 |
| Eval suite runs (55 tests × ~8 runs) | ~440 queries | ~$8.00 |
| LLM-as-judge eval runs | ~55 queries | ~$1.00 |
| Claude Code (development assistant) | — | ~$20.00 (Anthropic Max subscription) |
| **Total development LLM spend** | **~695 queries** | **~$33.00** |

### Token Consumption

Based on Langfuse telemetry data from production traces:

| Metric | Per Query (avg) | Total Development (est.) |
|---|---|---|
| Input tokens | ~2,000 | ~1,390,000 |
| Output tokens | ~200 | ~139,000 |
| Total tokens | ~2,200 | ~1,529,000 |

Typical single-tool query: ~1,800 input + 50 output (tool selection) → tool executes → ~2,300 input + 340 output (synthesis). Total: ~4,490 tokens across 2 LLM calls.

### Observability Tool Costs

| Tool | Cost |
|---|---|
| Langfuse Cloud (free tier) | $0.00 |
| Railway hosting (Hobby plan) | ~$5.00/month |
| Railway PostgreSQL | Included |
| Railway Redis | Included |
| **Total infrastructure** | **~$5.00/month** |

### Total Development Cost

| Item | Cost |
|---|---|
| LLM API (Anthropic) | ~$33.00 |
| Infrastructure (Railway, 1 week) | ~$1.25 |
| Observability (Langfuse free tier) | $0.00 |
| **Total** | **~$34.25** |

---

## Production Cost Projections

### Assumptions

- **Queries per user per day:** 5 (portfolio check, performance review, a few follow-ups)
- **Average tokens per query:** 4,490 (2 LLM calls: tool selection + synthesis)
  - Input: ~4,100 tokens (system prompt + tools + conversation + tool results)
  - Output: ~390 tokens (tool call + response text)
- **Average tool calls per query:** 1.5
- **LLM model:** Claude Haiku 3.5 ($0.80/M input tokens, $4/M output tokens)
- **Average cost per query:** ~$0.005 (validated by Langfuse production traces after model switch)
- **Verification overhead:** Negligible (string matching, no additional LLM calls)
- **Days per month:** 30

### Cost Per Query Breakdown

| Component | Tokens | Cost |
|---|---|---|
| LLM Call 1 (tool selection) | 1,758 in + 53 out | $0.0016 |
| Tool execution | 0 (database queries only) | $0.000 |
| LLM Call 2 (synthesis) | 2,289 in + 339 out | $0.0032 |
| **Total per query** | **~4,490** | **~$0.005** |

### Monthly Projections

| Scale | Users | Queries/day | Queries/month | Monthly LLM Cost | Infrastructure | Total/month |
|---|---|---|---|---|---|---|
| Small | 100 | 500 | 15,000 | $75 | $20 | **$95** |
| Medium | 1,000 | 5,000 | 150,000 | $750 | $50 | **$800** |
| Large | 10,000 | 50,000 | 1,500,000 | $7,500 | $200 | **$7,700** |
| Enterprise | 100,000 | 500,000 | 15,000,000 | $75,000 | $2,000 | **$77,000** |

### Cost per User per Month

| Scale | Cost/user/month |
|---|---|
| 100 users | $0.95 |
| 1,000 users | $0.80 |
| 10,000 users | $0.77 |
| 100,000 users | $0.77 |

Cost per user is nearly flat because LLM API costs dominate and scale linearly. Infrastructure becomes negligible at scale. The switch from Sonnet to Haiku reduced per-query costs by ~70% while maintaining 100% eval pass rate.

---

## Cost Optimization Strategies

**Implemented:**
- Switched from Sonnet to Haiku 3.5 — 70% cost reduction with no eval quality loss
- Tool results are structured and minimal (only relevant fields returned to LLM, not raw API responses)
- System prompt is concise (~500 tokens) to minimize per-query overhead
- Single-agent architecture avoids multi-agent token multiplication
- Streaming responses reduce perceived latency

**Recommended for production:**

| Strategy | Estimated Savings | Complexity |
|---|---|---|
| Response caching (same portfolio, same question within 5 min) | 20-40% | Low |
| Prompt compression (shorter tool descriptions) | 10-15% | Low |
| Batch token optimization (combine related tool results) | 5-10% | Medium |
| Switch to open-source model (Llama 3 via OpenRouter) | 50-70% | Low (provider swap) |

**Most impactful:** Adding response caching could reduce costs by 20-40%, bringing the 10,000-user scenario from $7,700 to ~$4,500-6,000/month.

---

## Key Insight

At $0.005 per query and 5 queries/user/day, the per-user cost of under $1/month is extremely affordable for a premium feature. For Ghostfolio's self-hosted model where users provide their own API keys, this cost is negligible — roughly the price of a single coffee every three months for conversational access to portfolio analytics.