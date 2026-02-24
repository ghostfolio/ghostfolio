- existing repo ( brownfield )
- extra level of research 
- choice ( 2 project we can pick healthcare or finance )
- simple evals ( langsmith eval,)
- how to run locally? read instructions, pull them down and go with coding agents ( and breakin down ,frameowks, patterns, less code, simpler, cleaner)
- memory system
- when to use tools when not?
- check before returning rsponses ( vetted to some level, output formatter with citacions ( add confidence level,attach))
- required tools ( no overlap, enough to do meaningful work)
- eval framework ( which things to verify? which strtegies to use?)
- datasets we want to run against ( difficulty levels, regressions, test cases)
- observability ( this is 95% of how to put it together, scaling? )
- verifications ( guardrails )
- performance targets ()
- release to open source ( comits and prs)
- video record myself ( so i can have reference, early )
- add voice ?, build ai to access

-----------------------------------------
# Gauntlet Fellowship — Cohort G4 (Operating Notes)

## Context

- Government/regulated companies will be hiring → optimize for **reliability, auditability, security posture, and clear decision rationale**.
- No emojis in all generated files, only on the output is ok and when testing.
- No negations.
- We have access to Google models via:- `max.petrusenko@gfachallenger.gauntletai.com` (Gemini Pro, Nano Banana Pro, and other Google models).
- The stack must be justivied in the docs

## Required Documentation (Keep Updated)

> Reality check: client/project requirements can override this. Always re-anchor on the provided `requirements.md`.

### `docs/adr/` (Architecture Decision Records - mandatory for architectural changes)
- Check before any structural/architectural changes
- Cite relevant ADR in proposed changes
- Update ADR after refactors (prevents drift)
- Template: Context, Options (with rejected reasons), Decision, Trade-offs, What would change mind

### `Tasks.md` (mandatory)
- Ticket list + status
- Each feature: link to tests + PR/commit
- We also use linear cli/mcp check whats avaialble


## Engineering Standards

- We are making **system decisions** → prioritize correctness under constraints.

- **E2E TDD**:
  - Use for backend/system flows.
  - Avoid forcing E2E TDD for frontend UI polish.
- Frontend expectations:
  - Components + types (if React, use **v17+**).
  - **do not rewrite tests just to pass**.
  - tests run only before pushing to gh or when asked by user or rgr
- Code quality:
  - Must scale and perform reasonably.
  - Indexing + query design matters (especially Firestore / SQL).
  - lint and build should run after each implemented feature/ feature set
  - 1. before writing code right it the first time so it passes the logic tests
  - 2. rewrite the code clean elegant Modular way
  - 3. each file max ~500 LOC


---

## Research Workflow

- Always run **Presearch** first.
- Use **multi-model triangulation**:
  - Create Presearch doc once.
  - “Throw it” into multiple AIs → compare responses.
- Prefer Google Deep Research; if unavailable, use Perplexity.

---

## Hosting & System Design Focus

Key questions we must answer early (and revisit when requirements change):

- What’s the main focus *right now*? (may change later)
- Data storage model
- Security model
- File structure + naming conventions
- Legacy constraints (if any)
- Testing strategy
- Refactoring strategy
- Maintenance cost

System design checklist:
- Time to ship?
- Requirements clarity?
- Scaling/load profile?
- Budget?
- Team size/roles?
- Authentication?
- Failure modes?

---

## Docs & Tests Workflow

- If not already done: generate **PRD + MVP** from `requirements.md`.
- Walk through documentation *every time it changes*:
  - PRD
  - MVP
  - Patterns
  - Duplication / inconsistencies
  - project-level skill + symlink
- Tests:
  - Build tests for every new feature.
  - References:
    - https://github.com/steipete/CodexBar/tree/main/Tests
    - (E2E TDD styles referenced by Jeffrey Emanuel / Steve Yegge)

---

## Project Management

- Use **Linear** for tickets.
- After implementing a new feature:
  - Update `Tasks.md`
  - Update tests
  - Create or update ADR in `docs/adr/` (for architectural changes)
- Track maintenance cost implications.

---

## Tasks (Draft)

1. Can I download all transcripts and save them from Google to Gauntlet Notion (curriculum)?
2. Define “1 hour deliverables” and hard deadlines per week.
3. Find a good resource for system design:
   - Search top-rated + most-forked repos (Meta, OpenAI, Anthropic patterns).
4. IP implications if selecting a hiring partner.
6. Hand this plan to OpenClaw (as operating context).
7. Reminder: use Aqua + Whisper for talking to AI instead of typing.

---

## Submission Requirements (Must Include)

- Deployed app(s)
- Demo video
- Pre-search doc
- AI development log (1 page)
- LinkedIn or X post: what I did in 1 week
- AI cost analysis
- Document submission as **PDF**
- Add **PAT token** if GitHub repo access needs it


---

## AI Development Log (Required Template)

Submit a 1-page document covering:

- Tools & Workflow: which AI coding tools were used and how integrated
- MCP Usage: which MCPs were used (if any) and what they enabled
- Effective Prompts: 3–5 prompts that worked well (include actual prompts)
- Code Analysis: rough % AI-generated vs hand-written
- Strengths & Limitations: where AI excelled and struggled
- Key Learnings: insights about working with coding agents

---

## AI Cost Analysis (Required)

Track development and testing costs:

- LLM API costs (OpenAI, Anthropic, etc.)
- Total tokens consumed (input/output breakdown)
- Number of API calls
- Other AI-related costs (embeddings, hosting)

Production cost projections must include:

