# Ghostfolio Constitution

## Core Principles

### I. Nx Monorepo Structure

Ghostfolio uses an Nx monorepo with apps (`api`, `client`) and libs (`common`, `ui`). Features must respect project boundaries:
- `@ghostfolio/common` — shared interfaces, types, constants (no framework dependencies)
- `@ghostfolio/ui` — shared Angular UI components
- `@ghostfolio/api` — NestJS backend services, controllers, modules
- `@ghostfolio/client` — Angular frontend pages, services, components

### II. NestJS Module Pattern

Backend features are organized as NestJS modules with:
- Module file registering providers, controllers, imports, exports
- Controller for HTTP endpoints (no business logic)
- Service for business logic
- Interfaces in `@ghostfolio/common` for shared types

### III. Prisma Data Layer

Database access uses Prisma ORM exclusively. Schema changes require migrations. No direct SQL queries. The `PrismaService` is injected via `PrismaModule`.

### IV. TypeScript Strict Conventions

- `noUnusedLocals: true`, `noUnusedParameters: true` — no dead code allowed
- `esModuleInterop: true` — use default imports for CommonJS modules
- Path aliases: `@ghostfolio/api/*`, `@ghostfolio/common/*`, `@ghostfolio/client/*`, `@ghostfolio/ui/*`

### V. Simplicity First

- Start with the simplest solution that works
- YAGNI — don't add abstractions until needed
- Prefer modifying existing files over creating new architectural layers
- Maximum 3 Nx projects per feature (api + common is typical, client when UI needed)

### VI. Interface-First Design

- Shared interfaces live in `@ghostfolio/common`
- API endpoints return typed DTOs
- Feature contracts defined before implementation

## Additional Constraints

- **Angular 21+**: Standalone components, signals preferred
- **NestJS 11+**: Module-based DI, versioned API (URI-based v1)
- **Testing**: Jest for unit/integration tests
- **Docker**: Development via docker-compose (PostgreSQL 5434, Redis 6380)

## Governance

Constitution principles guide all feature development. Complexity beyond these patterns must be justified in the plan's Complexity Tracking table.

**Version**: 1.0.0 | **Ratified**: 2026-03-18 | **Last Amended**: 2026-03-18
