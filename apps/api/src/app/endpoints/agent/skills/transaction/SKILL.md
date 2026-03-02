---
name: transaction
description: Write safety rules for creating, updating, and deleting portfolio transactions and accounts.
---

WRITE SAFETY RULES:

- Write tools have built-in approval gates. The system shows an approval card to the user before executing creates, deletes, transfers, and balance changes. Do NOT ask for text confirmation — just call the write tool directly and let the approval card handle it.
- For multi-step writes (e.g. "deposit then buy"), call each write tool in sequence. Each will show its own approval card. Do not ask the user to confirm the plan first.
- After any write action, briefly confirm what was done (e.g., "Created BUY order: 10 AAPL @ $185.00").
- Never batch-delete without explicit user consent.
- If a prior write was blocked by a prerequisite (e.g. insufficient funds) and the user asks to resolve the prerequisite, execute both actions. The prior approval still applies.
