# Contributing

Thank you for considering contributing to Ghostfolio! This document will outline how to submit changes to this repository and which conventions to follow. If you are ever in doubt about anything we encourage you to reach out either by submitting an issue here or reaching out [via Slack](https://join.slack.com/t/ghostfolio/shared_invite/zt-vsaan64h-F_I0fEo5M0P88lP9ibCxFg).

### Important

Contributions are regularly triaged, but not at any fixed cadence. It varies depending on how busy the maintainers are. This is applicable to all types of PRs, so we kindly ask for your patience.

If you, as a community contributor, wish to work on more extensive features, please reach out to CODEOWNERS instead of directly submitting a PR with all the changes. This approach saves us both time, especially if the PR is not accepted (which will be the case if it does not align with our roadmap), and helps us effectively review and evaluate your contribution if it is accepted.

## Prerequisites

- **You're familiar with GitHub Issues and Pull Requests**
- **You've setup your local using steps mentioned in [README.md](./README.md)**

## Issues before PRs

1. Before you start working on a change please make sure that there is an issue for what you will be working on. You can either find and [existing issue](https://github.com/ghostfolio/ghostfolio/issues) or [open a new issue](https://github.com/ghostfolio/ghostfolio/issues/new) if none exists. Doing this makes sure that others can contribute with thoughts or suggest alternatives.

2. Before you start working on an issue, make sure you get it assigned to yourself. Creating a PR directly (i.e. without an approval to work on an issue from a Ghostfolio team member) is discouraged.

3. When you are ready to start working on a change you should first [fork the Ghostfolio repo](https://help.github.com/en/github/getting-started-with-github/fork-a-repo) and [branch out](https://help.github.com/en/github/collaborating-with-issues-and-pull-requests/creating-and-deleting-branches-within-your-repository) from the `main` branch.

4. Make your changes.

5. [Open a pull request towards the main branch in the Ghostfolio repo](https://help.github.com/en/github/collaborating-with-issues-and-pull-requests/creating-a-pull-request-from-a-fork). Within a couple of days a Ghostfolio team member will review, comment and eventually approve your PR.

## Workflow

### Branches

All changes should be part of a branch and submitted as a pull request - your branches should be prefixed with one of:

- `fix/` for bug fixes
- `feat/` for features
- `docs/` for documentation changes

### Commits

Strive towards keeping your commits small and isolated - this helps the reviewer understand what is going on and makes it easier to process your requests.

### Pull Requests

Once your changes are ready you must submit your branch as a pull request. Your pull request should be opened against the `main` branch in the main Ghostfolio repo.

In your PR's description you should follow the structure:

- **What** - what changes are in this PR
- **Why** - why are these changes relevant
- **How** - how have the changes been implemented
- **Testing** - how has the changes been tested or how can the reviewer test the feature

We highly encourage that you do a self-review prior to requesting a review. To do a self review click the review button in the top right corner, go through your code and annotate your changes. This makes it easier for the reviewer to process your PR.

#### Merge Style

All pull requests are squashed and merged.

### Release

The Ghostfolio team will regularly create releases from the main branch.
