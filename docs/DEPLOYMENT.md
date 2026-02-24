# Deployment Guide — Ghostfolio AI Agent

Two deployment options:
- **Railway** — 5-minute setup, free tier, fastest for MVP
- **Hostinger VPS** — Already paid, always-on, production-ready

---

## Option A: Railway Deploy (5 minutes)

### Prerequisites

- GitHub repo with AI agent code
- Railway account (free tier)
- RAILWAY_API_KEY (optional, for CLI deployment)

### Step 1: Prepare Repo

`railway.toml` already created in root:

```toml
[build]
builder = "NIXPACKS"

[deploy]
startCommand = "node main.js"
healthcheckPath = "/api/v1/health"
healthcheckTimeout = 300
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 10

[env]
NODE_ENV = "production"
PORT = "3333"
```

### Step 2: Push to GitHub

```bash
# Commit all changes
git add .
git commit -m "feat: add AI agent MVP with Railway deployment"
git push origin main
```

### Step 3: Deploy via Railway UI

1. Go to https://railway.app/new
2. Click **Deploy from GitHub repo**
3. Select your ghostfolio fork
4. Select branch: `main`
5. Railway auto-detects Node.js → Click **Deploy**

### Step 4: Add Environment Variables

In Railway dashboard → Your Project → Variables:

| Key | Value |
|-----|-------|
| `API_KEY_OPENROUTER` | `sk-or-v1-...` |
| `OPENROUTER_MODEL` | `anthropic/claude-3.5-sonnet` |
| `JWT_SECRET_KEY` | Generate: `openssl rand -hex 32` |
| `ACCESS_TOKEN_SALT` | Generate: `openssl rand -hex 32` |

**Railway auto-provides:**
- `DATABASE_URL` — PostgreSQL
- `REDIS_HOST` — Redis URL
- `REDIS_PORT` — Redis port

**Redis auth note (important):**
- Keep `REDIS_PASSWORD` empty unless your Redis instance explicitly requires password auth.
- Railway-managed Redis often runs without password auth by default.
- This project now handles empty password safely in Redis cache URL construction.

### Step 5: Get Deployed URL

Railway provides URLs like:
```
https://your-app.up.railway.app
https://ghostfolio-ai-agent-production.up.railway.app
```

### Step 6: Run Migrations

Railway console → Your service → **New Console**:

```bash
pnpm nx run api:prisma:migrate
```

### Step 7: Test Deployed Endpoint

```bash
export GHOSTFOLIO_URL="https://your-app.up.railway.app"
export TOKEN="your-jwt-token-from-web-ui"

curl -X POST $GHOSTFOLIO_URL/api/v1/ai/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "query": "Analyze my portfolio risk",
    "sessionId": "deploy-test"
  }'
```

### Optional: Deploy via CLI

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login --token $RAILWAY_API_KEY

# Init (creates railway project)
railway init

# Link to existing project
railway link

# Add PostgreSQL
railway add postgresql

# Add Redis
railway add redis

# Set environment variables
railway variables set API_KEY_OPENROUTER="sk-or-v1-..."
railway variables set OPENROUTER_MODEL="anthropic/claude-3.5-sonnet"
railway variables set JWT_SECRET_KEY="$(openssl rand -hex 32)"
railway variables set ACCESS_TOKEN_SALT="$(openssl rand -hex 32)"

# Deploy
railway up

# Open in browser
railway open

# View logs
railway logs
```

### Railway Free Tier Limits

| Resource | Limit |
|----------|-------|
| RAM | 512 MB |
| CPU | Shared |
| Hours/month | 500 hours ($5 free credit) |
| Sleep | After 15 min inactivity |
| Cold start | ~30 seconds |

**Workaround for sleep:** Use external monitoring (UptimeRobot, Better Uptime) to ping every 5 min.

---

## Option B: Hostinger VPS Deploy (1-2 hours)

### Prerequisites

- Hostinger VPS with SSH access
- Domain name (optional, for SSL)
- Basic Linux command line knowledge

### Step 1: SSH into VPS

```bash
ssh root@your-vps-ip
```

### Step 2: System Update

```bash
apt update && apt upgrade -y
```

### Step 3: Install Node.js 22+

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs
node --version  # Should be v22+
npm --version
```

