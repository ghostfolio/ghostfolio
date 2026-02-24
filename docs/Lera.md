# Ghostfolio AI Agent — Setup Guide

For partner setup. Copy this, follow steps, run locally + VPS.

---

## Quick Decision Tree (READ THIS FIRST!)

**Before starting, check what's running:**

```bash
docker ps | grep postgres
```

**If you see `gf-postgres-dev`:**
- You have existing containers with data
- → Skip to **"Option A: Use Existing Containers"**
- → No need for docker-compose
- → Fast start, your data is already there

**If you see nothing (or only ghostfolio-db):**
- You need fresh containers
- → Follow **"Option B: Fresh Setup"** below
- → One-time setup, then data persists

**This prevents:**
- ❌ Long container spin-ups
- ❌ Losing data by switching databases
- ❌ Needing to sign up repeatedly

---

## One-Shot Quick Start

After cloning and editing `.env`:

```bash
# 1. Install dependencies
pnpm install

# 2. Start services (PostgreSQL + Redis)
docker-compose up -d

# 3. Run database migrations
pnpm nx run api:prisma:migrate

# 4. Start server
pnpm start:server

# 5. In another terminal, create account and get token:
# Open http://localhost:4200, sign up, then:
export GHOSTFOLIO_TOKEN="paste-token-from-browser-devtools"

# 6. Test AI endpoint
curl -X POST http://localhost:3333/api/v1/ai/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $GHOSTFOLIO_TOKEN" \
  -d '{"query": "Show my portfolio", "sessionId": "test"}'
```

---

## Important: Two Container Options

**READ THIS FIRST** — You may have existing Ghostfolio containers running.

**Check what's running:**
```bash
docker ps | grep postgres
```

**If you see `gf-postgres-dev`:**
- You have OLD containers with your data
- Skip to "Option A: Use Existing Containers" below

**If you see no postgres containers:**
- Use "Option B: Fresh Setup with docker-compose"

---

## Option A: Use Existing Containers (If Already Running)

**IF you already have `gf-postgres-dev` and `gf-redis-dev` running:**

```bash
# Don't run docker-compose up -d
# Just start the app
pnpm start

# Your existing account and data should work
```

**Why:** Your old containers already have your user account and holdings.

---

## Option B: Fresh Setup with docker-compose

**IF you want a fresh start or don't have containers yet:**

Follow the steps below.

---

## Local Setup (5 min)

### 1. Clone & Install

```bash
# Clone repo
git clone https://github.com/ghostfolio/ghostfolio.git
cd ghostfolio

# Install dependencies
pnpm install
```

### 2. Environment Variables

Create `.env` file in root:

```bash
# Database
DATABASE_URL="postgresql://ghostfolio:password@localhost:5432/ghostfolio"

# Redis (for AI agent memory)
REDIS_HOST=localhost
REDIS_PORT=6379

# OpenRouter (AI LLM provider)
OPENROUTER_API_KEY=sk-or-v1-...
OPENROUTER_MODEL=anthropic/claude-3.5-sonnet

# JWT Secrets (generate random strings)
ACCESS_TOKEN_SALT=your-random-salt-string-here
JWT_SECRET_KEY=your-random-jwt-secret-here

# Optional: Supabase (if using)
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-anon-key
```

**Generate random secrets:**

```bash
# Generate ACCESS_TOKEN_SALT
openssl rand -hex 32

# Generate JWT_SECRET_KEY
openssl rand -hex 32
```

### 3. Start Docker Services

```bash
# Start PostgreSQL + Redis
docker-compose up -d

# Or individual containers:
docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=password -e POSTGRES_USER=ghostfolio -e POSTGRES_DB=ghostfolio postgres:16
docker run -d -p 6379:6379 redis:alpine
```

### 4. Get Authentication Token

The AI endpoint requires a JWT token. Get it by:

**Option A: Web UI (Recommended)**

1. Open http://localhost:4200 in browser
2. Sign up for a new account
3. Open DevTools → Application → Local Storage
4. Copy the `accessToken` value

