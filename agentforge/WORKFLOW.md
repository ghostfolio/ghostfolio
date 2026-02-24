# AgentForge Workflow

**Source of truth** for how we work on AgentForge. Option C: structured workflow with per-branch plans and logs, conventional commits, and pre-commit checks.

---

## 1. Branch naming

- **Pattern:** `features/agentforge-mvp-<feature-name>`
- **Examples:** `features/agentforge-mvp-setup`, `features/agentforge-mvp-tools`, `features/agentforge-mvp-verification`
- One feature branch per chunk of work. When starting a new chunk, we agree the branch name; the agent uses it until the feature is complete and a PR is opened.

---

## 2. Where plans and logs live (per branch)

- **One implementation plan and one progress log per branch**, in a **features** subfolder under `agentforge/doc/`.
- **Folder name:** branch name with `/` replaced by `-`.  
  Example: branch `features/agentforge-mvp-tools` → folder `agentforge/doc/features/agentforge-mvp-tools/`
- **Files per feature folder:**
  - `implementation-plan.md` — phases, tasks, order for this feature
  - `progress.md` — progress log for this branch (done, in progress, blockers, troubleshooting, lessons learned)
- **Index:** `agentforge/doc/features-index.md` lists all feature branches and links to each branch’s plan and log. The agent (or you) adds a row when starting a new branch.

---

## 3. When the agent may do things (without asking)

- Create the agreed feature branch if it doesn’t exist
- Commit on that branch (after pre-commit checks; see §6)
- Push the branch
- Update the **progress log** for the current branch (`agentforge/doc/features/<branch-folder>/progress.md`), including troubleshooting and lessons learned
- Create/update the implementation plan for the current branch when we agree on tasks
- Edit code, add tests, update docs within the scope you set

---

## 4. When the agent opens a PR

- Open a **draft PR** to `main` when work on the feature branch is **complete and ready for testing**.
- Do **not** merge or close the PR; you review, test, and merge.

---

## 5. When the agent must stop and ask

- Before pushing to `main`, merging a PR, or closing a PR
- Before creating a branch that doesn’t follow the pattern or that you didn’t agree on
- Before adding/removing dependencies, changing Prisma schema, or changing auth-related code
- When the next step is ambiguous or there are multiple reasonable choices
- When you say “pause and check in” or “stop for review”

---

## 6. Pre-commit checks

Before **each commit**, the agent must run (and fix failures if possible, or stop and report):

1. **Format:** `npm run format`
2. **Lint:** `npm run lint`
3. **Tests:** Run tests for affected code, e.g.
   - `npm run test:api` if API or agent code changed
   - `npm run test:common` if `libs/common` changed
   - Or `npm test` for full suite when in doubt

If a check fails, fix or stop and ask before committing.

---

## 7. Commit messages

Use **conventional commit** format with a **body** that summarizes key changes and reasoning.

- **Format:** `<type>(<scope>): <short summary>` then blank line then body (key changes, reasoning).
- **Types:** `feat`, `fix`, `docs`, `chore`, `refactor`, `test` as appropriate.
- **Scope:** e.g. `agentforge`, `api`, `agent`, `tools`.

**Example:**

```
feat(agentforge): add portfolio_analysis tool

- Wire PortfolioService.getDetails() into agent tool handler.
- Return structured holdings and allocation for LLM context.
- Add unit test with mocked PortfolioService.
```

---

## 8. Starting a new feature branch

When we agree to start a new feature (e.g. “work on tools”):

1. **Branch:** Create branch `features/agentforge-mvp-<feature-name>` from `main` (or current base).
2. **Folder:** Create `agentforge/doc/features/agentforge-mvp-<feature-name>/` with:
   - `implementation-plan.md` (phases/tasks for this feature)
   - `progress.md` — copy from `agentforge/doc/features/agentforge-mvp-setup/progress.md` (or use same structure: Done, In progress, Blockers, Troubleshooting / Lessons learned)
3. **Index:** Add a row in `agentforge/doc/features-index.md`. Table columns: Branch | Folder | Plan | Progress | Status. See the existing table for link format.

---

## 9. Resuming work

When resuming, read `agentforge/doc/features-index.md` and the current branch's `progress.md` to see status, blockers, and lessons learned.

---

## 10. Summary

| What                     | Where / When                                                                    |
| ------------------------ | ------------------------------------------------------------------------------- |
| Workflow source of truth | This file: `agentforge/WORKFLOW.md`                                             |
| Branch pattern           | `features/agentforge-mvp-<feature-name>`                                        |
| Plan + log per branch    | `agentforge/doc/features/<branch-folder>/implementation-plan.md`, `progress.md` |
| Index of features        | `agentforge/doc/features-index.md`                                              |
| Agent updates            | Progress log (including troubleshooting, lessons learned)                       |
| PR                       | When feature is complete and ready for testing; you merge                       |
| Pre-commit               | `npm run format`, `npm run lint`, tests for affected code                       |
| Commits                  | Conventional format + body (key changes, reasoning)                             |
| Ask before               | Merge, push to main, new/unagreed branch, deps/schema/auth, ambiguous step      |
| Resuming                 | Read `features-index.md` and current branch's `progress.md`                     |
