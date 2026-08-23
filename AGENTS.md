# Agent Collaboration Policy

Use subagents for implementation work that introduces multiple independent
features or components. Keep basic, single-purpose tasks in the main agent
unless delegation clearly improves the outcome.

## Model selection

- **Basic tasks:** delegate to a fast, economical model such as `gpt-5.6-luna`.
- **Complex implementation tasks:** delegate to a balanced model such as
  `gpt-5.6-terra`.
- **Code reviews and very complex tasks:** delegate to a frontier model such
  as `gpt-5.6-sol`.

When the available model names differ, choose the closest equivalent by the
same capability tier: fast/economical, balanced/complex, then frontier/review.

## Delegation practice

- Split only work that is independently actionable, with clear file or module
  ownership, to avoid overlapping edits.
- Retain final integration, verification, and user communication in the primary
  agent.
- Do not use subagents for simple edits, one-off questions, or narrowly scoped
  diagnostics unless the user explicitly requests delegation.

## Feature delivery and pull requests

- Deliver new features through pull requests.
- Once a requested task is complete and verified, automatically commit the
  relevant changes, push the branch, and open a pull request unless the user
  explicitly asks not to.
- Do not create a pull request for a question, investigation, review-only task,
  or an intentionally uncommitted work-in-progress.

## Follow-through

When the user asks why a requested action was not completed, treat the question
as a request to complete that action. Do not ask for confirmation unless doing
so requires new authority or would materially expand the stated scope.

## Pull request descriptions

Write a detailed but straightforward PR body for an AI engineer who does not
need to read the implementation to understand the change. Use plain language
and explain:

- what changed from a user's perspective;
- why it matters;
- how to verify it, including any important limitations or follow-up work.

Avoid implementation jargon, internal file names, framework details, and code
walkthroughs unless they are essential to using or reviewing the feature. Keep
the description focused: include enough context to make the decision clear,
without turning it into a technical design document.
