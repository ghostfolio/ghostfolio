#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${RAILWAY_API_KEY:-}" ]]; then
  echo "RAILWAY_API_KEY is missing"
  exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "jq is required for tools/railway/setup-project.sh"
  exit 1
fi

PROJECT_NAME="${RAILWAY_PROJECT_NAME:-ghostfolio-ai-mvp}"
API_IMAGE="${RAILWAY_API_IMAGE:-docker.io/ghostfolio/ghostfolio:latest}"
POSTGRES_IMAGE="${RAILWAY_POSTGRES_IMAGE:-docker.io/library/postgres:15-alpine}"
REDIS_IMAGE="${RAILWAY_REDIS_IMAGE:-docker.io/library/redis:alpine}"
ENDPOINT="https://backboard.railway.app/graphql/v2"

ACCESS_TOKEN_SALT_VALUE="${ACCESS_TOKEN_SALT:-$(openssl rand -hex 24)}"
JWT_SECRET_KEY_VALUE="${JWT_SECRET_KEY:-$(openssl rand -hex 24)}"
POSTGRES_DB_VALUE="${POSTGRES_DB:-ghostfolio-db}"
POSTGRES_USER_VALUE="${POSTGRES_USER:-user}"
POSTGRES_PASSWORD_VALUE="${POSTGRES_PASSWORD:-$(openssl rand -hex 24)}"
REDIS_PASSWORD_VALUE="${REDIS_PASSWORD:-$(openssl rand -hex 24)}"

call_gql() {
  local query="$1"
  local payload
  payload=$(jq -n --arg query "$query" '{query: $query}')
  curl -sS \
    -H "Authorization: Bearer ${RAILWAY_API_KEY}" \
    -H "Content-Type: application/json" \
    -d "$payload" \
    "$ENDPOINT"
}

extract_or_fail() {
  local response="$1"
  local path="$2"
  local value
  value=$(echo "$response" | jq -r "$path")
  if [[ -z "$value" || "$value" == "null" ]]; then
    echo "$response"
    exit 1
  fi
  echo "$value"
}

workspace_response=$(call_gql 'query { apiToken { workspaces { id name } } }')
workspace_id=$(extract_or_fail "$workspace_response" '.data.apiToken.workspaces[0].id')

projects_response=$(call_gql 'query { projects { edges { node { id name environments { edges { node { id name } } } services { edges { node { id name } } } } } } }')
project_id=$(echo "$projects_response" | jq -r --arg name "$PROJECT_NAME" '.data.projects.edges[]?.node | select(.name == $name) | .id' | head -n 1)

if [[ -z "${project_id:-}" || "${project_id}" == "null" ]]; then
  create_project_query=$(cat <<QUERY
mutation {
  projectCreate(
    input: {
      name: "${PROJECT_NAME}"
      workspaceId: "${workspace_id}"
    }
  ) {
    id
    name
  }
}
QUERY
)
  project_create_response=$(call_gql "$create_project_query")
  project_id=$(extract_or_fail "$project_create_response" '.data.projectCreate.id')
fi

projects_response=$(call_gql 'query { projects { edges { node { id name environments { edges { node { id name } } } services { edges { node { id name } } } } } } }')
environment_id=$(echo "$projects_response" | jq -r --arg id "$project_id" '.data.projects.edges[]?.node | select(.id == $id) | .environments.edges[]?.node | select(.name == "production") | .id' | head -n 1)

if [[ -z "${environment_id:-}" || "${environment_id}" == "null" ]]; then
  environment_id=$(echo "$projects_response" | jq -r --arg id "$project_id" '.data.projects.edges[]?.node | select(.id == $id) | .environments.edges[0]?.node.id')
fi

if [[ -z "${environment_id:-}" || "${environment_id}" == "null" ]]; then
  echo "$projects_response"
  exit 1
fi

