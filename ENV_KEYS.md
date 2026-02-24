# Where to Get All Keys & Setup

Two environments: **Local** (your machine) and **Railway** (production). You don’t “get” keys from a website for most of these — you either **generate** them yourself or **copy** them from Railway’s addons.

---

## Local (your machine)

You **choose** the values; nothing is provided by a third party except OpenRouter.

| Variable | Where to get it | Example |
|----------|-----------------|--------|
| **POSTGRES_PASSWORD** | You make it up (used by Docker Postgres) | `ghostfolio-pg-dev` |
| **REDIS_PASSWORD** | You make it up (used by Docker Redis) | `ghostfolio-redis-dev` |
| **DATABASE_URL** | Build it from the values above | `postgresql://user:ghostfolio-pg-dev@localhost:5432/ghostfolio-db?connect_timeout=300&sslmode=prefer` |
| **REDIS_HOST** | Fixed for local Docker | `localhost` |
| **REDIS_PORT** | Fixed | `6379` |
| **ACCESS_TOKEN_SALT** | Generate a random string (e.g. `openssl rand -hex 16`) | `agentforge-dev-salt-2026` |
| **JWT_SECRET_KEY** | Generate a random string (e.g. `openssl rand -hex 32`) | `agentforge-jwt-secret-2026` |
| **OPENROUTER_API_KEY** | From [openrouter.ai](https://openrouter.ai) → Keys → Create Key | `sk-or-v1-...` |
| **OPENROUTER_MODEL** | Your choice (optional; has default) | `openai/gpt-4o-mini` |
| **LANGSMITH_API_KEY** (optional) | From [smith.langchain.com](https://smith.langchain.com) → Settings → API Key. For AI request tracing (like Collabboard). | `lsv2_pt_...` |

**Setup:** Copy `.env.dev` to `.env`, then replace every `<INSERT_...>` with your chosen values. For a quick local dev setup you can use the examples in the table above.

---

## Railway (production)

Here, **Postgres and Redis are provided by Railway**; you only generate the two security strings and add your OpenRouter key.

| Variable | Where to get it |
|----------|-----------------|
| **DATABASE_URL** | Railway: add **Postgres** to the project → open the Postgres service → **Variables** or **Connect** tab → copy `DATABASE_URL` (or the connection string Railway shows). |
| **REDIS_HOST** | Railway: add **Redis** → open the Redis service → **Variables** → use the host (often something like `redis.railway.internal` or the public URL host). |
| **REDIS_PORT** | Same Redis service → **Variables** → e.g. `6379` or the port Railway shows. |
| **REDIS_PASSWORD** | Same Redis service → **Variables** → copy the password. |
| **ACCESS_TOKEN_SALT** | You generate it (e.g. `openssl rand -hex 16`). Never commit this. |
| **JWT_SECRET_KEY** | You generate it (e.g. `openssl rand -hex 32`). Never commit this. |
| **OPENROUTER_API_KEY** | Your key from [openrouter.ai](https://openrouter.ai). |
| **OPENROUTER_MODEL** | Your choice; e.g. `openai/gpt-4o-mini`. |
| **NODE_ENV** | Set to `production`. |
| **PORT** | **Required on Railway.** Set to `3000` so the app listens on the same port Railway routes to (target port 3000). The app default is 3333, so without this you get "Application failed to respond". |
| **LANGSMITH_API_KEY** (optional) | From [smith.langchain.com](https://smith.langchain.com). Enables LangSmith tracing for agent runs (latency, tokens, runs in dashboard). |

**Setup:** In your Railway project, open the **Ghostfolio** service (the one from GitHub) → **Variables** → add each variable. For Postgres and Redis, copy from the addon services. For `ACCESS_TOKEN_SALT` and `JWT_SECRET_KEY`, generate once and paste.

**If healthcheck fails:** Open the Ghostfolio service → **Deployments** → latest deploy → **View logs**. Use the **Deploy** (runtime) logs, not Build. Look for: `Entrypoint: PORT=...`, `Running database migrations`, `Seeding the database`, `Starting the server`, and `Listening at http://...`. If logs stop before `Listening at`, the failure is there (e.g. migrate/seed error or missing env). Ensure the service deploys from the branch that has the PORT fix (e.g. `feature/agent-forge`).

---

## Generate random strings (for ACCESS_TOKEN_SALT and JWT_SECRET_KEY)

**Terminal (macOS/Linux):**
```bash
openssl rand -hex 16   # for ACCESS_TOKEN_SALT
openssl rand -hex 32   # for JWT_SECRET_KEY
```

**Or:** use any password generator (e.g. 32+ random characters). Keep them secret and don’t put them in git.

---

## One-line summary

- **Local:** You invent Postgres/Redis passwords and the two salts; you get **OpenRouter** from openrouter.ai.
- **Railway:** You **copy** Postgres and Redis vars from Railway’s Postgres and Redis addons; you **generate** the two salts and **add** your OpenRouter key and model.
