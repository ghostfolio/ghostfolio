# Early Submission Demo Video Script (3–5 minutes)

Record with QuickTime. Read callouts aloud.

---

## PART 1: Deployed App + AI Chat (~2 min)

### Scene 1 — Deployed URL (0:00)

1. Open browser to: `https://ghostfolio-production-f9fe.up.railway.app`
2. **Say:** "This is Ghostfolio with an AI financial agent, deployed on Railway."

### Scene 2 — Demo Login (0:15)

1. Navigate to: `https://ghostfolio-production-f9fe.up.railway.app/demo`
2. **Say:** "Logging in as the demo user — pre-seeded portfolio with 5 holdings: Apple, Microsoft, Amazon, Google, and Vanguard Total Stock Market ETF."
3. Briefly show the portfolio overview.

### Scene 3 — AI Chat: Holdings Query (0:30)

1. Click **"AI Chat"** in nav.
2. Type: **"What are my current holdings?"**
3. Wait for response.
4. **Say:** "The agent called the `get_portfolio_holdings` tool and returned real portfolio data — symbols, allocations, values, and performance."
5. **Point out the disclaimer** at the bottom: "Notice the financial disclaimer — this is one of three domain-specific verification checks."

### Scene 4 — Multi-Turn: Performance (1:00)

1. Type: **"How is my portfolio performing overall?"**
2. Wait for response.
3. **Say:** "This is a follow-up in the same conversation — conversation history is maintained. The agent used the `get_portfolio_performance` tool — total return of about 42% on a $15,000 investment."

### Scene 5 — Third Tool: Accounts (1:20)

1. Type: **"Show me my accounts"**
2. **Say:** "Third tool — `get_account_summary`. We have 8 tools total wrapping existing Ghostfolio services."

### Scene 6 — Error Handling (1:35)

1. Type: **"Sell all my stocks immediately"**
2. **Say:** "The agent is read-only — it gracefully refuses unsafe requests without crashing."

---

## PART 2: Verification Checks (~30 sec)

### Scene 7 — Verification in Response (1:50)

1. Scroll to a response with financial data.
2. **Say:** "We have three verification checks running on every response. First, financial disclaimer injection — you can see it at the bottom of every data-bearing response. Second, data-backed claim verification — the system extracts numbers from the response and verifies they appear in the tool results. Third, portfolio scope validation — if the agent mentions a stock symbol, it confirms that symbol actually exists in the user's portfolio."
3. If the response JSON is accessible (dev tools or API), briefly show the `verificationChecks` field.

---

## PART 3: Observability Dashboard (~45 sec)

### Scene 8 — Langfuse Traces (2:20)

1. Open a new tab: `https://us.cloud.langfuse.com` (log in if needed).
2. Navigate to the Ghostfolio project → Traces.
3. **Say:** "Every agent interaction is traced in Langfuse. You can see the full request lifecycle — input, LLM reasoning, tool calls, and output."
4. Click into one trace to show detail: latency breakdown, token usage, tool calls.
5. **Say:** "We're tracking latency, token usage, cost per query, and tool selection accuracy. This gives us full visibility for debugging and improvement."

---

## PART 4: Eval Suite (~1 min)

### Scene 9 — Run Evals (3:05)

1. Switch to terminal.
2. **Say:** "The eval suite has 55 test cases across four categories: happy path, edge cases, adversarial inputs, and multi-step reasoning."
3. Run:
   ```bash
   cd ~/Projects/Gauntlet/ghostfolio
   SKIP_JUDGE=1 AUTH_TOKEN="<token>" npx tsx apps/api/src/app/endpoints/ai/eval/eval.ts
   ```
4. Wait for results. Should show ~52/55 passing (94.5%).
5. **Say:** "52 out of 55 tests passing — 94.5% pass rate, above the 80% target. The suite tests tool selection, response coherence, safety refusals, hallucination detection, and multi-step reasoning."

---

## PART 5: Wrap-Up (4:00)

**Say:** "To summarize what's been added since MVP: Langfuse observability with full request tracing and cost tracking. Three domain-specific verification checks — financial disclaimers, data-backed claim verification, and portfolio scope validation. And the eval suite expanded from 10 to 55 test cases across all required categories. The agent has 8 tools wrapping real Ghostfolio services, maintains conversation history, handles errors gracefully, and is deployed publicly. Thanks for watching."

---

## Before Recording Checklist

- [ ] Railway deployment is up (visit URL to confirm)
- [ ] Langfuse dashboard has recent traces (run a query first to generate one)
- [ ] Browser open with no other tabs visible
- [ ] Terminal ready with eval command and AUTH_TOKEN set
- [ ] QuickTime set to record full screen
- [ ] You've done one silent dry run through the whole script