**Option B: API Call**

```bash
# Sign up and get token
curl -X POST http://localhost:3333/api/v1/auth/anonymous \
  -H "Content-Type: application/json" \
  -d '{"accessToken": "any-string"}'
```

Save this token as `GHOSTFOLIO_TOKEN` in your shell:

```bash
export GHOSTFOLIO_TOKEN="your-jwt-token-here"
```

### 5. Run Project

```bash
# Start API server
pnpm start:server

# Or run all services
pnpm start
```

### 6. Test AI Agent

```bash
# Run AI tests
pnpm test:ai

# Run MVP evals
pnpm test:mvp-eval
```

---

## VPS Setup (Hostinger) — External Services

### What Goes on VPS

- **Redis** — AI agent session memory
- **PostgreSQL** — Optional (can use local)
- **LangSmith** — Observability (optional, for tracing)

### Hostinger VPS Steps

#### 1. SSH into VPS

```bash
ssh root@your-vps-ip
```

#### 2. Install Docker

```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
```

#### 3. Deploy Redis

```bash
docker run -d \
  --name ghostfolio-redis \
  -p 6379:6379 \
  redis:alpine
```

#### 4. Deploy PostgreSQL (Optional)

```bash
docker run -d \
  --name ghostfolio-db \
  -p 5432:5432 \
  -e POSTGRES_PASSWORD=your-secure-password \
  -e POSTGRES_USER=ghostfolio \
  -e POSTGRES_DB=ghostfolio \
  postgres:16
```

#### 5. Firewall Rules

```bash
# Allow Redis (restrict to your IP)
ufw allow from YOUR_IP_ADDRESS to any port 6379

# Allow PostgreSQL (restrict to your IP)
ufw allow from YOUR_IP_ADDRESS to any port 5432
```

---

## Update Local `.env` for VPS

```bash
# Use VPS services
REDIS_HOST=your-vps-ip
REDIS_PORT=6379

DATABASE_URL="postgresql://ghostfolio:your-secure-password@your-vps-ip:5432/ghostfolio"

# Keep local
OPENROUTER_API_KEY=sk-or-v1-...
OPENROUTER_MODEL=anthropic/claude-3.5-sonnet
```

---

## Run AI Agent Locally

### Start Services

```bash
# Terminal 1: Docker services (if using local)
docker-compose up -d

# Terminal 2: API server
pnpm start:server
```

### Test Chat Endpoint

```bash
# Using env variable (after export GHOSTFOLIO_TOKEN)
curl -X POST http://localhost:3333/api/v1/ai/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $GHOSTFOLIO_TOKEN" \
  -d '{
    "query": "Analyze my portfolio risk",
    "sessionId": "test-session-1"
  }'

# Or paste token directly
curl -X POST http://localhost:3333/api/v1/ai/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "query": "What is my portfolio allocation?",
    "sessionId": "test-session-2"
  }'
```

---

## Docker Compose (All-in-One)

Save as `docker-compose.yml`:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16
    container_name: ghostfolio-db
    environment:
      POSTGRES_USER: ghostfolio
      POSTGRES_PASSWORD: password
      POSTGRES_DB: ghostfolio
    ports:
      - "5432:5432"
    volumes:
      - postgres-data:/var/lib/postgresql/data

  redis:
    image: redis:alpine
    container_name: ghostfolio-redis
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data

volumes:
  postgres-data:
  redis-data:
```

Run:

```bash
docker-compose up -d
```

---

## Troubleshooting

### Redis Connection Failed

```bash
# Check if Redis is running
docker ps | grep redis

# View logs
docker logs ghostfolio-redis

# Test connection
redis-cli -h localhost ping
```

### Database Migration Failed

```bash
# Run migrations manually
pnpm nx run api:prisma:migrate
```

### API Key Errors

```bash
# Verify OpenRouter key
curl https://openrouter.ai/api/v1/auth/key \
  -H "Authorization: Bearer $OPENROUTER_API_KEY"
