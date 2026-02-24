#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${RAILWAY_API_KEY:-}" ]]; then
  echo "RAILWAY_API_KEY is missing"
  exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "jq is required for tools/railway/check-token.sh"
  exit 1
fi

payload='{"query":"query { apiToken { workspaces { id name } } projects { edges { node { id name } } } }"}'

curl -sS \
  -H "Authorization: Bearer ${RAILWAY_API_KEY}" \
  -H "Content-Type: application/json" \
  -d "$payload" \
  "https://backboard.railway.app/graphql/v2" | jq '{
    workspaces: (.data.apiToken.workspaces // []),
    projects: [.data.projects.edges[]?.node | {id, name}]
  }'
