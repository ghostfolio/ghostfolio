# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Ghostfolio is an open-source wealth management application (AGPL-3.0). It is structured as an **Nx monorepo** with two apps and two shared libraries.

## Development Setup

### Prerequisites

- Node.js `>=22.18.0` (see `.nvmrc`)
- Docker (for PostgreSQL and Redis)

### Initial Setup

```bash
cp .env.dev .env            # fill in passwords and secrets
npm install
docker compose -f docker/docker-compose.dev.yml up -d
npm run database:setup      # push schema + seed
```

### Running Locally

```bash
npm run start:server        # NestJS API on :3333
npm run start:client        # Angular client on https://localhost:4200/en
```

Open https://localhost:4200/en. The first registered user gets the `ADMIN` role.

For other languages, change `--configuration=development-en` to e.g. `--configuration=development-de` in `package.json`.

## Commands

| Task | Command |
|---|---|
| Lint all | `npm run lint` |
| Test all | `npm test` |
| Test API only | `npm run test:api` |
| Test common lib | `npm run test:common` |
| Test UI lib | `npm run test:ui` |
| Test single file | `nx run api:test --test-file <filename>.spec.ts` |
| Production build | `npm run build:production` |
| Storybook | `npm run start:storybook` |
| DB schema sync (dev) | `npm run database:push` |
| DB migration (prod) | `npm run prisma migrate dev --name <name>` |
| DB GUI | `npm run database:gui` |

Tests require the `.env.example` env vars; the `npm test` script handles this via `dotenv-cli`.

## Architecture

### Monorepo Layout

```
apps/
  api/      - NestJS backend
  client/   - Angular 21 frontend
libs/
  common/   - shared interfaces, DTOs, enums, helpers, routes, permissions
  ui/       - shared Angular component library (used by client + Storybook)
```

### TypeScript Path Aliases

| Alias | Resolves to |
|---|---|
| `@ghostfolio/api/*` | `apps/api/src/*` |
| `@ghostfolio/client/*` | `apps/client/src/app/*` |
| `@ghostfolio/common/*` | `libs/common/src/lib/*` |
| `@ghostfolio/ui/*` | `libs/ui/src/lib/*` |

### Backend (`apps/api`)

NestJS application with feature modules under `apps/api/src/app/` (one directory per domain: `account`, `portfolio`, `user`, `auth`, `admin`, `activities`, `import`, `export`, etc.) and cross-cutting services under `apps/api/src/services/`:

- **`data-provider/`** — abstracted market data layer with pluggable providers: AlphaVantage, CoinGecko, EOD Historical Data, Financial Modeling Prep, Ghostfolio (cloud), Google Sheets, Manual, RapidAPI, YahooFinance. `DataProviderService` dispatches to the correct provider per symbol.
- **`queues/`** — Bull background job queues: `data-gathering`, `portfolio-snapshot`, `statistics-gathering`.
- **`prisma/`** — Prisma ORM service wrapping PostgreSQL.
- **`exchange-rate-data/`** — currency conversion.
- **`cron/`** — scheduled tasks.

Redis is used for caching (`redis-cache` module) and as the Bull queue backend.

### Frontend (`apps/client`)

Angular application with lazy-loaded routes defined in [`apps/client/src/app/app.routes.ts`](apps/client/src/app/app.routes.ts). Routes are typed via `internalRoutes` / `publicRoutes` from `@ghostfolio/common/routes/routes`. The `AuthGuard` protects authenticated pages.

### Shared Libraries

- **`libs/common`** — `permissions.ts` (role/permission model), `config.ts` (constants, queue names, feature flags), `interfaces/`, `enums/`, `dtos/`, `routes/`, `helper.ts`, `calculation-helper.ts`.
- **`libs/ui`** — standalone Angular components (charts, tables, dialogs, etc.) consumed by the client.

### Database

PostgreSQL via Prisma. Schema is at [`prisma/schema.prisma`](prisma/schema.prisma). Key models: `User`, `Account`, `Order` (activities/trades), `SymbolProfile`, `MarketData`, `Platform`, `Tag`, `Access`.

## Feature Flags

**Experimental features** are gated in two places:

- **Backend**: remove a permission with `without()` in `UserService`
- **Frontend**: wrap template blocks with `@if (user?.settings?.isExperimentalFeatures) {}`

The Bull Board UI is enabled via `ENABLE_FEATURE_BULL_BOARD=true` in the environment.

## Environment Variables

See [`.env.example`](.env.example) for required variables. Key ones: `DATABASE_URL`, `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`, `ACCESS_TOKEN_SALT`, `JWT_SECRET_KEY`.
