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

AgentForge extends Ghostfolio's **existing AiModule** (not a new module) to add a full conversational agent:

- **LangGraph TS ReAct agent** — `createReactAgent` with tool-calling loop and verification post-node
- **7 tools** wrapping existing Ghostfolio services (portfolio summary, performance, holdings, activities, market data, risk analysis, account overview)
- **Real-time streaming** — Server-Sent Events (SSE) for streaming AI responses via new `POST /api/v1/ai/chat` endpoint
- **Conversation memory** — persistent chat history stored in PostgreSQL via Prisma (`Conversation` + `Message` models)
- **LangSmith observability** — tracing, latency metrics, and tool-call auditing
- **Admin-configurable LLM** — API keys and model selection stored via PropertyService (already exists)
- **Extended Assistant UI** — Angular Assistant component gains a chat tab alongside existing search

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Monorepo** | Nx 21.x |
| **Backend** | NestJS 11.x (TypeScript 5.9) |
| **Frontend** | Angular 21.x with Angular Material |
| **Database** | PostgreSQL 15 via Prisma 6.x ORM |
| **Cache** | Redis (Bull queues for background jobs) |
| **AI/LLM** | LangGraph TS (`@langchain/langgraph`), Vercel AI SDK, LangSmith |
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

## Existing AI Infrastructure

Ghostfolio already has a lightweight AI module. AgentForge extends it rather than replacing it.

### Current State

| Component | Location | What It Does |
|-----------|----------|-------------|
| **AiController** | `apps/api/src/app/endpoints/ai/ai.controller.ts` | `GET /api/v1/ai/prompt/:mode` — returns a formatted prompt string |
| **AiService** | `apps/api/src/app/endpoints/ai/ai.service.ts` | `getPrompt()` builds a markdown holdings table; `generateText()` calls OpenRouter via Vercel AI SDK |
| **AiModule** | `apps/api/src/app/endpoints/ai/ai.module.ts` | Imports PortfolioService, AccountService, MarketDataService, etc. |
| **Assistant UI** | `libs/ui/src/lib/assistant/assistant.component.ts` | Search/navigation modal (accounts, holdings, asset profiles, quick links) — **not yet a chat UI** |
| **PropertyService** | `apps/api/src/services/property/property.service.ts` | Stores `API_KEY_OPENROUTER` and `OPENROUTER_MODEL` in the `Property` DB table |
| **Config constants** | `libs/common/src/lib/config.ts` | `PROPERTY_API_KEY_OPENROUTER`, `PROPERTY_OPENROUTER_MODEL`, `PROPERTY_SYSTEM_MESSAGE` |
| **Permission** | `libs/common/src/lib/permissions.ts` | `readAiPrompt` — granted to ADMIN, DEMO, USER roles |
| **AI SDK deps** | `package.json` | `ai` (Vercel AI SDK 4.x), `@openrouter/ai-sdk-provider` |

### Current Data Flow

1. User opens Analysis page → clicks "Copy AI Prompt" (portfolio or analysis mode)
2. Frontend calls `GET /api/v1/ai/prompt/{mode}` with optional filters
3. `AiService.getPrompt()` fetches holdings via `PortfolioService.getDetails()`, formats a markdown table
4. Prompt is copied to clipboard; user pastes into external LLM (Duck.ai, ChatGPT, etc.)

**Key insight:** The current flow is prompt-generation-only with no in-app chat, no tool calling, and no conversation memory.

---

## AgentForge Integration Plan (v3)

The core principle: **extend the existing `AiModule`** — do not create a new module. Add files alongside `ai.controller.ts` and `ai.service.ts`.

### Architecture: LangGraph TS ReAct Agent

A single `createReactAgent` (from `@langchain/langgraph`) with a tool-calling loop and a **verification post-node** that reviews tool outputs before responding to the user.

```
User message
    │
    ▼
┌─────────┐     ┌───────────┐     ┌──────────────┐
│  Agent   │────▶│   Tools   │────▶│ Verification │
│  (ReAct) │◀────│ (7 tools) │◀────│  Post-Node   │
└─────────┘     └───────────┘     └──────────────┘
    │
    ▼
Streamed response (SSE)
```

### Extended Module Structure

