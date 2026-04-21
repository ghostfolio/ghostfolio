#!/usr/bin/env bash
# One-shot setup for the Ghostfolio dev container inside Ona.
# Idempotent: safe to re-run.

set -euo pipefail

cd "$(dirname "$0")/.."

echo "==> Seeding .env from .env.dev (if missing)"
if [ ! -f .env ]; then
  cp .env.dev .env
  # Fill in safe dev defaults — the upstream .env.dev has <INSERT_...> placeholders.
  sed -i 's|<INSERT_REDIS_PASSWORD>|devredispassword|g' .env
  sed -i 's|<INSERT_POSTGRES_PASSWORD>|devpostgrespassword|g' .env
  sed -i 's|<INSERT_RANDOM_STRING>|'"$(openssl rand -hex 32)"'|g' .env
fi

echo "==> Pre-pulling Postgres + Redis images (cached into prebuild)"
docker pull postgres:15 >/dev/null 2>&1 || true
docker pull redis:7 >/dev/null 2>&1 || true

echo "==> Installing npm dependencies"
npm ci --no-audit --no-fund

echo "==> Done. Services will be brought up by Ona automations."
