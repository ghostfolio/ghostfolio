# Ghostfolio Public API Quickstart

This guide shows a complete `curl` workflow for the Ghostfolio Public API:

1. Exchange your security token for a Bearer token.
2. Verify connectivity with the health endpoint.
3. Import portfolio activities.
4. Retrieve a public portfolio snapshot.

## Prerequisites

1. A running Ghostfolio instance (for example `http://localhost:3333`).
2. A user account in Ghostfolio.
3. A security token from the _Access_ section in _My Ghostfolio_.
4. `curl` (and optionally `jq`) installed locally.

## 1. Configure environment variables

```bash
export GF_BASE_URL="http://localhost:3333"
export GF_SECURITY_TOKEN="<YOUR_SECURITY_TOKEN>"
```

## 2. Exchange security token for Bearer token

Use the recommended `POST` endpoint:

```bash
curl -sS \
  -X POST "$GF_BASE_URL/api/v1/auth/anonymous" \
  -H "Content-Type: application/json" \
  -d "{\"accessToken\":\"$GF_SECURITY_TOKEN\"}"
```

Example response:

```json
{
  "authToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

Store it for later calls:

```bash
export GF_BEARER_TOKEN="<PASTE_AUTH_TOKEN_FROM_RESPONSE>"
```

If you have `jq`, you can do it in one command:

```bash
export GF_BEARER_TOKEN="$(
  curl -sS \
    -X POST "$GF_BASE_URL/api/v1/auth/anonymous" \
    -H "Content-Type: application/json" \
    -d "{\"accessToken\":\"$GF_SECURITY_TOKEN\"}" | jq -r '.authToken'
)"
```

## 3. Verify the API is reachable

The health endpoint does not require a Bearer token:

```bash
curl -sS "$GF_BASE_URL/api/v1/health"
```

Expected response:

```json
{
  "status": "OK"
}
```

## 4. Import activities

Create a sample payload (`activities.json`):

```json
{
  "activities": [
    {
      "currency": "USD",
      "dataSource": "YAHOO",
      "date": "2021-09-15T00:00:00.000Z",
      "fee": 19,
      "quantity": 5,
      "symbol": "MSFT",
      "type": "BUY",
      "unitPrice": 298.58
    }
  ]
}
```

Submit the import request:

```bash
curl -i \
  -X POST "$GF_BASE_URL/api/v1/import" \
  -H "Authorization: Bearer $GF_BEARER_TOKEN" \
  -H "Content-Type: application/json" \
  -d @activities.json
```

Expected status code:

- `201 Created`

Common validation error:

- `400 Bad Request` with a message such as duplicate activity detection.

## 5. Read a public portfolio snapshot

1. In the app, create a public access entry in _My Ghostfolio_ -> _Access_.
2. Copy its `accessId`.
3. Request the public portfolio endpoint:

```bash
export GF_ACCESS_ID="<YOUR_PUBLIC_ACCESS_ID>"

curl -sS "$GF_BASE_URL/api/v1/public/$GF_ACCESS_ID/portfolio"
```

This endpoint is public and does not require a Bearer token.

## 6. Troubleshooting

- `401 Unauthorized` on `/api/v1/import`:
  The Bearer token is missing, expired, or malformed.
- `400 Bad Request` on `/api/v1/import`:
  Check required fields, date format (`ISO-8601`), and duplicates.
- Empty or unexpected portfolio response:
  Verify the `accessId` belongs to a public access entry and is still active.

