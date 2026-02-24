# Safe Deployment Guide

**Goal:** Push to main without breaking production.

---

## Current State

- **Branch:** `main`
- **Behind upstream:** 4 commits
- **Modified files:** 10
- **New files:** 30+

---

## What Can Break?

### HIGH RISK 🔴

| Change | Impact | Test Required |
|--------|--------|---------------|
| `ai.service.ts` orchestration logic | Breaks all AI queries | `pnpm test:ai` |
| Tool execution (`runPortfolioAnalysis`, etc.) | Wrong data returned | `pnpm test:ai` |
| Prisma schema changes | Database migration failures | `pnpm nx run api:prisma:migrate` |
| Environment variable names | Runtime errors | Check `.env.example` |
| `AiAgentChatResponse` interface | Frontend integration breaks | `pnpm test:ai` |

### MEDIUM RISK 🟡

| Change | Impact | Test Required |
|--------|--------|---------------|
| Verification check thresholds | False positives/negatives | `pnpm test:mvp-eval` |
| Memory key patterns | Session continuity breaks | Manual test |
| Confidence scoring formula | Wrong confidence bands | `pnpm test:ai` |
| Redis TTL values | Memory expires too soon | Manual test |

### LOW RISK 🟢

| Change | Impact | Test Required |
|--------|--------|---------------|
| Documentation (`docs/`) | None | N/A |
| Test additions (`*.spec.ts`) | None | `pnpm test:ai` |
| Comments | None | N/A |

---

## Pre-Push Checklist

### 1. Run AI Tests (Required)

```bash
pnpm test:ai
```

**Expected:** 20/20 passing

**If fails:** Fix before pushing.

---

### 2. Run MVP Evals (Required)

```bash
pnpm test:mvp-eval
```

**Expected:** 2/2 passing (8/8 eval cases)

**If fails:** Fix before pushing.

---

### 3. Build Check (Recommended)

```bash
pnpm build
```

**Expected:** No build errors

---

### 4. Database Migration Check (If Prisma Changed)

```bash
# Dry run
pnpm nx run api:prisma:migrate -- --create-only --skip-generate

# Actually run (after dry run succeeds)
pnpm nx run api:prisma:migrate
```

---

### 5. Lint Check (Recommended)

```bash
pnpm nx run api:lint
```

**Expected:** No new lint errors (existing warnings OK)

---

## Local Testing with Docker

### Option A: Full Stack (Recommended)

```bash
# 1. Start all services
docker-compose up -d

# 2. Wait for services to be healthy
docker-compose ps

# 3. Run database migrations
pnpm nx run api:prisma:migrate

# 4. Start API server
pnpm start:server

# 5. In another terminal, run tests
pnpm test:ai

# 6. Test manually (get token from UI)
export TOKEN="your-jwt-token"

curl -X POST http://localhost:3333/api/v1/ai/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"query":"Show my portfolio","sessionId":"local-test"}'
```

---

### Option B: Tests Only in Docker

```bash
# Run tests in Docker container
docker-compose run --rm api pnpm test:ai
```

---

## Git Safety Steps

### 1. Check What Will Be Pushed

```bash
git status
```

**Review:**
- Are modified files expected?
- Any unintended changes?

---

### 2. Review Diff Before Push

```bash
# Check AI changes only
git diff apps/api/src/app/endpoints/ai/

# Check specific file
git diff apps/api/src/app/endpoints/ai/ai.service.ts
```

**Look for:**
- Removed code (accidental deletes?)
- Changed interfaces (breaking changes?)
- Hardcoded values (should be env vars?)

---

### 3. Create Safety Branch (Optional)

```bash
# Create branch for changes
git checkout -b feature/ai-agent-mvp

# Push to branch first (safer than main)
git push origin feature/ai-agent-mvp

# Test on Railway with branch
# Railway → Deploy from branch

# Merge to main only after verification
```

---

### 4. Staged Push (Recommended)

```bash
# Stage only AI files (safer)
git add apps/api/src/app/endpoints/ai/
git add apps/api/src/app/endpoints/ai/evals/
git add docs/
git add railway.toml

# Commit
git commit -m "feat: AI agent MVP with 3 tools and verification"

# Push
git push origin main
```

---

## Rollback Plan

### If Deployment Breaks Production

**Option A: Railway Automatic Rollback**

Railway keeps previous deployments. In Railway dashboard:
1. Go to your project
2. Click "Deployments"
3. Click on previous successful deployment
4. Click "Redeploy"

**Option B: Git Revert**

```bash
# Revert last commit
git revert HEAD

# Push revert
git push origin main

# Railway auto-deploys the revert
```

**Option C: Emergency Hotfix**

```bash
# Create hotfix branch
git checkout -b hotfix/urgent-fix

# Make fix
git add .
git commit -m "hotfix: urgent production fix"
git push origin hotfix/urgent-fix

# Merge to main after verification
```

