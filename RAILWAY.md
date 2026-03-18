# Railway Deployment Guide

This guide explains how to deploy the application to [Railway](https://railway.app).

## Architecture

The app deploys as a **single Docker image** that includes both the NestJS API and the pre-built Angular client (served via `@nestjs/serve-static`). On Railway, you provision **three services**:

| Service | Type | Notes |
|---------|------|-------|
| **App** | Docker (this repo) | API + Client in one container |
| **Postgres** | Railway managed | `postgresql://...` connection string |
| **Redis** | Railway managed | Used for caching and Bull job queues |

## Quick Start

### 1. Create a Railway Project

1. Go to [railway.app](https://railway.app) and create a new project
2. Add a **PostgreSQL** service (click "Add Service" → "Database" → "PostgreSQL")
3. Add a **Redis** service (click "Add Service" → "Database" → "Redis")
4. Add your app (click "Add Service" → "GitHub Repo" → select this repo)

### 2. Configure Environment Variables

In your app service's **Variables** tab, set:

```
# From Railway's Postgres service (use the "Connect" tab to copy these)
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DB?connect_timeout=300&sslmode=prefer
POSTGRES_DB=railway
POSTGRES_USER=postgres
POSTGRES_PASSWORD=<from Railway>

# From Railway's Redis service (use the "Connect" tab to copy these)  
REDIS_HOST=<Redis private host>
REDIS_PORT=6379
REDIS_PASSWORD=<from Railway>

# App secrets (generate random strings)
ACCESS_TOKEN_SALT=<random-32-char-string>
JWT_SECRET_KEY=<random-32-char-string>

# Railway sets PORT automatically — do NOT set it manually
```

> **Tip:** Use Railway's [variable references](https://docs.railway.app/guides/variables#referencing-another-services-variable) to auto-wire `DATABASE_URL` from the Postgres service:
> ```
> DATABASE_URL=${{Postgres.DATABASE_URL}}?connect_timeout=300&sslmode=prefer
> REDIS_HOST=${{Redis.REDIS_HOST}}
> REDIS_PORT=${{Redis.REDIS_PORT}}
> REDIS_PASSWORD=${{Redis.REDIS_PASSWORD}}
> ```

### 3. Deploy

Railway auto-detects the `railway.toml` and `Dockerfile` in the repo root. Push to your connected branch and Railway will:

1. Build the Docker image (multi-stage: builder → slim runtime)
2. Run database migrations via `prisma migrate deploy`
3. Seed the database (if applicable)
4. Start the Node.js server on the Railway-assigned `$PORT`
5. Health-check at `/api/v1/health`

### 4. Set Up Networking

- In the app service's **Settings** tab, click **Generate Domain** to get a public URL
- Optionally add a custom domain

## Local Testing (Railway-like)

To test the full Docker build locally in a Railway-equivalent topology:

```bash
# 1. Copy the template and fill in your values
cp .env.railway .env.railway.local

# 2. Build and run all services
docker compose -f docker/docker-compose.railway.yml --env-file .env.railway.local up --build

# 3. Open http://localhost:3333
```

## File Overview

| File | Purpose |
|------|---------|
| `Dockerfile` | Multi-stage build: installs deps, builds API + Client, creates slim runtime image |
| `railway.toml` | Railway build & deploy configuration |
| `.dockerignore` | Excludes unnecessary files from Docker context |
| `.env.railway` | Template for Railway environment variables |
| `docker/entrypoint.sh` | Container startup: runs migrations, seeds DB, starts server |
| `docker/docker-compose.railway.yml` | Local simulation of Railway topology |

## Troubleshooting

### Build fails with OOM
Railway's free tier has limited memory. If the build fails, try:
- Upgrade to a paid plan (recommended for production)
- Or set `NODE_OPTIONS=--max-old-space-size=4096` in build environment variables

### Database connection refused
- Ensure `DATABASE_URL` uses the **private** networking hostname (not external)
- Verify the Postgres service is running in the same Railway project
- Check `?connect_timeout=300&sslmode=prefer` is appended to the URL

### Redis connection issues
- Use `REDIS_HOST` from the Redis service's private networking
- Ensure `REDIS_PASSWORD` matches exactly

### Health check failing
- The app needs ~30-40 seconds to start (migrations + seed + boot)
- The health check has a 40-second start period configured
- Check logs in Railway dashboard for startup errors
