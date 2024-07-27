#!/bin/sh

set -ex
export NODE_ENV=production
echo "Running database migrations"
npx prisma migrate deploy

echo "Seeding the database"
npx prisma db seed

echo "Starting the server"
node main
