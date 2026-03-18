# Quickstart: Fix K-1 PDF Parser

**Feature**: 005-k1-parser-fix | **Date**: 2026-03-18

## Prerequisites

- Node.js 18+ with npm
- Docker running (PostgreSQL + Redis via docker-compose)
- Existing `004-k1-scan-import` feature branch merged or available

## Setup

```bash
# 1. Switch to feature branch
git checkout 005-k1-parser-fix

# 2. Install dependencies (should be no-op — no new packages)
npm install

# 3. Start dev infrastructure
docker compose -f docker/docker-compose.dev.yml up -d

# 4. Run database setup
npm run database:setup

# 5. Start API server
npm run start:server

# 6. Start client (separate terminal)
npm run start:client
```

## Files to Modify

| File | Action | Description |
|------|--------|-------------|
| `libs/common/src/lib/interfaces/k1-import.interface.ts` | MODIFY | Add `subtype`, `fieldCategory`, `isCheckbox` to K1ExtractedField; add `x`, `y`, `fontName` to K1UnmappedItem |
| `apps/api/src/app/k1-import/extractors/pdf-parse-extractor.ts` | REWRITE | Replace regex-based extraction with pdfjs-dist position-based extraction |
| `apps/api/src/app/k1-import/extractors/k1-position-regions.ts` | CREATE | Define 73 bounding box regions for all K-1 form fields |

## Testing

```bash
# Upload a K-1 PDF via the API
curl -X POST http://localhost:3333/api/v1/k1-import/upload \
  -H "Authorization: Bearer <token>" \
  -F "file=@path/to/k1.pdf"

# Check extraction results
curl http://localhost:3333/api/v1/k1-import/session/<session-id> \
  -H "Authorization: Bearer <token>"
```

## Verification Checklist

- [ ] Box 11 extracted with subtype "ZZ*" and value -409615
- [ ] Box 19 extracted with subtype "A" and value 4493757
- [ ] Box 20 extracted with 4 separate subtype entries (A, B, Z, *)
- [ ] Box 21 extracted with subtype "*" and value 196
- [ ] Section J percentages extracted (3.032900, 0.000000)
- [ ] Section L capital values extracted with correct signs
- [ ] Final K-1 checkbox detected as true
- [ ] Unmapped items list is empty (all values mapped) for the reference PDF
- [ ] Non-K-1 PDF produces error, not garbage data
