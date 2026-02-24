#!/bin/sh

set -ex

echo "Entrypoint: PORT=${PORT:-not set}"
echo "Running database migrations"
npx prisma migrate deploy

echo "Seeding the database"
npx prisma db seed || echo "Seed failed (non-fatal), continuing..."

echo "Starting the server on port ${PORT:-3000}"
exec node main