```

---

## Project Structure (AI Agent)

```
apps/api/src/app/endpoints/ai/
├── ai.controller.ts           # POST /chat endpoint
├── ai.service.ts              # Main orchestrator
├── ai-agent.chat.helpers.ts   # Tool runners
├── ai-agent.utils.ts          # Tool planning
├── ai-chat.dto.ts             # Request validation
├── evals/                     # Evaluation framework
└── *.spec.ts                  # Tests
```

---

## Quick Commands Reference

```bash
# Install
pnpm install

# Start services
docker-compose up -d

# Run API
pnpm start:server

# Run tests
pnpm test:ai
pnpm test:mvp-eval

# Stop services
docker-compose down
```

---

## Seed Money Runbook (Local / VPS / Railway)

Use this section to add portfolio activities quickly for demos and AI testing.
If activities exist but cash shows `0.00`, add account balance snapshots (Ghostfolio reads cash from `AccountBalance`).

### Local

```bash
# 1) Seed baseline AI MVP dataset
npm run database:seed:ai-mvp

# 2) Add extra money/orders dataset (idempotent)
npx dotenv-cli -e .env -- psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f tools/seed/seed-money.sql
```

### VPS

```bash
# Run from project root on the VPS with env loaded
npm run database:migrate
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f tools/seed/seed-money.sql
```

### Railway

```bash
# Link project/service once
railway link
railway service link ghostfolio-api

# Seed money dataset into Railway Postgres
tools/railway/seed-money.sh

# Optional health check after seeding
curl -sS https://ghostfolio-api-production.up.railway.app/api/v1/health
```

Notes:
- `tools/seed/seed-money.sql` is idempotent and uses `railway-seed:*` markers.
- `tools/railway/seed-money.sh` uploads SQL and executes it inside the Railway `postgres` service.
- Railway Redis default often uses no password auth. Keep `REDIS_PASSWORD` empty on `ghostfolio-api` unless Redis auth is enabled.

### No Repo Access: Copy/Paste Cash Top-Up SQL

Use this when only CLI/DB access is available.

```sql
WITH target_balances AS (
  SELECT
    a."id" AS account_id,
    a."userId" AS user_id,
    CASE
      WHEN a."name" = 'MVP Portfolio' THEN 10000::double precision
      WHEN a."name" = 'Income Portfolio' THEN 5000::double precision
      WHEN a."name" = 'My Account' THEN 2000::double precision
      ELSE NULL
    END AS value
  FROM "Account" a
  WHERE a."name" IN ('MVP Portfolio', 'Income Portfolio', 'My Account')
)
INSERT INTO "AccountBalance" ("id", "accountId", "userId", "date", "value", "createdAt", "updatedAt")
SELECT
  gen_random_uuid()::text,
  t.account_id,
  t.user_id,
  CURRENT_DATE,
  t.value,
  now(),
  now()
FROM target_balances t
WHERE t.value IS NOT NULL
ON CONFLICT ("accountId", "date")
DO UPDATE SET
  "value" = EXCLUDED."value",
  "updatedAt" = now();
