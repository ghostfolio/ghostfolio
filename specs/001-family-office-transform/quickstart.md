# Quickstart: Family Office Transform Implementation

This guide covers the recommended order of operations, key commands, and dependencies for implementing the family office transformation.

---

## Prerequisites

- Node.js >= 22.18.0
- PostgreSQL running (via Docker or local)
- Redis running (via Docker or local)
- Nx CLI installed (`npx nx`)

## Implementation Order

### Phase 1: Schema & Data Layer (P0)

**1. Add Prisma schema models and enums**

Edit `prisma/schema.prisma`:

- Add 8 new enums: `EntityType`, `PartnershipType`, `PartnershipStatus`, `MemberRole`, `DistributionType`, `KDocumentType`, `KDocumentStatus`, `DocumentType`
- Add 9 new models: `Entity`, `Partnership`, `PartnershipMembership`, `Ownership`, `Distribution`, `KDocument`, `PartnershipAsset`, `AssetValuation`, `PartnershipValuation`, `Document`
- Add back-references to existing `User` and `Account` models

Refer to [data-model.md](data-model.md) for full field specifications.

**2. Generate and apply migration**

```bash
npx prisma migrate dev --name added_family_office_models
```

**3. Generate Prisma client**

```bash
npx prisma generate
```

**4. Verify with seed updates**

Add family-office seed data to `prisma/seed.mts` (optional, for development convenience).

---

### Phase 2: Shared Types & DTOs (P0)

**5. Add shared interfaces and enums**

Create in `libs/common/src/lib/interfaces/`:

- `entity.interface.ts` — `IEntity`, `IEntityWithRelations`
- `partnership.interface.ts` — `IPartnership`, `IPartnershipPerformance`, `IPartnershipMembership`
- `distribution.interface.ts` — `IDistribution`, `IDistributionSummary`
- `k-document.interface.ts` — `IKDocument`, `K1Data` (20-field interface matching IRS Schedule K-1)
- `family-office.interface.ts` — `IFamilyOfficeDashboard`, `IFamilyOfficeReport`

**6. Add DTOs with validation**

Create in `libs/common/src/lib/dtos/`:

- `create-entity.dto.ts`, `update-entity.dto.ts`
- `create-partnership.dto.ts`, `update-partnership.dto.ts`
- `create-distribution.dto.ts`
- `create-k-document.dto.ts`, `update-k-document.dto.ts`
- `create-ownership.dto.ts`
- `create-partnership-membership.dto.ts`

All DTOs use `class-validator` decorators (`@IsString()`, `@IsEnum()`, `@IsNumber()`, `@IsOptional()`, `@IsDateString()`, `@IsUUID()`, `@Min()`, `@Max()`).

**7. Add permissions**

Add to `libs/common/src/lib/permissions.ts`:

```typescript
// Entity permissions
(createEntity,
  readEntity,
  updateEntity,
  deleteEntity,
  // Partnership permissions
  createPartnership,
  readPartnership,
  updatePartnership,
  deletePartnership,
  // Distribution permissions
  createDistribution,
  readDistribution,
  deleteDistribution,
  // K-Document permissions
  createKDocument,
  readKDocument,
  updateKDocument,
  // Upload permissions
  uploadDocument,
  readDocument,
  // Family Office permissions
  readFamilyOfficeDashboard,
  readFamilyOfficeReport);
```

---

### Phase 3: API Modules (P1)

Build modules in this dependency order:

**8. Entity Module** (`apps/api/src/app/entity/`)

Files: `entity.module.ts`, `entity.controller.ts`, `entity.service.ts`

- No dependencies on other new modules
- CRUD for entities with ownership management
- Endpoints per [entity-api.md](contracts/entity-api.md)

```
entity.module.ts → imports: [PrismaModule]
entity.controller.ts → @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
entity.service.ts → constructor(private prismaService: PrismaService)
```

**9. Partnership Module** (`apps/api/src/app/partnership/`)

Files: `partnership.module.ts`, `partnership.controller.ts`, `partnership.service.ts`

- Depends on Entity (for membership validation)
- CRUD + membership + valuation + asset management
- Endpoints per [partnership-api.md](contracts/partnership-api.md)

**10. Distribution Module** (`apps/api/src/app/distribution/`)

Files: `distribution.module.ts`, `distribution.controller.ts`, `distribution.service.ts`

- Depends on Entity, Partnership (for validation)
- Distribution recording with summary/grouping
- Endpoints per [distribution-kdocument-fo-api.md](contracts/distribution-kdocument-fo-api.md)

**11. K-Document Module** (`apps/api/src/app/k-document/`)

Files: `k-document.module.ts`, `k-document.controller.ts`, `k-document.service.ts`

- Depends on Partnership (membership % for allocations)
- K-1/K-3 data entry, status management, auto-allocation

**12. Upload Module** (`apps/api/src/app/upload/`)

Files: `upload.module.ts`, `upload.controller.ts`, `upload.service.ts`