```
apps/api/src/app/endpoints/ai/
├── ai.module.ts                    # Extended with new providers
├── ai.controller.ts                # Extended with POST /chat and GET /conversations
├── ai.service.ts                   # Extended with agent orchestration
├── tools/                          # NEW — LangGraph tool definitions
│   ├── portfolio-summary.tool.ts   # Wraps PortfolioService.getDetails()
│   ├── portfolio-performance.tool.ts # Wraps PortfolioService.getPerformance()
│   ├── holdings-lookup.tool.ts     # Wraps PortfolioService.getHoldings()
│   ├── activity-search.tool.ts     # Wraps OrderService
│   ├── market-data.tool.ts         # Wraps DataProviderService
│   ├── risk-analysis.tool.ts       # Wraps RulesService / portfolio rules
│   └── account-overview.tool.ts    # Wraps AccountService
├── memory/                         # NEW — Conversation persistence
│   └── conversation.service.ts     # CRUD for Conversation + Message via Prisma
└── streaming/                      # NEW — SSE streaming
    └── sse.service.ts              # Server-Sent Events for token delivery
```

### New API Endpoints

| Method | Route | Purpose |
|--------|-------|---------|
| `POST` | `/api/v1/ai/chat` | Send message, get streamed SSE response |
| `GET` | `/api/v1/ai/conversations` | List user's conversations |
| `GET` | `/api/v1/ai/conversations/:id` | Get conversation with messages |
| `DELETE` | `/api/v1/ai/conversations/:id` | Delete a conversation |

### 7 Tools (LangGraph `DynamicStructuredTool`)

Each tool wraps an existing Ghostfolio service — **no duplicate business logic**.

| Tool Name | Wraps | Input Schema | Returns |
|-----------|-------|-------------|---------|
| `portfolio_summary` | `PortfolioService.getDetails()` | filters (accounts, tags, assetClasses) | Holdings table with allocations, sectors, currencies |
| `portfolio_performance` | `PortfolioService.getPerformance()` | dateRange, filters | ROI, TWR, MWR, chart data for time range |
| `holdings_lookup` | `PortfolioService.getHoldings()` | symbol (optional), filters | Detailed holding info (quantity, price, P&L) |
| `activity_search` | `OrderService.getOrders()` | symbol, type, dateRange | Filtered transaction history |
| `market_data` | `DataProviderService.getQuotes()` | symbols[] | Current quotes, daily change, market state |
| `risk_analysis` | `RulesService` + portfolio rules | filters | Rule evaluations (cluster risk, currency risk, etc.) |
| `account_overview` | `AccountService.getAccounts()` | accountId (optional) | Account balances, platforms, cash positions |

### New Prisma Models

```prisma
model Conversation {
  id        String    @id @default(uuid())
  createdAt DateTime  @default(now())
  messages  Message[]
  title     String?
  updatedAt DateTime  @updatedAt
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId    String
}

model Message {
  id             String       @id @default(uuid())
  content        String
  conversation   Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  conversationId String
  createdAt      DateTime     @default(now())
  role           String       // 'user' | 'assistant' | 'tool'
  toolCalls      Json?        // Serialized tool invocations
  tokenCount     Int?
}
```

### Frontend: Extended Assistant Component

The existing `GfAssistantComponent` (`libs/ui/src/lib/assistant/`) gains a **chat tab** alongside the current search functionality:

- New tab or mode toggle: **Search** (existing) | **Chat** (new)
- Chat tab renders conversation history with streaming message display
- Input field sends messages to `POST /api/v1/ai/chat`
- SSE consumption for real-time token rendering
- Conversation list sidebar for switching between chats

### Observability: LangSmith

- All agent runs traced via `@langchain/core` callbacks
- Tool call latency, token usage, and error rates tracked
- Admin-configurable via `PROPERTY_LANGSMITH_API_KEY` in PropertyService
- Tracing can be toggled on/off without redeployment

### Key Design Principles

1. **Extend, don't fork** — add to the existing `AiModule`; keep all current prompt-generation functionality working
2. **Wrap, don't replace** — tools call existing services; no duplicate business logic
3. **Verification post-node** — LangGraph graph includes a node after tool execution that validates outputs before responding
4. **Streaming-first** — all chat responses use SSE for real-time token delivery
5. **Permission-gated** — tool access respects existing `readAiPrompt` permission and user roles
6. **Admin-configurable** — LLM provider, model, and API keys stored in PropertyService (no env vars needed)
7. **Auditable** — LangSmith tracing for all tool invocations; Message model stores toolCalls JSON

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