- 100 users: $___/month
- 1,000 users: $___/month
- 10,000 users: $___/month
- 100,000 users: $___/month

Include assumptions:

- average AI commands per user per session
- average sessions per user per month
- token counts per command type

---

## Technical Stack (Possible Paths)

- Backend:
  - Firebase (Firestore, Realtime DB, Auth)
  - Supabase
  - AWS (DynamoDB, Lambda, WebSockets)
  - Custom WebSocket server
- Frontend:
  - React / Vue / Svelte + Konva.js / Fabric.js / PixiJS / Canvas
  - Vanilla JS (if fastest)
- AI integration:
  - OpenAI (function calling)
  - Anthropic Claude (tool use / function calling)
- Deployment:
  - Vercel
  - Firebase Hosting
  - Render

> Rule: choose whichever ships fastest **after** completing Pre-Search to justify decisions.

---

## Build Strategy (Priority Order)

1. Cursor sync — two cursors moving across browsers
2. Object sync — sticky notes appear for all users
3. Conflict handling — simultaneous edits
4. State persistence — survive refresh + reconnect
5. Board features — shapes, frames, connectors, transforms
6. AI commands (basic) — single-step creation/manipulation
7. AI commands (complex) — multi-step template generation

---

## Critical Guidance


- Test simultaneous AI commands from multiple users.
- when creating new feature or ask by user review old test, create new tests if we test differently, make tests more deterministic
- Refactors require before/after benchmarks (latency, cost, failure rate) and updated regression tests; log deltas in CHANGELOG.md.
- Remove duplication and stale logic; document architectural shifts in ADRs (`docs/adr/`).

---

## Deadline & Deliverables

- Deadline: Sunday 10:59 PM CT
- GitHub repo must include:
  - setup guide
  - architecture overview
  - deployed linkxqd
- Demo video (3–5 min):
  - realtime collaboration
  - AI commands
  - architecture explanation
- Pre-Search document:
  - completed checklist (Phase 1–3)
- AI Development Log:
  - 1-page breakdown using required template
- AI Cost Analysis:
  - dev spend + projections for 100/1K/10K/100K users
- Deployed app:
  - publicly accessible
  - supports 5+ users with auth
  ## 9. Resources

**System Design**: Search top-rated/forked repos (META, OpenAI, Claude)

**Test Examples**: [CodexBar Tests](https://github.com/steipete/CodexBar/tree/main/Tests)



# Claude Code/Codex — Execution Protocol

## Philosophy
You are a staff engineer: autonomous, accountable, scope-disciplined. The user's time is the constraint. Do less, log the rest. Correct > fast > clever.

---

## Planning
- Any task with 3+ steps or architectural risk: write `tasks/tasks.md` before touching code. No exceptions.
- If you're wrong mid-task: stop, re-plan. Never compound a bad direction.
- Ambiguity threshold: if reverting a decision takes >30min (migrations, destructive ops, external side effects), surface it first. Otherwise proceed at 80% clarity and flag your assumption inline.
- Verification is part of the plan. A plan without a success criteria is incomplete.

## Context Window
- Summarize and compress completed phases before moving forward.
- Extract only what you need from subagent outputs — don't inline full results.
- If a session accumulates 5+ major phases, consider a clean handoff doc and fresh session.

## Subagents
- One task per subagent. Define input + expected output format before spawning.
- Parallelize independent tasks; don't serialize them.
- Conflicting outputs: resolve explicitly, log the tradeoff. Never silently pick one.
- Pass minimum context. Don't dump main context into every subagent.

## Tool & Command Failures
- Never retry blindly. Capture full error → form hypothesis → fix → retry once.
- If second attempt fails: surface to user with what failed, what you tried, root cause hypothesis.
- Never swallow a failure and continue as if it succeeded.
- Hanging process: set a timeout expectation before running. Kill and investigate; don't wait.

## Scope Discipline
- Out-of-scope improvements go to `tasks/improvements.md`. Do not implement them.
- Exception: if an out-of-scope bug is blocking task completion, fix it minimally and document it explicitly.
- Never let well-intentioned scope creep create review burden or regression risk.

## Self-Improvement Loop
- After any user correction: update `tasks/lessons.md` with the pattern as an actionable rule, not a description of the incident.
- At session start: scan `tasks/lessons.md` for keywords matching the current task type before planning. Not optional.
- Lesson format: `Context / Mistake / Rule`.

## Verification — Never Mark Done Without Proof
- Relevant tests pass (run them).
- No regressions in adjacent modules (check blast radius).
- Diff is minimal — no unrelated changes.
- Logs are clean at runtime.
- Would a staff engineer approve this? If no, fix it before presenting.
- No test suite: state this explicitly and describe manual verification.

## Elegance
- Before presenting: would you choose this implementation knowing what you know now? If no, do it right.
- Don't over-engineer simple fixes. Elegance = appropriate to the problem.
- If something feels hacky, it probably is. Investigate before shipping.

## Task Lifecycle
1. Write plan → `tasks/tasks.md`
2. Verify plan matches intent
3. Execute, mark items complete as you go
4. Run tests, review diff, check logs
5. Summarize changes at each phase
6. Log out-of-scope items → `tasks/improvements.md`
7. Capture lessons → `tasks/lessons.md`

## Core Rules
- Touch only what's necessary. Every extra line is a potential regression.
- No root cause shortcuts. Temporary fixes are future debt.
- Investigate before asking. The codebase, logs, and tests answer most questions.
- Never present speculation as fact. Flag uncertainty before answering.