### Step 4: Install pnpm

```bash
npm install -g pnpm
```

### Step 5: Install PM2 (Process Manager)

```bash
npm install -g pm2
```

### Step 6: Install PostgreSQL

```bash
apt install -y postgresql postgresql-contrib
systemctl enable postgresql
systemctl start postgresql
```

**Setup database:**

```bash
sudo -u postgres psql
```

```sql
CREATE DATABASE ghostfolio;
CREATE USER ghostfolio WITH PASSWORD 'your-secure-password';
GRANT ALL PRIVILEGES ON DATABASE ghostfolio TO ghostfolio;
ALTER USER ghostfolio CREATEDB;
\q
```

### Step 7: Install Redis

```bash
apt install -y redis-server
systemctl enable redis-server
systemctl start redis-server

# Verify
redis-cli ping
# Should return: PONG
```

### Step 8: Deploy Application

```bash
# Create app directory
mkdir -p /var/www
cd /var/www

# Clone your fork
git clone https://github.com/YOUR_USERNAME/ghostfolio.git
cd ghostfolio

# Or if pushing from local:
# git remote set-url origin git@github.com:YOUR_USERNAME/ghostfolio.git

# Install dependencies
pnpm install

# Build
pnpm build

# Run migrations
pnpm nx run api:prisma:migrate --prod
```

### Step 9: Environment Variables

```bash
cat > .env <<'ENVEOF'
DATABASE_URL="postgresql://ghostfolio:your-secure-password@localhost:5432/ghostfolio"
REDIS_HOST=localhost
REDIS_PORT=6379
API_KEY_OPENROUTER=sk-or-v1-...
OPENROUTER_MODEL=anthropic/claude-3.5-sonnet
JWT_SECRET_KEY=$(openssl rand -hex 32)
ACCESS_TOKEN_SALT=$(openssl rand -hex 32)
NODE_ENV=production
PORT=3333
ENVEOF

# Secure the file
chmod 600 .env
```

### Step 10: Start with PM2

```bash
# Start application
pm2 start dist/apps/api/main.js --name ghostfolio-api

# Save PM2 config
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Run the command it outputs

# Check status
pm2 status
pm2 logs ghostfolio-api
```

### Step 11: Configure Firewall

```bash
# Allow SSH
ufw allow 22/tcp

# Allow HTTP/HTTPS
ufw allow 80/tcp
ufw allow 443/tcp

# Allow app port (if accessing directly)
ufw allow 3333/tcp

# Enable firewall
ufw enable

# Check status
ufw status
```

### Step 12: Setup nginx (Recommended)

**Install nginx:**

```bash
apt install -y nginx
```

**Create config:**

```bash
cat > /etc/nginx/sites-available/ghostfolio <<'NGINXEOF'
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    location / {
        proxy_pass http://localhost:3333;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Increase upload size if needed
    client_max_body_size 10M;
}
NGINXEOF
```

**Enable site:**

```bash
ln -s /etc/nginx/sites-available/ghostfolio /etc/nginx/sites-enabled/
nginx -t  # Test config
systemctl restart nginx
```

### Step 13: SSL with Certbot (Free)

```bash
# Install Certbot
apt install -y certbot python3-certbot-nginx

# Get SSL certificate
certbot --nginx -d your-domain.com -d www.your-domain.com

# Follow prompts, choose redirect to HTTPS
```

**Auto-renewal is configured by default.**

### Step 14: Verify Deployment

```bash
# Check PM2
pm2 status

# Check logs
pm2 logs ghostfolio-api --lines 50

# Test locally
curl http://localhost:3333/api/v1/health

# Test from external
curl https://your-domain.com/api/v1/health
```

### Step 15: Test AI Endpoint

```bash
export GHOSTFOLIO_URL="https://your-domain.com"
export TOKEN="your-jwt-token"

curl -X POST $GHOSTFOLIO_URL/api/v1/ai/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "query": "Show my portfolio",
    "sessionId": "vps-test"
  }'
```

