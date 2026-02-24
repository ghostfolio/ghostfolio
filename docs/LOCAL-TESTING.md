# Local Development Testing Guide

**Goal:** Test AI agent manually via UI before pushing to main.

---

## Quick Start (5 min)

### 1. Start Docker Services

```bash
docker-compose up -d
```

**This starts:**
- PostgreSQL on port 5432
- Redis on port 6379

**Verify:**
```bash
docker ps
```

---

### 2. Run Database Migrations

```bash
pnpm nx run api:prisma:migrate
```

---

### 3. Start Application

**Option A: Full stack (recommended)**
```bash
pnpm start
```

This starts:
- API server: http://localhost:3333
- UI: http://localhost:4200

**Option B: Start separately (for debugging)**
```bash
# Terminal 1: API
pnpm start:server

# Terminal 2: UI
pnpm start:client
```

---

### Optional: Enable LangSmith Tracing

Add these keys to `.env` before starting the API if you want request traces and eval runs in LangSmith:

```bash
LANGCHAIN_API_KEY=lsv2_...
LANGCHAIN_PROJECT=ghostfolio-ai-agent
LANGCHAIN_TRACING_V2=true
```

`LANGSMITH_API_KEY`, `LANGSMITH_PROJECT`, and `LANGSMITH_TRACING` are also supported.

Notes:

- Tracing is disabled by default in `.env.example`.
- Placeholder keys such as `<INSERT_...>` are ignored by the app and do not enable tracing.

### Optional: Set AI Latency Budget

Add this key to `.env` to cap model-wait time before deterministic fallback:

```bash
AI_AGENT_LLM_TIMEOUT_IN_MS=3500
```

Lower values reduce tail latency. Higher values allow longer model generation windows.

---

### 4. Open UI in Browser

Navigate to:
```
http://localhost:4200
```

---

### 5. Create Test Account

1. Click **Sign Up** or **Register**
2. Fill in email/password
3. Submit form

---

### 6. Get Authentication Token

1. Open DevTools (F12 or Cmd+Option+I)
2. Go to **Application** tab
3. Expand **Local Storage**
4. Click on `http://localhost:4200`
5. Find **accessToken** key
6. Copy the value (long JWT string)

**Save as env var:**
```bash
export TOKEN="paste-token-here"
```

---

### 7. Test AI Agent via UI

Navigate to portfolio page:
```
http://localhost:4200/en/portfolio
```

**Look for:** `AI Portfolio Assistant` panel near the top of the page.

You can also verify seeded activities at:
```
http://localhost:4200/en/portfolio/activities
```

**Test queries:**
- "Show my portfolio allocation"
- "Analyze my portfolio risk"
- "What is the price of AAPL?"

---

### 8. Test AI Agent via API

**Set token:**
```bash
export TOKEN="your-jwt-token-here"
```

**Test 1: Portfolio Overview**
```bash
curl -X POST http://localhost:3333/api/v1/ai/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "query": "Show my portfolio allocation",
    "sessionId": "test-1"
  }'
```

**Test 2: Risk Assessment**
```bash
curl -X POST http://localhost:3333/api/v1/ai/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "query": "Analyze my portfolio concentration risk",
    "sessionId": "test-2"
  }'
```

**Test 3: Market Data**
```bash
curl -X POST http://localhost:3333/api/v1/ai/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "query": "What is the current price of NVDA?",
    "sessionId": "test-3"
  }'
```

**Test 4: Memory Continuity**
```bash
# First query
curl -X POST http://localhost:3333/api/v1/ai/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "query": "Show my top 3 holdings",
    "sessionId": "memory-test"
  }'

# Second query (should remember context)
curl -X POST http://localhost:3333/api/v1/ai/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "query": "What was the third one again?",
    "sessionId": "memory-test"
  }'
```

**Test 5: Feedback endpoint**
```bash
curl -X POST http://localhost:3333/api/v1/ai/chat/feedback \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "sessionId": "memory-test",
    "rating": "up",
    "comment": "useful response"
  }'
```

---

## Expected Response Format

```json
{
  "answer": "Your portfolio has 3 holdings with total value $10,000...",
  "citations": [
    {
      "confidence": 0.9,
      "snippet": "3 holdings, total 10000.00 USD",
      "source": "portfolio_analysis"
    },
    {
      "confidence": 0.85,
      "snippet": "Top allocation 50.00%, HHI 0.380",
      "source": "risk_assessment"
    }
  ],
  "confidence": {
    "score": 0.85,
    "band": "high"
  },
  "toolCalls": [
    {
      "tool": "portfolio_analysis",
      "status": "success",
      "input": {},
      "outputSummary": "3 holdings analyzed"
    },
    {
      "tool": "risk_assessment",
      "status": "success",
      "input": {},
      "outputSummary": "concentration medium"
    }
  ],
  "verification": [
    {
      "check": "numerical_consistency",
      "status": "passed",
      "details": "Allocation sum difference is 0.0000"
    },
    {
      "check": "tool_execution",
      "status": "passed",
      "details": "2/2 tools executed successfully"
    },
    {
      "check": "citation_coverage",
      "status": "passed",
      "details": "Each successful tool call has at least one citation"
    },
    {
      "check": "response_quality",
      "status": "passed",
      "details": "Response passed structure, actionability, and evidence heuristics"
    },
    {
      "check": "output_completeness",
      "status": "passed",
      "details": "Answer generated successfully"
    }
  ],
  "memory": {
    "sessionId": "test-1",
    "turns": 1
  }
}
```