ensure_service() {
  local service_name="$1"
  local image="$2"
  local current_services_response="$3"
  local service_id

  service_id=$(echo "$current_services_response" | jq -r --arg id "$project_id" --arg name "$service_name" '.data.projects.edges[]?.node | select(.id == $id) | .services.edges[]?.node | select(.name == $name) | .id' | head -n 1)

  if [[ -n "${service_id:-}" && "${service_id}" != "null" ]]; then
    echo "$service_id"
    return
  fi

  create_service_query=$(cat <<QUERY
mutation {
  serviceCreate(
    input: {
      environmentId: "${environment_id}"
      name: "${service_name}"
      projectId: "${project_id}"
      source: {
        image: "${image}"
      }
    }
  ) {
    id
    name
  }
}
QUERY
)
  service_create_response=$(call_gql "$create_service_query")
  extract_or_fail "$service_create_response" '.data.serviceCreate.id'
}

api_service_id=$(ensure_service "ghostfolio-api" "$API_IMAGE" "$projects_response")
projects_response=$(call_gql 'query { projects { edges { node { id name services { edges { node { id name } } } } } } }')
postgres_service_id=$(ensure_service "postgres" "$POSTGRES_IMAGE" "$projects_response")
projects_response=$(call_gql 'query { projects { edges { node { id name services { edges { node { id name } } } } } } }')
redis_service_id=$(ensure_service "redis" "$REDIS_IMAGE" "$projects_response")

upsert_variable() {
  local service_id="$1"
  local name="$2"
  local value="$3"

  upsert_query=$(cat <<QUERY
mutation {
  variableUpsert(
    input: {
      environmentId: "${environment_id}"
      name: "${name}"
      projectId: "${project_id}"
      serviceId: "${service_id}"
      skipDeploys: true
      value: "${value}"
    }
  )
}
QUERY
)

  response=$(call_gql "$upsert_query")
  if [[ "$(echo "$response" | jq -r '.data.variableUpsert')" != "true" ]]; then
    echo "$response"
    exit 1
  fi
}

# postgres service
upsert_variable "$postgres_service_id" "POSTGRES_DB" "$POSTGRES_DB_VALUE"
upsert_variable "$postgres_service_id" "POSTGRES_USER" "$POSTGRES_USER_VALUE"
upsert_variable "$postgres_service_id" "POSTGRES_PASSWORD" "$POSTGRES_PASSWORD_VALUE"

# redis service
upsert_variable "$redis_service_id" "REDIS_PASSWORD" "$REDIS_PASSWORD_VALUE"

# api service
database_url="postgresql://${POSTGRES_USER_VALUE}:${POSTGRES_PASSWORD_VALUE}@postgres:5432/${POSTGRES_DB_VALUE}?connect_timeout=300&sslmode=prefer"
upsert_variable "$api_service_id" "ACCESS_TOKEN_SALT" "$ACCESS_TOKEN_SALT_VALUE"
upsert_variable "$api_service_id" "DATABASE_URL" "$database_url"
upsert_variable "$api_service_id" "JWT_SECRET_KEY" "$JWT_SECRET_KEY_VALUE"
upsert_variable "$api_service_id" "POSTGRES_DB" "$POSTGRES_DB_VALUE"
upsert_variable "$api_service_id" "POSTGRES_PASSWORD" "$POSTGRES_PASSWORD_VALUE"
upsert_variable "$api_service_id" "POSTGRES_USER" "$POSTGRES_USER_VALUE"
upsert_variable "$api_service_id" "REDIS_HOST" "redis"
upsert_variable "$api_service_id" "REDIS_PASSWORD" "$REDIS_PASSWORD_VALUE"
upsert_variable "$api_service_id" "REDIS_PORT" "6379"

echo "{\"projectId\":\"${project_id}\",\"projectName\":\"${PROJECT_NAME}\",\"environmentId\":\"${environment_id}\",\"services\":{\"ghostfolio-api\":\"${api_service_id}\",\"postgres\":\"${postgres_service_id}\",\"redis\":\"${redis_service_id}\"},\"status\":\"configured\"}" | jq .
