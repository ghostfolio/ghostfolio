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

AgentForge adds a **new, independent `AgentModule`** — separate from the existing `AiModule` — providing a full conversational agent:

- **LangGraph TS StateGraph** — 6-node pipeline: `query → plan → execute → verify → disclaim → respond`
- **Model-agnostic LLM provider** — defaults to Claude Sonnet 4 via `@langchain/anthropic`, swappable to any provider
- **7 tools** wrapping existing Ghostfolio services (portfolio summary, performance, holdings, activities, market data, risk analysis, account overview)
- **Real-time streaming** — Server-Sent Events (SSE) for streaming AI responses via `POST /api/v1/agents/chat`
- **Conversation memory** — LangGraph checkpointer persisted to PostgreSQL (no custom Prisma models needed)
- **LangSmith observability** — tracing, latency metrics, and tool-call auditing
- **Minimal chat UI** — dedicated `/chat` page with message history and streaming display

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Monorepo** | Nx 21.x |
| **Backend** | NestJS 11.x (TypeScript 5.9) |
| **Frontend** | Angular 21.x with Angular Material |
| **Database** | PostgreSQL 15 via Prisma 6.x ORM |
| **Cache** | Redis (Bull queues for background jobs) |
| **AI/LLM** | LangGraph TS (`@langchain/langgraph`), `@langchain/anthropic`, LangSmith |
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

## Existing AI Infrastructure (Reference Only)