- Standalone — uses Multer (`@UseInterceptors(FileInterceptor('file'))`)
- File storage in `uploads/` directory (configure path via environment variable `UPLOAD_DIR`)
- PDF/document upload with metadata

**13. Family Office Module** (`apps/api/src/app/family-office/`)

Files: `family-office.module.ts`, `family-office.controller.ts`, `family-office.service.ts`

- Depends on all above modules (reads aggregated data)
- Dashboard aggregation, report generation
- Uses `ExchangeRateDataService` for multi-currency normalization

---

### Phase 4: Performance Calculator (P2)

**14. Family Office Performance Calculator**

Create `apps/api/src/app/portfolio/calculator/family-office/`:

- `family-office-performance-calculator.ts` — standalone class (NOT subclass of PortfolioCalculator)
- Implements IRR (Newton-Raphson with `big.js`), TVPI, DPI, RVPI
- Inputs: committed capital, called capital, distributions, current NAV per partnership
- Uses `ExchangeRateDataService.toCurrencyAtDate()` for currency conversion

**15. Family Office Benchmark Service**

Create `apps/api/src/services/benchmark/family-office-benchmark.service.ts`:

- Composes existing `BenchmarkService` for public market data
- Adds partnership-specific time-weighted return comparison
- Stores family-office benchmark config in `Property` table (same pattern as existing benchmarks)

---

### Phase 5: Angular Frontend (P2-P3)

**16. Entity management pages**

```
apps/client/src/app/pages/entities/
  entities-page.component.ts      — List view
  entity-detail-page.component.ts — Detail + ownership table
```

**17. Partnership management pages**

```
apps/client/src/app/pages/partnerships/
  partnerships-page.component.ts       — List view
  partnership-detail-page.component.ts — Detail + members + valuations
```

**18. Distribution & K-Document pages**

```
apps/client/src/app/pages/distributions/
  distributions-page.component.ts   — List + summary
apps/client/src/app/pages/k-documents/
  k-documents-page.component.ts     — List + data entry
```

**19. Family Office Dashboard**

```
apps/client/src/app/pages/family-office/
  dashboard-page.component.ts    — Consolidated view
  report-page.component.ts       — Period report with charts
```

**20. Shared UI components** (`libs/ui/src/lib/`)

- `ownership-table/` — Editable ownership percentages (pct → 100% validation)
- `distribution-chart/` — Chart.js bar chart by period
- `performance-metrics/` — IRR, TVPI, DPI, RVPI display cards
- `k-document-form/` — K-1 data entry with 20 fields

**21. Route registration**

Add to `apps/client/src/app/app.routes.ts`:

```typescript
{ path: 'entities', loadComponent: () => import('./pages/entities/entities-page.component').then(m => m.EntitiesPageComponent) },
{ path: 'entities/:id', loadComponent: () => import('./pages/entities/entity-detail-page.component').then(m => m.EntityDetailPageComponent) },
{ path: 'partnerships', loadComponent: () => import('./pages/partnerships/partnerships-page.component').then(m => m.PartnershipsPageComponent) },
{ path: 'partnerships/:id', loadComponent: () => import('./pages/partnerships/partnership-detail-page.component').then(m => m.PartnershipDetailPageComponent) },
{ path: 'distributions', loadComponent: () => import('./pages/distributions/distributions-page.component').then(m => m.DistributionsPageComponent) },
{ path: 'k-documents', loadComponent: () => import('./pages/k-documents/k-documents-page.component').then(m => m.KDocumentsPageComponent) },
{ path: 'family-office', loadComponent: () => import('./pages/family-office/dashboard-page.component').then(m => m.DashboardPageComponent) },
{ path: 'family-office/report', loadComponent: () => import('./pages/family-office/report-page.component').then(m => m.ReportPageComponent) },
```

---

## Key Commands

```bash
# Generate migration after schema changes
npx prisma migrate dev --name <name>

# Regenerate Prisma client
npx prisma generate

# Run API in dev mode
npx nx serve api

# Run Client in dev mode
npx nx serve client

# Run tests for a project
npx nx test api
npx nx test client
npx nx test common
npx nx test ui

# Lint
npx nx lint api
npx nx lint client

# Build (production)
npx nx build api --configuration=production
npx nx build client --configuration=production
```

---

## Environment Variables (New)

| Variable          | Default     | Description                          |
| ----------------- | ----------- | ------------------------------------ |
| `UPLOAD_DIR`      | `./uploads` | Directory for uploaded documents     |
| `MAX_UPLOAD_SIZE` | `10485760`  | Max file upload size in bytes (10MB) |

---

## Testing Strategy

1. **Unit tests**: Each service method with mocked PrismaService
2. **Ownership validation**: Test sum-to-100% enforcement, edge cases with floating point
3. **Performance calculator**: Known-answer tests with hand-calculated IRR, TVPI, DPI, RVPI
4. **K-1 allocation**: Verify pro-rata distribution matches ownership percentages
5. **Multi-currency**: Test distributions in different currencies converge to base currency
6. **E2E**: Entity → Partnership → Ownership → Distribution → K-Document full flow
