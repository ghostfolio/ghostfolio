# Progress log: agentforge-mvp-deployment

**Branch:** `features/agentforge-mvp-deployment`  
**Last updated:** 2025-02-24

---

## Done

- Railway project created (disciplined-reprieve)
- PostgreSQL and Redis services added
- Repo connected (gerwaric/gauntlet-02-agentforge)
- Manual env vars set: ACCESS_TOKEN_SALT, JWT_SECRET_KEY
- First deploy triggered (build succeeded, runtime crashed on DB auth)
- Fixed DATABASE_URL and Redis vars: replaced Docker Compose hostnames with Railway’s internal URLs
- Removed POSTGRES_DB, POSTGRES_USER, POSTGRES_PASSWORD, COMPOSE_PROJECT_NAME
- Public URL configured: https://gauntlet-02-agentforge-production.up.railway.app
- ROOT_URL set; deployment accessible (custom domain to be configured later)

---

## In progress

- Create first user via Get Started (if not done)

---

## Blockers

- (None.)

---

## Troubleshooting / lessons learned

- **"Error deploying from source"** — Variable changes in Railway must be applied (separate button) before deploy.
- **P1000 Authentication failed** — App was using Docker Compose hostnames (`postgres:5432`, `redis`) instead of Railway’s. Use `postgres.railway.internal` and `redis.railway.internal` (or Postgres/Redis service variable references).
- **Fix:** Set DATABASE*URL to Postgres service’s full URL; set REDIS_HOST, REDIS_PORT, REDIS_PASSWORD from Redis service. Remove manual POSTGRES*\* vars.
