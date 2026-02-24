#!/usr/bin/env bash
set -euo pipefail

if ! command -v railway >/dev/null 2>&1; then
  echo "railway CLI is required. Install with: npm i -g @railway/cli"
  exit 1
fi

SQL_FILE="${1:-tools/seed/seed-money.sql}"
DB_SERVICE="${RAILWAY_POSTGRES_SERVICE:-postgres}"

if [[ ! -f "$SQL_FILE" ]]; then
  echo "Seed SQL file not found: $SQL_FILE"
  exit 1
fi

SQL_BASE64="$(base64 <"$SQL_FILE" | tr -d '\n')"

railway ssh -s "$DB_SERVICE" -- sh -lc "echo '$SQL_BASE64' | base64 -d >/tmp/seed-money.sql && psql -v ON_ERROR_STOP=1 -U \"\$POSTGRES_USER\" -d \"\$POSTGRES_DB\" -f /tmp/seed-money.sql"
