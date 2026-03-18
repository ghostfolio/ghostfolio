#!/bin/sh

set -e

echo "==> Running database migrations"
npx prisma migrate deploy

if [ "${DB_PUSH_ON_STARTUP}" = "true" ]; then
  echo "==> Syncing schema (DB_PUSH_ON_STARTUP=true)"
  npx prisma db push --skip-generate --accept-data-loss || echo "    (db push failed -- check schema and database state)"
fi

echo "==> Seeding the database (if applicable)"
npx prisma db seed || echo "    (seed skipped or already applied)"

echo "==> Starting the server on port ${PORT:-3333}"
exec node main
