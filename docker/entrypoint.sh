#!/bin/sh

echo "=== Ghostfolio entrypoint ==="
echo "PORT=${PORT:-not set}"
echo "DATABASE_URL set: $([ -n \"$DATABASE_URL\" ] && echo yes || echo NO)"
echo "REDIS_HOST=${REDIS_HOST:-not set}"

echo "Applying database schema..."
# Use db push for speed (applies full schema in one shot).
# migrate deploy runs 108 migrations sequentially which can exceed healthcheck timeout.
npx prisma db push --accept-data-loss 2>&1 || {
  echo "ERROR: prisma db push failed (exit $?). Trying migrate deploy as fallback..."
  npx prisma migrate deploy 2>&1 || echo "WARNING: migrate deploy also failed"
}

echo "Seeding the database..."
npx prisma db seed 2>&1 || echo "Seed failed (non-fatal), continuing..."

echo "Starting the server on port ${PORT:-3000}..."
exec node main
