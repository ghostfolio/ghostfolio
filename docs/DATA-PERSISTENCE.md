# Data Persistence Fix

**Problem:** You need to sign up each time because you're switching between databases.

---

## Root Cause

You have **TWO sets of containers**:

| Old Containers | New Containers (docker-compose.yml) |
|---------------|--------------------------------------|
| `gf-postgres-dev` | `ghostfolio-db` |
| `gf-redis-dev` | `ghostfolio-redis` |

Each set has its own database. When you switch between them, you get a fresh database with no user account.

---

## Quick Check

```bash
# See what's running
docker ps

# See what your app connects to
grep DATABASE_URL .env
```

---

## Solution: Choose ONE

### Option A: Use Old Containers (Recommended if they have your data)

**Don't run `docker-compose up -d`**

Just start the app:
```bash
pnpm start
```

**Why:** Your old containers (`gf-postgres-dev`, `gf-redis-dev`) are already running and have your user account.

**Pros:**
- Keep existing data
- No setup needed

**Cons:**
- Not using your docker-compose.yml
- Different from production setup

---

### Option B: Use New Containers (Fresh start)

**Stop old containers:**
```bash
docker stop gf-postgres-dev gf-redis-dev
```

**Start new ones:**
```bash
docker-compose up -d
```

**Run migrations:**
```bash
pnpm nx run api:prisma:migrate
```

**Create account ONCE:**
1. Open http://localhost:4200
2. Sign up
3. Add holdings/seed money

**Data will now persist** even if you run:
```bash
docker-compose down  # Stops containers
docker-compose up -d  # Restarts with same data
```

---

## How Data Persistence Works

**Docker volumes save your data:**

```yaml
volumes:
  postgres-data:  # Saves: users, holdings, activities
  redis-data:     # Saves: AI chat memory
```

**When containers stop/restart:**
- ✅ Data persists in volumes
- ✅ User accounts stay
- ✅ Holdings stay
- ✅ AI memory stays (for 24h)

**When you `docker-compose down`:**
- ✅ Containers removed
- ✅ **Volumes stay** (data safe)

**When you remove volumes:**
```bash
docker volume rm ghostfolio_postgres-data
```
- ❌ All data lost

---

## Seed Money Question

**Q: Do I always have to add seed money?**

**A:** Only ONCE per database

1. Sign up
2. Add initial deposit: $10,000 (or whatever)
3. Add holdings
4. Data persists forever (until you delete volumes)

**To check if you have data:**
```bash
# Connect to database
docker exec -it ghostfolio-db psql -U ghostfolio -d ghostfolio

# Check users
SELECT * FROM "User";

# Check activities
SELECT COUNT(*) FROM "Activity";
```

---

## Recommended Setup

**Use your new containers (Option B):**

```bash
# 1. Stop old ones
docker stop gf-postgres-dev gf-redis-dev

# 2. Start new ones
docker-compose up -d

# 3. Migrate
pnpm nx run api:prisma:migrate

# 4. Create account (ONE TIME)
# 5. Add seed money (ONE TIME)

# 6. From now on, just:
docker-compose up -d
pnpm start

# Data persists forever
```

**This matches your production setup** and prevents confusion.

---

## Summary

| Question | Answer |
|----------|--------|
| Why sign up each time? | Switching between different databases |
| Do I have seed money? | Only if you added it (once per database) |
| Do containers persist data? | Yes, via Docker volumes |
| Which should I use? | Use ONE set consistently (recommend new) |
| How to keep data? | Don't delete volumes, use same containers |

---

## Troubleshooting

**Issue: Still losing data**

**Check:**
```bash
# Are you using same containers each time?
docker ps -a | grep postgres

# Do volumes exist?
docker volume ls | grep postgres

# Is .env pointing to right database?
grep DATABASE_URL .env
```

**Fix:**
1. Stop all postgres containers
2. Remove orphaned containers: `docker container prune`
3. Start fresh: `docker-compose up -d`
4. Migrate: `pnpm nx run api:prisma:migrate`
5. Create account once

---

## Best Practice

**Always use same startup sequence:**

```bash
# First time setup
docker-compose up -d
pnpm nx run api:prisma:migrate
# Create account, add data

# Every time after that
docker-compose up -d
pnpm start
```

**Never mix:**
- Old containers + docker-compose
- Multiple docker-compose files
- Manual docker run + docker-compose

---

**Bottom line:** Pick ONE set of containers, use it consistently, data will persist.
