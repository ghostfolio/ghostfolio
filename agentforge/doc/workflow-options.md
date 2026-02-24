# Agent–Human Workflow Options

Lightweight options for how we work together: where to keep design and plans, when the agent works automatically vs when it stops for your input, and how to use branches, commits, and pull requests. Aim is **simple and clear**, not full-featured.

---

## What we need to decide

1. **Where** to put high-level design, implementation plans, and progress logs
2. **When** the agent may create branches, make commits, or open PRs (and when it must not)
3. **When** the agent should **stop and ask** for your help, a decision, or approval

---

## Option A: Minimal (no agent git, ask often)

**Idea:** All design and plans live in `agentforge/doc/`. The agent **never** runs git commands unless you explicitly ask. The agent **stops and asks** before any destructive or high-impact action.

| Where                    | What                                                                                           |
| ------------------------ | ---------------------------------------------------------------------------------------------- |
| `agentforge/doc/`        | Everything: design docs, implementation plans, progress. One folder, no extra structure.       |
| Branches / commits / PRs | **You** create branches, commit, and open PRs. Agent only suggests commit messages or PR text. |

**When the agent stops and asks:**

- Before running any git command (branch, commit, push, PR)
- Before adding/removing dependencies, changing schema, or touching auth
- Before any change that could break the app or tests
- When the next step is ambiguous or could go several ways

**When the agent can proceed without asking:**

- Editing files, adding tests, refactoring within a clear scope you set
- Updating docs in `agentforge/doc/`
- Running read-only commands (e.g. tests, lint, search)

**Pros:** Maximum control, zero surprise. **Cons:** You do all git and merge workflow yourself.

---

## Option B: Lightweight (agent commits on a branch, you merge)

**Idea:** We agree on a single **feature branch** per chunk of work (e.g. `feature/agentforge-mvp` or `feature/agent-tools`). The agent may **create that branch**, **commit** on it, and **open a draft PR** to `main`. The agent **never** pushes to `main`, merges, or closes PRs. You review and merge when ready.

| Where                                       | What                                                                                            |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `agentforge/doc/`                           | Design and planning (e.g. `project-structure.md`, `project-definition.md`, implementation plan) |
| Same folder or `agentforge/doc/progress.md` | Short progress log: what’s done, what’s next, any blockers (agent updates this when it works)   |
| Branch                                      | One active feature branch; agent creates it if missing, commits in small logical steps          |
| PR                                          | Draft PR when a logical milestone is reached; you review and merge to `main`                    |

**When the agent may do automatically:**

- Create the agreed feature branch (if you said “work on AgentForge MVP” and branch doesn’t exist)
- Commit on that branch (small, logical commits; message explains the change)
- Push the branch and open a **draft** PR to `main` when a milestone is done
- Update `agentforge/doc/progress.md` (or chosen progress log)
- Edit code, add tests, update docs under the scope you gave

**When the agent must stop and ask:**

- Before merging to `main`, closing a PR, or pushing to `main`
- Before creating a **new** branch you didn’t agree on
- Before adding/removing dependencies, DB schema changes, or auth changes
- When the next step is ambiguous or the change is risky

**Pros:** You get a clear review point (PR) and history (commits) without doing every commit yourself. **Cons:** Requires agreeing on branch name and “one branch at a time.”

---

## Option C: Slightly structured (explicit workflow doc + progress)

**Idea:** Same as B, but we add **one** short workflow file that the agent (and you) follow. No full framework—just a single source of truth for “where things live” and “when to ask.”

| Where                                   | What                                                                                              |
| --------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `agentforge/doc/`                       | Design, plans, and the workflow doc itself (e.g. `workflow-options.md` or a chosen `WORKFLOW.md`) |
| `agentforge/doc/implementation-plan.md` | Implementation plan: phases, tasks, order (we create/update together)                             |
| `agentforge/doc/progress.md`            | Progress log: last updated, completed items, in progress, blockers                                |
| Branch / PR                             | Same as B: one feature branch, draft PRs, you merge                                               |

**Workflow doc contents (short):**

- Where design vs implementation plan vs progress live
- Branch naming (e.g. `feature/agentforge-<topic>`)
- “Agent may: create branch, commit, push branch, open draft PR, update progress”
- “Agent must ask before: merge, push to main, new branch, deps/schema/auth, ambiguous steps”

**When to auto vs ask:** Same as Option B; the workflow doc just encodes it so we both follow the same rules.

**Pros:** Clear, repeatable, one place to look. **Cons:** One extra file to keep in sync.

---

## Comparison

|                                   | Option A (Minimal)                  | Option B (Lightweight)                     | Option C (Structured)                                 |
| --------------------------------- | ----------------------------------- | ------------------------------------------ | ----------------------------------------------------- |
| **Design / plans**                | `agentforge/doc/`                   | `agentforge/doc/`                          | `agentforge/doc/` + optional `implementation-plan.md` |
| **Progress log**                  | Optional, in doc                    | Optional `progress.md`                     | Explicit `progress.md`                                |
| **Agent creates branch**          | No                                  | Yes (agreed branch)                        | Yes (per workflow doc)                                |
| **Agent commits**                 | No                                  | Yes, on feature branch                     | Yes, on feature branch                                |
| **Agent opens PR**                | No                                  | Yes, draft only                            | Yes, draft only                                       |
| **Agent merges / pushes to main** | No                                  | No                                         | No                                                    |
| **Workflow doc**                  | No                                  | No                                         | Yes (single file)                                     |
| **Best for**                      | Maximum control, you like doing git | Balanced: agent does commits/PR, you merge | Same as B but you want it written down                |

---

## “When to ask” vs “When to auto” (reusable table)

You can paste this into a Cursor rule or into `WORKFLOW.md` so the agent always follows it:

**The agent may do without asking:**

- Edit files and add tests within the scope you set
- Create or update docs in `agentforge/doc/` (including progress)
- Run read-only commands: tests, lint, search, build
- _(If using B or C)_ Create the agreed feature branch, commit on it, push it, open a **draft** PR to `main`

**The agent must stop and ask before:**

- Pushing to `main`, merging a PR, or closing a PR
- Creating a branch you didn’t agree on
- Adding/removing npm (or other) dependencies
- Changing Prisma schema, migrations, or auth-related code
- Any change that could break the app or test run
- When the next step is ambiguous or there are multiple reasonable choices
- When you’ve asked to “pause and check in” at the end of a task

---

## Recommendation

- **If you’re still feeling out agentic dev:** Start with **Option A**. No agent git; you keep full control; we still use `agentforge/doc/` for design and plans.
- **If you’re ready for the agent to own commits and draft PRs:** Use **Option B** (or **Option C** if you want the same rules in a single workflow doc and an explicit implementation plan + progress log).

Once you pick an option, we can:

- Add a short `WORKFLOW.md` (or a section in `project-structure.md`) that states the choice and the “when to ask” rules, and/or
- Add a Cursor rule so the agent always follows these rules in this repo.
