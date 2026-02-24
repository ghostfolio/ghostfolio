# Implementation plan: agentforge-mvp-deployment

**Branch:** `features/agentforge-mvp-deployment`  
**Purpose:** Set up Railway hosting and a deployment pipeline for development/demo use.

**Decision doc:** [deployment-railway.md](../../deployment-railway.md)

---

## Phases

1. **Railway project setup** — Create project, add Postgres and Redis, configure env vars.
2. **App deployment** — Deploy Ghostfolio/AgentForge via Dockerfile; verify health.
3. **Pipeline** — Enable GitHub integration for auto-deploy; optionally add CI checks.
4. **Done** — Document URL, verify first user creation, open draft PR.

---

## Tasks

### Phase 1: Railway project setup

- [x] Create Railway account (if needed)
- [x] Create new project
- [x] Add PostgreSQL plugin; note `DATABASE_URL` is auto-injected
- [x] Add Redis plugin; note `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` (or equivalent) from plugin
- [x] Add manual env vars: `ACCESS_TOKEN_SALT`, `JWT_SECRET_KEY` (use `openssl rand -hex 32` or `node -e "..."`)
- [x] Add `ROOT_URL` (set to https://gauntlet-02-agentforge-production.up.railway.app)

### Phase 2: App deployment

- [x] Add service: deploy from GitHub (or upload Dockerfile)
- [x] Configure build: use existing `Dockerfile` (Railway detects it)
- [x] Wire Postgres and Redis: use Railway internal hostnames (`postgres.railway.internal`, `redis.railway.internal`) — see progress.md
- [x] Set `ROOT_URL` to the generated Railway URL
- [x] Deploy; run migrations and seed via entrypoint (vars fixed; redeploy succeeded)
- [x] Verify health; public URL accessible
- [ ] Open app URL in browser; create first user via Get Started (if needed)

**Public URL:** https://gauntlet-02-agentforge-production.up.railway.app (custom domain to be configured later)

### Phase 3: Pipeline

- [ ] Enable Railway GitHub integration: connect repo, set branch (e.g. `main`)
- [ ] Confirm auto-deploy on push
- [ ] (Optional) Add GitHub Actions workflow: `npm run format`, `npm run lint`, `npm test` on PR
- [ ] Document: add deploy URL and pipeline notes to `agentforge/doc/deployment-railway.md` or `DEVELOPMENT.md`

### Phase 4: Done

- [ ] Update progress log with lessons learned
- [ ] Open draft PR to `main`

---

## Notes

- Railway plugin variable names may differ from `.env.dev` (e.g. `REDIS_PRIVATE_URL`). Check Railway docs and map accordingly.
- If `DATABASE_URL` uses a different host than `localhost`, ensure Prisma can connect (no special config needed for Railway Postgres).
- First deploy runs `prisma migrate deploy` and `prisma db seed` via `docker/entrypoint.sh`.
