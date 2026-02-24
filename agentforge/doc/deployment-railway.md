# Deployment: Railway

**Decision:** Use [Railway](https://railway.app) to host the full AgentForge stack (PostgreSQL, Redis, NestJS API + Angular client).

**Date:** 2025-02

---

## Rationale

- **Single platform** — PostgreSQL, Redis, and the app run on Railway. No external hosting required for core infrastructure.
- **Simple workflow** — Connect GitHub repo, add Postgres + Redis, deploy. Railway detects the Dockerfile or Node/Nx build.
- **Developer-friendly** — Env vars, logs, and redeployments in one place. Good fit for iterative development and demos.
- **Alternatives considered:** Firebase (no Postgres/Redis), Render (similar, good option), Fly.io (more manual), Docker on VPS (more ops overhead).

---

## What Runs Where

| Component      | Railway | Notes                                                          |
| -------------- | ------- | -------------------------------------------------------------- |
| PostgreSQL     | Yes     | Railway Postgres plugin; `DATABASE_URL` provided automatically |
| Redis          | Yes     | Railway Redis plugin; connection vars from plugin              |
| NestJS API     | Yes     | Serves API + built Angular client (single container)           |
| Angular client | Yes     | Built and served by the API (no separate static hosting)       |

**External APIs (configured via env, not hosted):**

- OpenRouter (LLM) — key stored in DB via admin UI
- LangSmith (observability) — optional, `LANGCHAIN_TRACING_V2`, `LANGCHAIN_API_KEY`
- Data providers (Yahoo, CoinGecko, etc.) — optional API keys

---

## Required Environment Variables

Set in Railway project settings. Railway injects `DATABASE_URL` and Redis vars when using plugins.

| Variable            | Source                 | Required                                       |
| ------------------- | ---------------------- | ---------------------------------------------- |
| `DATABASE_URL`      | Postgres plugin (auto) | Yes                                            |
| `REDIS_HOST`        | Redis plugin (auto)    | Yes                                            |
| `REDIS_PORT`        | Redis plugin (auto)    | Yes                                            |
| `REDIS_PASSWORD`    | Redis plugin (auto)    | Yes                                            |
| `ACCESS_TOKEN_SALT` | Manual                 | Yes                                            |
| `JWT_SECRET_KEY`    | Manual                 | Yes                                            |
| `ROOT_URL`          | Manual                 | Yes — e.g. `https://<your-app>.up.railway.app` |

See `README.md` and `.env.example` for the full list. AgentForge-specific: `PROPERTY_API_KEY_OPENROUTER`, `PROPERTY_OPENROUTER_MODEL` are typically configured in the DB via admin UI after first deploy.

---

## Deployment Pipeline (Development)

**Target:** Deploy on push to `main` (or a dedicated `staging` branch) so the team can test the live app during development.

1. **Railway GitHub integration** — Connect the repo; Railway deploys when the tracked branch changes.
2. **Optional: GitHub Actions** — Run tests before deploy (e.g. `npm test`, `npm run lint`). Can block merge until green; Railway can deploy after merge.
3. **Preview deployments** — Railway supports preview envs per PR. Enable if useful; otherwise keep a single staging/production deploy.

**Suggested flow:**

- `main` → auto-deploy to Railway
- Feature branches → test locally; merge to `main` when ready
- Add GitHub Action for `npm run format`, `npm run lint`, `npm test` on PRs (optional but recommended)

---

## Live URL

**Public:** https://gauntlet-02-agentforge-production.up.railway.app  
(Custom domain to be configured later)

---

## Implementation Plan

See [features/agentforge-mvp-deployment/implementation-plan.md](features/agentforge-mvp-deployment/implementation-plan.md) for phased tasks.
