# CLAUDE.md — AgentForge x Ghostfolio

## Project Overview

This is **AgentForge x Ghostfolio** — an AI-powered financial agent layer being built on top of [Ghostfolio](https://github.com/ghostfolio/ghostfolio), an open-source wealth management application. The goal is to add a conversational AI assistant that can analyze portfolios, provide market insights, execute trades, assess risk, and help users manage their finances through natural language.

### What Ghostfolio Is (The Foundation)

Ghostfolio is a privacy-first, open-source personal finance dashboard for tracking stocks, ETFs, funds, and cryptocurrencies across multiple accounts and platforms. It provides:

- Multi-account portfolio tracking with performance analytics (ROAI, ROI, TWR, MWR)
- Risk analysis via portfolio rules (cluster risk, currency risk, fee ratios, etc.)
- Multi-currency support with automatic exchange rate conversion
- Multiple data providers (Yahoo Finance, CoinGecko, Alpha Vantage, EOD Historical Data, etc.)
- Import/export of transactions, public portfolio sharing, and an admin panel

### What AgentForge Adds (The AI Layer)

AgentForge introduces an AI agent module that integrates with Ghostfolio's existing services:

- **Conversational AI assistant** — natural language interface for portfolio queries and actions
- **Multi-agent orchestration** — Coordinator, Analyst, Executor, and Risk Manager agents
- **Tool registry** — AI-callable tools wrapping Ghostfolio services (portfolio analysis, market data, trade execution, risk assessment, goal tracking)
- **Real-time streaming** — Server-Sent Events (SSE) for streaming AI responses
- **Conversation memory** — persistent chat history stored in PostgreSQL via Prisma
- **Permission-based tool access** — tools gated by user roles and subscription tier

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Monorepo** | Nx 21.x |
| **Backend** | NestJS 11.x (TypeScript 5.9) |
| **Frontend** | Angular 21.x with Angular Material |
| **Database** | PostgreSQL 15 via Prisma 6.x ORM |
| **Cache** | Redis (Bull queues for background jobs) |
| **AI/LLM** | LangChain / LangGraph (planned) |
| **Auth** | JWT, Google OAuth, OIDC, WebAuthn (Passport strategies) |
| **Containerization** | Docker / Docker Compose |
| **i18n** | Angular i18n (12 languages) |

---

## Repository Structure

```
ghostfolio/
├── apps/
│   ├── api/                    # NestJS backend (REST API)
│   │   └── src/
│   │       ├── app/            # Feature modules (controllers + services)
│   │       │   ├── portfolio/  # Portfolio controller & service
│   │       │   ├── order/      # Order/activity controller & service
│   │       │   ├── account/    # Account controller & service
│   │       │   ├── admin/      # Admin controller
│   │       │   ├── auth/       # Auth controller + strategies
│   │       │   ├── user/       # User controller & service
│   │       │   ├── import/     # CSV/JSON import
│   │       │   ├── export/     # Portfolio export
│   │       │   └── ...         # Additional feature modules
│   │       ├── services/       # Shared backend services
│   │       │   ├── data-provider/        # Multi-provider data aggregation
│   │       │   ├── exchange-rate-data/   # Currency exchange rates
│   │       │   ├── portfolio-snapshot/   # Portfolio snapshot queue
│   │       │   ├── data-gathering/       # Background data jobs
│   │       │   └── ...
│   │       ├── interceptors/   # Request/response interceptors
│   │       ├── guards/         # Auth & permission guards
│   │       └── models/rules/   # Portfolio analysis rules
│   └── client/                 # Angular frontend (PWA)
│       └── src/
│           ├── app/
│           │   ├── pages/      # Route-level page components
│           │   ├── components/ # Shared page-level components
│           │   └── services/   # HTTP client services
│           ├── locales/        # i18n translation files
│           └── styles/         # Global SCSS styles
├── libs/
│   ├── common/                 # Shared TypeScript types, interfaces, helpers
│   │   └── src/lib/
│   │       ├── interfaces/     # 100+ shared interface definitions
│   │       ├── types/          # Shared type aliases
│   │       └── helper/         # Utility functions
│   └── ui/                     # Angular component library + Storybook
│       └── src/lib/            # Reusable UI components (tables, charts, forms)
├── prisma/
│   ├── schema.prisma           # Database schema (all models defined here)
│   ├── migrations/             # Prisma migration history
│   └── seed.ts                 # Database seeding script
├── docker/                     # Docker Compose configs (dev, build, prod)
├── .github/workflows/          # CI/CD (lint, test, build, Docker publish)
└── CLAUDE.md                   # This file
```

### TypeScript Path Aliases

```
@ghostfolio/api/*      → apps/api/src/*
@ghostfolio/client/*   → apps/client/src/app/*
@ghostfolio/common/*   → libs/common/src/lib/*
@ghostfolio/ui/*       → libs/ui/src/lib/*
```

---

## Key Commands

### Development

```bash
npm run start:server          # Start NestJS API with file watching
npm run start:client          # Start Angular dev server (localhost:4200/en)
npm run start:storybook       # Start Storybook UI component browser
```

### Build

```bash
npm run build:production      # Full production build (API + Client + Storybook)
npm run watch:server          # Watch mode API build
```

### Test

```bash
npm test                      # Run ALL tests (uses .env.example, 4 parallel workers)
npm run test:api              # Run API tests only
npm run test:common           # Run common lib tests only
npm run test:ui               # Run UI lib tests only
```

Tests use Jest and require environment variables from `.env.example` (loaded via `dotenv-cli`).

### Lint & Format

```bash
npm run lint                  # Lint entire codebase (ESLint)
npm run format:check          # Check Prettier formatting
npm run format:write          # Auto-fix formatting
```

### Database

```bash
npm run database:setup        # Push schema + seed (for initial setup)
npm run database:push         # Sync Prisma schema to DB (no migration)
npm run database:migrate      # Run Prisma migrations
npm run database:seed         # Seed database with initial data
npm run database:gui          # Open Prisma Studio (DB browser)
npm run database:generate-typings  # Regenerate Prisma client types
npm run database:format-schema     # Format schema.prisma
```

### Docker (local development infrastructure)

```bash
docker-compose -f docker/docker-compose.dev.yml up    # Start PostgreSQL + Redis
docker-compose -f docker/docker-compose.build.yml up   # Build & run full app locally
```

---

## Key Backend Services

### PortfolioService (`apps/api/src/app/portfolio/portfolio.service.ts`)
The core service. Calculates portfolio performance (ROAI, ROI, TWR, MWR), aggregates holdings across accounts, generates risk analysis reports, handles time-range filtering (1d, WTD, MTD, YTD, 1Y, 5Y, Max), and manages portfolio snapshots.

### OrderService (`apps/api/src/app/order/order.service.ts`)
CRUD for activities/transactions. Handles BUY, SELL, DIVIDEND, FEE, INTEREST, and LIABILITY activity types. Triggers data gathering for new assets and emits portfolio change events for cache invalidation.

### AccountService (`apps/api/src/app/account/account.service.ts`)
Manages trading accounts and platforms. Calculates account balances, retrieves account history, and handles account-level exclusions from portfolio calculations.

### DataProviderService (`apps/api/src/services/data-provider/data-provider.service.ts`)
Orchestrates multiple market data providers (Yahoo Finance, CoinGecko, Alpha Vantage, etc.). Fetches quotes, historical data, asset profiles, and dividends. Handles provider-specific API keys and rate limiting.

### ExchangeRateDataService (`apps/api/src/services/exchange-rate-data/exchange-rate-data.service.ts`)
Manages currency exchange rates with caching. Initializes currency pairs on module load, fills historical gaps via forward-fill, and supports derived currencies.

---

## Database Models (Prisma)

Key models in `prisma/schema.prisma`:

| Model | Purpose |
|-------|---------|
| `User` | User accounts with roles (ADMIN, USER) and auth provider |
| `Account` | Trading/brokerage accounts linked to platforms |
| `Order` | Transaction records (BUY, SELL, DIVIDEND, FEE, etc.) |
| `SymbolProfile` | Asset metadata (stocks, ETFs, crypto) with data source |
| `MarketData` | Historical price data with market state |
| `AccountBalance` | Historical account balance snapshots |
| `Tag` | Transaction/holding tags for filtering |
| `Access` | Portfolio sharing/access control tokens |
| `Subscription` | Premium subscription records |
| `Analytics` | User activity analytics |
| `ApiKey` | API key management |
| `AuthDevice` | WebAuthn device registration |
| `Platform` | Trading platform references |
| `Property` | Application-level key-value configuration |
| `Settings` | User settings (JSON) |

---

## Key API Routes

| Method | Route | Purpose |
|--------|-------|---------|
| `GET` | `/api/v1/portfolio/details` | Full portfolio details |
| `GET` | `/api/v1/portfolio/holdings` | Current holdings |
| `GET` | `/api/v1/portfolio/performance` | Performance metrics |
| `GET` | `/api/v1/portfolio/report` | Risk analysis report |
| `GET/POST/PUT/DELETE` | `/api/v1/order` | Activity CRUD |
| `GET/POST/PUT/DELETE` | `/api/v1/account` | Account CRUD |
| `POST` | `/api/v1/import` | Import transactions |
| `GET` | `/api/v1/export` | Export portfolio |
| `POST` | `/api/v1/auth/anonymous` | Token-based login |
| `GET` | `/api/v1/auth/google` | Google OAuth |
| `GET` | `/api/v1/health` | Health check |
| `GET` | `/api/v1/info` | System info |
| `GET` | `/api/v1/public/:accessId/portfolio` | Public portfolio |

---

## AgentForge Integration Plan

The AI agent layer will be implemented as a new NestJS module within the API app:

### New Module: `apps/api/src/app/agent-forge/`

```
agent-forge/
├── agent-forge.module.ts           # NestJS module registration
├── agent-forge.controller.ts       # REST + SSE endpoints
├── agent-forge.service.ts          # Core orchestration service
├── tools/                          # AI-callable tool definitions
│   ├── portfolio-analysis.tool.ts  # Wraps PortfolioService
│   ├── market-data.tool.ts         # Wraps DataProviderService
│   ├── trade-execution.tool.ts     # Wraps OrderService
│   ├── risk-assessment.tool.ts     # Wraps portfolio rules engine
│   └── goal-tracking.tool.ts       # Financial goal management
├── agents/                         # Multi-agent definitions
│   ├── coordinator.agent.ts        # Routes queries to specialist agents
│   ├── analyst.agent.ts            # Portfolio & market analysis
│   ├── executor.agent.ts           # Trade execution with confirmation
│   └── risk-manager.agent.ts       # Risk assessment & guardrails
├── memory/                         # Conversation persistence
│   └── conversation.service.ts     # Chat history via Prisma
└── streaming/                      # Real-time response streaming
    └── sse.service.ts              # Server-Sent Events
```

### New Prisma Models (to be added)

- `Conversation` — chat session metadata (userId, title, timestamps)
- `Message` — individual messages (role, content, toolCalls, tokens)
- `FinancialGoal` — user-defined financial goals with progress tracking

### Key Design Principles

1. **Wrap, don't replace** — AI tools call existing Ghostfolio services; no duplicate business logic
2. **Permission-gated tools** — tool access respects user roles and subscription tiers
3. **Human-in-the-loop** — trade execution requires explicit user confirmation
4. **Streaming-first** — all AI responses use SSE for real-time token delivery
5. **Auditable** — all tool invocations are logged for compliance and debugging

---

## Coding Conventions

- **Backend patterns**: NestJS modules with controller + service pairs, dependency injection throughout
- **Frontend patterns**: Angular standalone components, lazy-loaded routes, Angular Material UI
- **Naming**: PascalCase for classes/interfaces, camelCase for variables/functions, kebab-case for file names
- **Imports**: Use `@ghostfolio/` path aliases — never relative paths across app/lib boundaries
- **Testing**: Jest for all tests; test files co-located with source as `*.spec.ts`
- **Database changes**: Always update `prisma/schema.prisma`, then run `npm run database:push` or create a migration
- **Shared types**: Define interfaces in `libs/common/src/lib/interfaces/`, export via barrel files
- **UI components**: Reusable components go in `libs/ui/`, page-specific components stay in `apps/client/`

---

## Environment Variables

Required variables (see `.env.example`):

```
COMPOSE_PROJECT_NAME=ghostfolio
POSTGRES_DB=ghostfolio-db
POSTGRES_USER=user
POSTGRES_PASSWORD=<password>
DATABASE_URL=postgresql://user:password@localhost:5432/ghostfolio-db
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=<password>
ACCESS_TOKEN_SALT=<random-string>
JWT_SECRET_KEY=<random-string>
```