Ghostfolio has an existing lightweight `AiModule` (from PR #4176). AgentForge does **not** extend it — we build a new, independent `AgentModule`. The existing module is documented here for reference only.

| Component | Location | What It Does |
|-----------|----------|-------------|
| `AiController` | `apps/api/src/app/endpoints/ai/ai.controller.ts` | `GET /api/v1/ai/prompt/:mode` — returns a formatted prompt string |
| `AiService` | `apps/api/src/app/endpoints/ai/ai.service.ts` | `getPrompt()` builds a markdown holdings table; `generateText()` calls OpenRouter via Vercel AI SDK |
| `AiModule` | `apps/api/src/app/endpoints/ai/ai.module.ts` | Imports PortfolioService, AccountService, MarketDataService, etc. |
| `Assistant UI` | `libs/ui/src/lib/assistant/assistant.component.ts` | Search/navigation modal — **not a chat UI** |

**We do not touch any of these files.** Our `AgentModule` is fully independent.

---

## AgentForge Integration Plan (v2)

### Core Principle

**New, independent `AgentModule`** — does not modify or depend on the existing `AiModule`. Clean separation, own endpoints, own state management.

### Architecture: LangGraph TS StateGraph (6 Nodes)

```
User message
    │
    ▼
┌─────────┐   ┌────────┐   ┌───────────┐   ┌──────────┐   ┌───────────┐   ┌───────────┐
│  Query   │──▶│  Plan  │──▶│  Execute  │──▶│  Verify  │──▶│ Disclaim  │──▶│  Respond  │
│  (parse) │   │(decide)│   │  (tools)  │   │ (checks) │   │(caveats)  │   │ (stream)  │
└─────────┘   └────────┘   └───────────┘   └──────────┘   └───────────┘   └───────────┘
```

| Node | Purpose |
|------|---------|
| **Query** | Parse user input, classify intent, extract entities |
| **Plan** | Decide which tools to call and in what order |
| **Execute** | Run tools via LangGraph tool-calling loop (may cycle back to Plan) |
| **Verify** | Domain-specific validation — sanity-check numbers, flag stale data, validate ranges |
| **Disclaim** | Inject financial disclaimers ("not financial advice", data freshness caveats) |
| **Respond** | Format final response and stream via SSE |

### Module Structure

```
apps/api/src/app/endpoints/agents/
├── agent.module.ts                    # NestJS module (independent from AiModule)
├── agent.controller.ts                # REST + SSE endpoints
├── agent.service.ts                   # Core orchestration — builds and invokes the graph
├── graph/
│   ├── agent.graph.ts                 # StateGraph definition with 6 nodes
│   ├── state.ts                       # AgentState type definition
│   └── nodes/
│       ├── query.node.ts              # Intent classification + entity extraction
│       ├── plan.node.ts               # Tool selection + execution planning
│       ├── execute.node.ts            # Tool invocation via LangGraph
│       ├── verify.node.ts             # Domain-specific output validation
│       ├── disclaim.node.ts           # Financial disclaimer injection
│       └── respond.node.ts            # Response formatting + SSE streaming
├── tools/
│   ├── portfolio-summary.tool.ts      # Wraps PortfolioService.getDetails()
│   ├── portfolio-performance.tool.ts  # Wraps PortfolioService.getPerformance()
│   ├── holdings-detail.tool.ts        # Wraps PortfolioService.getHoldings()
│   ├── activity-history.tool.ts       # Wraps OrderService
│   ├── market-data.tool.ts            # Wraps DataProviderService
│   ├── account-overview.tool.ts       # Wraps AccountService
│   └── risk-report.tool.ts            # Wraps RulesService + portfolio rules
├── providers/
│   └── llm-provider.ts               # Model-agnostic LLM provider interface
└── streaming/
    └── sse.service.ts                 # Server-Sent Events for token delivery
```

### API Endpoints

| Method | Route | Purpose |
|--------|-------|---------|
| `POST` | `/api/v1/agents/chat` | Send message, get streamed SSE response |
| `GET` | `/api/v1/agents/conversations` | List user's conversations |
| `GET` | `/api/v1/agents/conversations/:id` | Get conversation with messages |
| `DELETE` | `/api/v1/agents/conversations/:id` | Delete a conversation |

### 7 Tools (LangGraph `DynamicStructuredTool`)

Each tool wraps an existing Ghostfolio service — **no duplicate business logic**.

| Tool Name | Wraps | Input Schema | Returns |
|-----------|-------|-------------|---------|
| `portfolio_summary` | `PortfolioService.getDetails()` | filters (accounts, tags, assetClasses) | Holdings with allocations, sectors, currencies |
| `portfolio_performance` | `PortfolioService.getPerformance()` | dateRange, filters | ROI, TWR, MWR, chart data |
| `holdings_detail` | `PortfolioService.getHoldings()` | symbol (optional), filters | Quantity, price, P&L per holding |
| `activity_history` | `OrderService.getOrders()` | symbol, type, dateRange | Filtered transaction history |
| `market_data` | `DataProviderService.getQuotes()` | symbols[] | Current quotes, daily change, market state |
| `risk_report` | `RulesService` + portfolio rules | filters | Rule evaluations (cluster risk, currency risk, etc.) |
| `account_overview` | `AccountService.getAccounts()` | accountId (optional) | Account balances, platforms, cash positions |

### Conversation Memory

Uses **LangGraph checkpointer** persisted to PostgreSQL — no custom Prisma `Conversation`/`Message` models needed. LangGraph manages state serialization and retrieval natively via `@langchain/langgraph-checkpoint-postgres`.

Each conversation is identified by a `thread_id` (UUID). The checkpointer stores the full graph state (messages, tool results, metadata) at each step.

### LLM Provider

Model-agnostic provider interface with **Claude Sonnet 4** as default:

```typescript
// providers/llm-provider.ts
import { ChatAnthropic } from '@langchain/anthropic';

// Default: Claude Sonnet 4 via Anthropic API
// Swappable to OpenAI, OpenRouter, or any @langchain/* provider
```

API key stored via `PropertyService` (key: `API_KEY_ANTHROPIC`). Model configurable via `ANTHROPIC_MODEL` property.

### Frontend: Dedicated Chat Page

New lazy-loaded Angular route at `/chat`:

- Full-page layout with conversation list sidebar + chat area
- Streaming message display via SSE (`EventSource`)
- Input field sends to `POST /api/v1/agents/chat`
- Basic markdown rendering for agent responses
- Shows tool call indicators (e.g., "Fetching portfolio summary...")

### Observability: LangSmith

- All agent runs traced via `@langchain/core` callbacks
- Tool call latency, token usage, and error rates tracked
- Admin-configurable via `PROPERTY_LANGSMITH_API_KEY` in PropertyService
- Tracing can be toggled on/off without redeployment

### Key Design Principles

1. **Independent module** — `AgentModule` is fully separate from `AiModule`; no shared state, no shared code
2. **Wrap, don't replace** — tools call existing services; no duplicate business logic
3. **6-node pipeline** — query → plan → execute → verify → disclaim → respond
4. **Verify node** — domain-specific validation (sanity-check portfolio values, flag stale data, validate date ranges)
5. **Disclaim node** — automatic financial disclaimers on all responses
6. **Streaming-first** — all chat responses use SSE for real-time token delivery
7. **Model-agnostic** — swap LLM provider without code changes; just update PropertyService
8. **LangGraph-native memory** — checkpointer handles conversation persistence, no custom ORM models
9. **Auditable** — LangSmith tracing for all tool invocations

---

## 24-Hour MVP Requirements (Hard Gate)

All items required to pass:

| # | Requirement | Implementation |
|---|------------|----------------|
| 1 | Agent responds to natural language queries | LangGraph StateGraph with Claude Sonnet 4 |
| 2 | At least 3 functional tools | `portfolio_summary`, `holdings_detail`, `account_overview` |
| 3 | Tool calls execute successfully with structured results | Tools wrap existing services, return typed JSON |
| 4 | Agent synthesizes tool results into coherent responses | Respond node formats tool outputs into natural language |
| 5 | Conversation history maintained across turns | LangGraph checkpointer to PostgreSQL |
| 6 | Basic error handling (graceful failure, not crashes) | Try/catch in each node, fallback error messages |
| 7 | At least one domain-specific verification check | Verify node: validate portfolio totals, flag stale market data |
| 8 | 5+ test cases with expected outcomes | Jest test suite in `agent.service.spec.ts` |
| 9 | Deployed and publicly accessible | Docker build via existing `docker-compose.build.yml` |

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