---

## Pre-Push Script (Automation)

Create `scripts/pre-push-check.sh`:

```bash
#!/bin/bash

echo "========================================"
echo "PRE-PUSH CHECKLIST"
echo "========================================"

# 1. Check branch
BRANCH=$(git branch --show-current)
echo "Branch: $BRANCH"

if [ "$BRANCH" != "main" ]; then
  echo "⚠️  Not on main branch (safer)"
else
  echo "🔴 On main branch (be careful!)"
fi

# 2. Run AI tests
echo ""
echo "Running AI tests..."
if pnpm test:ai; then
  echo "✅ AI tests passed"
else
  echo "❌ AI tests failed - ABORT PUSH"
  exit 1
fi

# 3. Run MVP evals
echo ""
echo "Running MVP evals..."
if pnpm test:mvp-eval; then
  echo "✅ MVP evals passed"
else
  echo "❌ MVP evals failed - ABORT PUSH"
  exit 1
fi

# 4. Check build
echo ""
echo "Checking build..."
if pnpm build; then
  echo "✅ Build succeeded"
else
  echo "❌ Build failed - ABORT PUSH"
  exit 1
fi

# 5. Check for unintended changes
echo ""
echo "Checking git status..."
MODIFIED=$(git status --short | wc -l | tr -d ' ')
echo "Modified files: $MODIFIED"

git status --short

echo ""
echo "========================================"
echo "✅ ALL CHECKS PASSED - SAFE TO PUSH"
echo "========================================"
```

**Use it:**

```bash
chmod +x scripts/pre-push-check.sh
./scripts/pre-push-check.sh && git push origin main
```

---

## Production Deployment Flow

### Safe Method (Branch First)

```bash
# 1. Create feature branch
git checkout -b feature/ai-agent-v2

# 2. Make changes
git add .
git commit -m "feat: new feature"

# 3. Push branch
git push origin feature/ai-agent-v2

# 4. Deploy branch to Railway
# Railway → Select branch → Deploy

# 5. Test production
# Test at https://ghostfolio-api-production.up.railway.app

# 6. If OK, merge to main
git checkout main
git merge feature/ai-agent-v2
git push origin main

# 7. Delete branch
git branch -d feature/ai-agent-v2
```

---

## Post-Push Verification

After pushing to main:

```bash
# 1. Check Railway deployment
# https://railway.app/project/your-project-id

# 2. Wait for "Success" status

# 3. Test health endpoint
curl https://ghostfolio-api-production.up.railway.app/api/v1/health

# 4. Test AI endpoint (with real token)
curl -X POST https://ghostfolio-api-production.up.railway.app/api/v1/ai/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"query":"Test","sessionId":"verify"}'

# 5. Check logs in Railway dashboard
```

---

## Common Issues & Fixes

### Issue: Tests Pass Locally, Fail on Railway

**Cause:** Environment variables missing

**Fix:**
```bash
# Check Railway env vars
railway variables

# Add missing vars
railway variables set API_KEY_OPENROUTER="sk-or-v1-..."
railway variables set OPENROUTER_MODEL="anthropic/claude-3.5-sonnet"
```

---

### Issue: Build Fails on Railway

**Cause:** Node version mismatch

**Fix:**
```bash
# Check package.json engines
cat package.json | grep -A 5 "engines"

# Railway supports Node 22+
# Update if needed
```

---

### Issue: Database Migration Fails

**Cause:** Schema conflicts

**Fix:**
```bash
# Reset database (dev only!)
railway db reset

# Or run specific migration
pnpm nx run api:prisma:migrate deploy --skip-generate
```

---

## Quick Reference

| Command | Purpose |
|---------|---------|
| `pnpm test:ai` | Run AI tests |
| `pnpm test:mvp-eval` | Run eval scenarios |
| `pnpm build` | Check build |
| `docker-compose up -d` | Start local services |
| `git status` | Check changes |
| `git diff apps/api/src/app/endpoints/ai/` | Review AI changes |
| `git push origin main` | Push to main |

---

## Safety Rules

1. ✅ **Never push without running tests first**
2. ✅ **Always review `git diff` before push**
3. ✅ **Use feature branches for experimental changes**
4. ✅ **Test on Railway branch before merging to main**
5. ✅ **Keep a rollback plan ready**
6. ❌ **Never push directly to main during business hours (if possible)**
7. ❌ **Never push schema changes without migration plan**

---

## Current Changes Summary

**High Risk Changes:**
- None currently

**Medium Risk Changes:**
- None currently

**Low Risk Changes:**
- Documentation updates
- New test files
- Configuration files

**Verdict:** ✅ SAFE TO PUSH (after running tests)

---

**Bottom Line:** Run `pnpm test:ai` and `pnpm test:mvp-eval` before every push. If both pass, you're safe.
