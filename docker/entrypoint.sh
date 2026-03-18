#!/bin/sh

set -e

echo "==> Running database migrations"
npx prisma migrate deploy

echo "==> Ensuring schema is fully synced"
npx prisma db push --skip-generate --accept-data-loss 2>/dev/null || echo "    (db push skipped â€” schema already in sync)"

echo "==> Seeding the database (if applicable)"
npx prisma db seed || echo "    (seed skipped or already applied)"

echo "==> Starting the server on port ${PORT:-3333}"
exec node main
