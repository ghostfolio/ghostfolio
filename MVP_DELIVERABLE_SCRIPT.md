# MVP Demo Video Script (3–5 minutes)

Record with QuickTime. Read callouts aloud. Each **[MVP-X]** tag maps to a requirement.

---

## PART 1: Deployed App in Browser (~3 min)

### Scene 1 — Show Deployed URL (0:00)

1. Open browser. Navigate to:
   ```
   https://ghostfolio-production-f9fe.up.railway.app
   ```
2. **Say:** "This is Ghostfolio, deployed on Railway. It's publicly accessible."
3. Show the landing/login page loads.

> **[MVP-9] Deployed and publicly accessible** — visible: real URL, live site.

### Scene 2 — Demo User Login (0:20)

1. Navigate to:
   ```
   https://ghostfolio-production-f9fe.up.railway.app/demo
   ```
2. You'll be auto-logged in and redirected to the Overview page.
3. **Say:** "I'm logging in as a demo user. This account has a pre-seeded portfolio with 5 stock holdings — Apple, Microsoft, Vanguard Total Stock Market, Google, and Amazon."
4. Briefly show the Overview/Holdings page so the portfolio data is visible.

### Scene 3 — AI Chat: Natural Language Query + Tool Call (0:45)

1. Click **"AI Chat"** in the top navigation bar.
2. Type: **"What are my current holdings?"**
3. Press Enter. Wait for response.
4. **Say:** "The agent understood my natural language question, called the `get_portfolio_holdings` tool, and returned my actual portfolio data."

> **[MVP-1] Agent responds to natural language queries** — visible: typed question, got answer.
> **[MVP-2] At least 3 functional tools** — first tool shown: `get_portfolio_holdings`.
> **[MVP-3] Tool calls execute and return structured results** — visible: holdings with names, symbols, allocations.
> **[MVP-4] Agent synthesizes tool results into coherent response** — visible: formatted natural language summary, not raw JSON.

### Scene 4 — Multi-Turn Conversation (1:30)

1. In the same chat, type: **"How is my portfolio performing this year?"**
2. Wait for response.
3. **Say:** "This is a second question in the same conversation. The agent maintains conversation history across turns — it knows we were already talking about my portfolio. This used the `get_portfolio_performance` tool."

> **[MVP-5] Conversation history maintained across turns** — visible: second message in same chat, context preserved.
> **[MVP-2]** — second tool shown: `get_portfolio_performance`.

### Scene 5 — Third Tool (2:00)

1. Type: **"Show me my accounts"**
2. Wait for response.
3. **Say:** "That's a third tool — `get_account_summary` — showing account names, balances, and platforms. We've now demonstrated at least three distinct tools."

> **[MVP-2]** — third tool confirmed: `get_account_summary`.

### Scene 6 — Error Handling (2:20)

1. Type: **"Sell all my stocks right now"**
2. Wait for response.
3. **Say:** "The agent gracefully refuses unsafe requests. It explains it's a read-only assistant and cannot execute trades. No crash, no error — just a polite refusal."

> **[MVP-6] Basic error handling / graceful failure** — visible: no crash, friendly refusal message.

### Scene 7 — Domain-Specific Verification (2:45)

1. Scroll to any previous response that contains dollar amounts or percentages.
2. **Say:** "Notice the disclaimer at the bottom of responses with financial figures: 'All figures shown are based on your actual portfolio data. This is informational only and not financial advice.' This is a domain-specific verification — the agent only cites numbers from real tool results and appends a financial disclaimer automatically."

> **[MVP-7] At least one domain-specific verification check** — visible: financial disclaimer on data-bearing responses.

---

## PART 2: Evaluation Suite in Terminal (~1 min)

### Scene 8 — Run Eval (3:00)

1. Switch to terminal (or split screen).
2. **Say:** "Now I'll run the evaluation suite — 10 test cases that verify tool selection, response quality, safety, and non-hallucination."
3. Run:

   ```bash
   AUTH_TOKEN="<your bearer token>" npx tsx apps/api/src/app/endpoints/ai/eval/eval.ts
   ```

   _(To get a token: `curl -s https://ghostfolio-production-f9fe.up.railway.app/api/v1/info | python3 -c "import sys,json; print(json.load(sys.stdin)['demoAuthToken'])"` )_

   Or if running against localhost:

   ```bash
   AUTH_TOKEN="<token>" npx tsx apps/api/src/app/endpoints/ai/eval/eval.ts
   ```

4. Wait for all 10 tests to complete. The output shows each test with PASSED/FAILED, tools called, and individual checks.
5. **Say:** "All 10 test cases pass. The suite checks correct tool selection, non-empty responses, safety refusals, content validation, and non-hallucination."

> **[MVP-8] Simple evaluation: 5+ test cases with expected outcomes** — visible: 10 tests, pass/fail status, 100% pass rate.

---

## Wrap-Up (3:45)

**Say:** "To recap — this is a fully functional AI financial agent built on Ghostfolio. It responds to natural language, invokes 9 tools backed by real portfolio services, maintains multi-turn conversation, handles errors gracefully, includes financial verification checks, passes a 10-case evaluation suite, and is deployed publicly on Railway. Thanks for watching."

---

## Quick Reference: All 9 MVP Requirements

| #   | Requirement                          | Demonstrated In |
| --- | ------------------------------------ | --------------- |
| 1   | Natural language queries             | Scene 3         |
| 2   | 3+ functional tools                  | Scenes 3, 4, 5  |
| 3   | Tool calls return structured results | Scene 3         |
| 4   | Coherent synthesized responses       | Scene 3         |
| 5   | Conversation history across turns    | Scene 4         |
| 6   | Graceful error handling              | Scene 6         |
| 7   | Domain-specific verification         | Scene 7         |
| 8   | 5+ eval test cases                   | Scene 8         |
| 9   | Deployed and accessible              | Scene 1         |

---

## Before Recording Checklist

- [ ] Browser open, no other tabs visible
- [ ] Terminal ready with eval command prepared
- [ ] QuickTime set to record full screen
- [ ] Deployed site is up (visit URL to confirm)
- [ ] You know the demo URL: `https://ghostfolio-production-f9fe.up.railway.app/demo`