---

## Verification Checklist

Before pushing to main, verify:

### UI Tests

- [ ] Sign up works
- [ ] Can access portfolio page
- [ ] AI chat panel appears
- [ ] Can send query
- [ ] Response displays correctly
- [ ] Citations visible
- [ ] Confidence score shows

### API Tests

- [ ] Health endpoint: `curl http://localhost:3333/api/v1/health`
- [ ] Chat endpoint responds (see tests above)
- [ ] Response format matches expected structure
- [ ] Tool executions logged
- [ ] Verification checks pass

### Automated AI Gates

```bash
npm run test:ai
npm run test:mvp-eval
npm run test:ai:quality
npm run test:ai:performance
npm run test:ai:live-latency
npm run test:ai:live-latency:strict
```

### Manual Tests

- [ ] Portfolio analysis returns holdings
- [ ] Risk assessment calculates HHI
- [ ] Market data returns prices
- [ ] Memory works across multiple queries with same sessionId
- [ ] Error handling graceful (try invalid query)

---

## Troubleshooting

### Issue: UI won't load

**Check:**
```bash
# Is client running?
curl http://localhost:4200

# Check console for errors
```

**Fix:**
```bash
# Restart client
pnpm start:client
```

---

### Issue: API returns 401 Unauthorized

**Check:**
```bash
# Is token valid?
echo $TOKEN
```

**Fix:**
- Get fresh token from UI (DevTools → Local Storage)
- Tokens expire after some time

---

### Issue: API returns 500 Internal Error

**Check API logs:**
```bash
# In terminal where pnpm start:server is running
# Look for error messages
```

**Common causes:**
- Redis not running: `docker-compose up -d`
- Database not migrated: `pnpm nx run api:prisma:migrate`
- Missing env var: Check `.env`

---

### Issue: Tools don't execute

**Check:**
```bash
# Is Redis running?
docker ps | grep redis

# Test Redis
redis-cli ping
# Should return: PONG
```

**Fix:**
```bash
docker-compose up -d redis
```

---

### Issue: No portfolio data

**You need to add holdings first:**

1. Go to http://localhost:4200/en/portfolio
2. Click **Add Activity**
3. Add a test holding (e.g., AAPL, 10 shares, $150/share)
4. Save
5. Try AI query again

---

## Quick Test Script

Save as `test-local.sh`:

```bash
#!/bin/bash

echo "Testing local AI agent..."

# Check services
echo "1. Checking services..."
docker ps | grep -E "postgres|redis" || exit 1
echo "   ✅ Docker services running"

# Check API
echo "2. Checking API..."
curl -s http://localhost:3333/api/v1/health | grep "OK" || exit 1
echo "   ✅ API responding"

# Check UI
echo "3. Checking UI..."
curl -s http://localhost:4200 | grep "ghostfolio" || exit 1
echo "   ✅ UI responding"

echo ""
echo "All checks passed! Ready to test."
echo ""
echo "Get token from:"
echo "  http://localhost:4200 → DevTools → Local Storage → accessToken"
echo ""
echo "Then test:"
echo '  curl -X POST http://localhost:3333/api/v1/ai/chat \
    -H "Authorization: Bearer $TOKEN" \
    -d '{"query":"test","sessionId":"check"}'
```

**Run:**
```bash
chmod +x test-local.sh
./test-local.sh
```

---

## Pre-Push Testing Flow

```bash
# 1. Start services
docker-compose up -d

# 2. Migrate database
pnpm nx run api:prisma:migrate

# 3. Start app
pnpm start

# 4. Open UI
# http://localhost:4200

# 5. Create account + get token

# 6. Test via UI (manual)

# 7. Test via API (curl commands)

# 8. Run automated tests
pnpm test:ai
pnpm test:mvp-eval

# 9. If all pass → push to main
git push origin main
```

`pnpm test:mvp-eval` now validates 50+ deterministic cases across these required categories:
- Happy path: 20+
- Edge case: 10+
- Adversarial: 10+
- Multi-step: 10+

If LangSmith tracing is enabled, eval suite runs are uploaded with per-case and per-category summaries.

---

## Summary

**To test locally:**
1. `docker-compose up -d`
2. `pnpm nx run api:prisma:migrate`
3. `pnpm start`
4. Open http://localhost:4200
5. Sign up → Get token
6. Test queries via UI or API
7. Run `pnpm test:ai`
8. If all pass → safe to push

**Time:** ~5-10 minutes for full manual test
