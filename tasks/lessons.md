# Lessons

Updated: 2026-02-24

## Context / Mistake / Rule

1. Context: Documentation updates during rapid iteration
   Mistake: File path assumptions drifted across turns
   Rule: Verify target files with `find` and `wc -l` immediately after each save operation.

2. Context: Mixed policy documents (`agents.md`, `CLAUDE.md`, project requirements)
   Mistake: Source-of-truth order remained implicit
   Rule: Anchor task execution to `docs/requirements.md`, then align secondary operating docs to that baseline.

3. Context: AI endpoint review for MVP hardening
   Mistake: Utility regex and service size limits were under-enforced during fast delivery
   Rule: Add deterministic edge-case tests for parser heuristics and enforce file-size split before declaring MVP complete.

4. Context: Local MVP validation with UI-gated features
   Mistake: Test instructions skipped the exact in-app location and feature visibility conditions
   Rule: Document one deterministic URL path plus visibility prerequisites whenever a feature is behind settings or permissions.

5. Context: Railway deployments from local `railway.toml`
   Mistake: Start command drifted to a non-existent runtime path and caused repeated crash loops
   Rule: Keep `railway.toml` `startCommand` aligned with Docker runtime entrypoint and verify with deployment logs after every command change.

6. Context: Quality review requests with explicit target scores
   Mistake: Initial assessment did not immediately convert score gaps into concrete code-level remediation tasks
   Rule: For any score target, map each category gap to a named patch + test gate before returning a status update.

7. Context: AI routing hardening in deterministic tool orchestration
   Mistake: Considered model-structured output guards before validating actual failure surface
   Rule: When tool routing is deterministic, prioritize planner fallback correctness and executor policy gating before adding LLM classifier layers.
