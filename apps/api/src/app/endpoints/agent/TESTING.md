# How to Test the Agent (Production / Railway)

Base URL: `https://ghostfolio-production-1d0f.up.railway.app` (or your deployed URL)

## 1. Health check

```bash
curl -s https://ghostfolio-production-1d0f.up.railway.app/api/v1/health
# Expect: {"status":"OK"}
```

## 2. Get a JWT from your security token

Use your Ghostfolio **security token** (Admin → your user → access token).

```bash
export BASE=https://ghostfolio-production-1d0f.up.railway.app
export SECURITY_TOKEN="<paste your security token here>"

curl -s -X POST "$BASE/api/v1/auth/anonymous" \
  -H "Content-Type: application/json" \
  -d "{\"accessToken\": \"$SECURITY_TOKEN\"}"
# Expect: {"authToken":"eyJhbGc..."}  → save the authToken value
```

## 3. Chat with the agent (API)

```bash
export JWT="<paste the authToken from step 2>"

curl -s -X POST "$BASE/api/v1/agent/chat" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT" \
  -d '{"messages":[{"role":"user","content":"What is my current portfolio allocation?"}]}'
# Expect: {"message":{"role":"assistant","content":"..."},"verification":{...}}
```

## 4. Chat in the browser (easiest)

1. Open: **https://ghostfolio-production-1d0f.up.railway.app/api/v1/agent/chat**
2. When prompted, paste your **security token**.
3. The page exchanges it for a JWT and then you can chat in the UI.

## 5. Example test questions

- "What is my portfolio allocation?"
- "How did my portfolio perform this year?"
- "List my recent transactions."
- "What is the current price of AAPL?"

## Troubleshooting

- **403 on /auth/anonymous:** Security token is wrong or expired. Regenerate in Ghostfolio Admin.
- **403 on /agent/chat:** JWT expired or missing. Get a fresh JWT from step 2.
- **500 or empty response:** Check `OPENROUTER_API_KEY` and `OPENROUTER_MODEL` in Railway Variables.