```

Railway one-liner with inline SQL:

```bash
railway ssh -s postgres -- sh -lc 'cat >/tmp/topup.sql <<'"'"'"'"'"'"'"'"'SQL'"'"'"'"'"'"'"'"'
WITH target_balances AS (
  SELECT
    a."id" AS account_id,
    a."userId" AS user_id,
    CASE
      WHEN a."name" = $$MVP Portfolio$$ THEN 10000::double precision
      WHEN a."name" = $$Income Portfolio$$ THEN 5000::double precision
      WHEN a."name" = $$My Account$$ THEN 2000::double precision
      ELSE NULL
    END AS value
  FROM "Account" a
  WHERE a."name" IN ($$MVP Portfolio$$, $$Income Portfolio$$, $$My Account$$)
)
INSERT INTO "AccountBalance" ("id", "accountId", "userId", "date", "value", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, t.account_id, t.user_id, CURRENT_DATE, t.value, now(), now()
FROM target_balances t
WHERE t.value IS NOT NULL
ON CONFLICT ("accountId", "date")
DO UPDATE SET "value" = EXCLUDED."value", "updatedAt" = now();
SQL
psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f /tmp/topup.sql'
```

---

## Next Steps

1. ✅ Set up local environment
2. ✅ Run `pnpm test:ai` to verify
3. ✅ Deploy to Railway (5 min) or Hostinger VPS (1-2 hours)
4. 🔄 See `docs/DEPLOYMENT.md` for full deployment guide
5. 🔄 Update MVP-VERIFICATION.md with deployed URL

---

## Why Do I Need To Sign Up Each Time?

**Problem:** If you keep needing to sign up, you're switching between databases.

**Cause:** You have TWO sets of possible containers:

| Old Containers | New Containers (docker-compose.yml) |
|---------------|--------------------------------------|
| `gf-postgres-dev` | `ghostfolio-db` |
| `gf-redis-dev` | `ghostfolio-redis` |

Each has its own database. When you switch between them, you get a fresh database.

**Solution:** Pick ONE and use it consistently.

**Option A: Keep using old containers**
```bash
# Don't run docker-compose
# Just:
pnpm start
```

**Option B: Switch to new containers**
```bash
# Stop old ones
docker stop gf-postgres-dev gf-redis-dev

# Start new ones
docker-compose up -d

# Migrate
pnpm nx run api:prisma:migrate

# Create account ONCE
# Data persists from now on
```

**Data Persistence:**
- ✅ User accounts persist in Docker volumes
- ✅ Holdings persist
- ✅ No need to re-sign up if using same containers

**For full details:** See `docs/DATA-PERSISTENCE.md`

---

## Deployment

**Quick options:**

| Platform | Time | Cost | Guide |
|----------|------|------|-------|
| Railway | 5 min | Free tier | `railway.toml` included |
| Hostinger VPS | 1-2 hours | Already paid | See `docs/DEPLOYMENT.md` |

**Railway quick start:**

```bash
# 1. Push to GitHub
git add . && git commit -m "Ready for Railway" && git push

# 2. Go to https://railway.app/new → Connect GitHub repo

# 3. Add env vars in Railway dashboard:
#    API_KEY_OPENROUTER=sk-or-v1-...
#    OPENROUTER_MODEL=anthropic/claude-3.5-sonnet
#    JWT_SECRET_KEY=(openssl rand -hex 32)
#    ACCESS_TOKEN_SALT=(openssl rand -hex 32)
#    REDIS_PASSWORD=(leave empty unless Redis auth is enabled)

# 4. Deploy → Get URL like:
#    https://your-app.up.railway.app
```

**Full deployment guide:** `docs/DEPLOYMENT.md`

---

## Speed Up Docker Builds

Use these commands for faster iteration loops:

```bash
# 1) Build with BuildKit enabled
DOCKER_BUILDKIT=1 docker build -t ghostfolio:dev .

# 2) Warm dependency layer first (runs fast when package-lock.json is unchanged)
docker build --target builder -t ghostfolio:builder-cache .

# 3) Deploy in detached mode on Railway to keep terminal free
railway up --detach --service ghostfolio-api

# 4) Build with explicit local cache reuse
docker buildx build \
  --cache-from type=local,src=.buildx-cache \
  --cache-to type=local,dest=.buildx-cache-new,mode=max \
  -t ghostfolio:dev .
mv .buildx-cache-new .buildx-cache
```

High-impact optimization path:
- Keep `package-lock.json` stable to maximize Docker cache hits.
- Group dependency changes into fewer commits.
- Use prebuilt image deployment for Railway when push frequency is high.

---

## Questions?

- OpenRouter key: https://openrouter.ai/keys
- Railway: https://railway.app
- Ghostfolio docs: https://ghostfolio.org/docs
- Hostinger VPS: https://support.hostinger.com/en/articles/4983461-how-to-connect-to-vps-using-ssh
- Full deployment docs: `docs/DEPLOYMENT.md`
