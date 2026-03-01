#!/bin/sh
# railway-deploy.sh
# Railway deployment entry-point for Ghostfolio.
# This script is executed inside the running container.  It runs database
# migrations, seeds the database, and starts the application server.
#
# Branch configuration (build-time):
#   - Ghostfolio:       main
#   - ghostfolio-agent: ghostfolio-main

set -e

echo "=== Ghostfolio Railway Deployment ==="

# ---------------------------------------------------------------------------
# 1. Database migrations
# ---------------------------------------------------------------------------
echo "Running database migrations ..."
npx prisma migrate deploy

# ---------------------------------------------------------------------------
# 2. Seed the database
# ---------------------------------------------------------------------------
echo "Seeding the database ..."
npx prisma db seed

# ---------------------------------------------------------------------------
# 3. Start the server
# ---------------------------------------------------------------------------
echo "Starting the Ghostfolio server ..."
exec node main