### Hostinger VPS Maintenance

**Update app:**

```bash
cd /var/www/ghostfolio
git pull origin main
pnpm install
pnpm build
pm2 restart ghostfolio-api
```

**View logs:**

```bash
pm2 logs ghostfolio-api
pm2 monit  # Real-time monitoring
```

**Restart:**

```bash
pm2 restart ghostfolio-api
pm2 reload ghostfolio-api  # Zero-downtime
```

**Database backup:**

```bash
# Backup
pg_dump -U ghostfolio ghostfolio > backup_$(date +%Y%m%d).sql

# Restore
psql -U ghostfolio ghostfolio < backup_20260223.sql
```

---

## Comparison Summary

| Feature | Railway | Hostinger VPS |
|---------|---------|---------------|
| **Setup time** | 5 min | 1-2 hours |
| **Cost** | Free tier / $5/m+ | Already paid |
| **Sleep** | Yes (15 min) | No |
| **SSL** | Auto (*.railway.app) | Manual (Certbot) |
| **Scaling** | Auto | Manual |
| **Control** | Limited | Full |
| **Best for** | MVP, demo | Production |

---

## Health Check Endpoint

Both deployments expose:

```
GET /api/v1/health
```

**Response:**
```json
{
  "status": "ok"
}
```

---

## Troubleshooting

### Railway: Build Fails

```bash
# Check build logs
railway logs --build

# Common fixes:
# - Ensure railway.toml is in root
# - Check NODE_ENV is set
# - Verify startCommand path is: node main.js
```

### Railway: App Sleeps

```bash
# Use external monitoring:
# - UptimeRobot: https://uptimerobot.com
# - Better Uptime: https://betteruptime.com

# Ping every 5 minutes to keep alive
```

### Railway: Slow API + Redis AUTH Errors

```bash
# Check logs for Redis auth spam
railway logs -s ghostfolio-api | grep "ERR AUTH"

# If logs show ERR AUTH and Railway Redis has no password auth:
# remove REDIS_PASSWORD from ghostfolio-api service vars
railway variable delete REDIS_PASSWORD -s ghostfolio-api -e production

# Redeploy after variable update
railway redeploy -s ghostfolio-api -y
```

### VPS: PM2 Won't Start

```bash
# Check Node version
node --version  # Must be 22+

# Check if port in use
lsof -i :3333

# Check logs
pm2 logs --err

# Restart PM2
pm2 delete ghostfolio-api
pm2 start dist/apps/api/main.js --name ghostfolio-api
```

### VPS: Database Connection Failed

```bash
# Verify PostgreSQL running
systemctl status postgresql

# Test connection
psql -U ghostfolio -h localhost -p 5432 -d ghostfolio

# Check DATABASE_URL in .env
echo $DATABASE_URL
```

### VPS: Redis Connection Failed

```bash
# Verify Redis running
systemctl status redis-server

# Test connection
redis-cli ping

# Check Redis is listening
netstat -lntp | grep 6379
```

### Common: Permission Denied

```bash
# Fix file permissions
chown -R $USER:$USER /var/www/ghostfolio
chmod -R 755 /var/www/ghostfolio

# Fix .env permissions
chmod 600 .env
```

---

## Next Steps After Deployment

1. ✅ Deploy to Railway (fastest)
2. ✅ Run smoke tests
3. ✅ Record demo video
4. 🔄 Update MVP-VERIFICATION.md with deployed URL
5. 🔄 Later: Migrate to Hostinger VPS for production

---

## Quick Reference

**Railway:**
- URL: https://railway.app
- CLI: `npm install -g @railway/cli`
- Docs: https://docs.railway.app

**Hostinger VPS:**
- SSH: `ssh root@ip`
- PM2: `pm2 [start|stop|restart|logs]`
- nginx: `/etc/nginx/sites-available/`
- SSL: `certbot --nginx`

**Useful Commands:**

```bash
# Railway
railway login
railway up
railway logs
railway open

# VPS
pm2 status
pm2 logs ghostfolio-api
systemctl status nginx
certbot renew --dry-run
```

---

**Both options documented.** Railway for speed, Hostinger for production.
