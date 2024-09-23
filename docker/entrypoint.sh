#!/bin/sh

set -ex

if [ "$ENABLE_DATABASE_MIGRATIONS" = "false" ]; then
  echo "Skipping database migrations and seeding"
else
  echo "Running database migrations"
  npx prisma migrate deploy

  echo "Seeding the database"
  npx prisma db seed
fi

echo "Starting the server"
node main
